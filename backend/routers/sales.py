from datetime import datetime
from fastapi import APIRouter, Form
from core.dependencies import engine_mysql
from sqlalchemy import text, bindparam
import pandas as pd
import hashlib
import json

router = APIRouter()


@router.post("/sales-list")
def sales_list(
    filter: str = Form(...),
    date_from: str = Form(...),
    date_to: str = Form(...),
):

    if filter == "all":
        sql = text(
            """
        SELECT *
        FROM yora_sales
        WHERE invoice_date BETWEEN :date_from AND :date_to
        """
        )
    elif filter == "delivered":
        sql = text(
            """
            SELECT * FROM yora_sales
            WHERE invoice_date BETWEEN :date_from AND :date_to
                AND EXISTS (
                    SELECT 1 FROM yora_delivery_challan
                        WHERE
                            yora_delivery_challan.invoice_no = yora_sales.invoice_no AND
                            yora_delivery_challan.invoice_date = yora_sales.invoice_date
                            AND yora_delivery_challan.delivery_date BETWEEN :date_from AND :date_to)
        """
        )
    elif filter == "pending_delivery":
        sql = text(
            """
            SELECT * FROM yora_sales
            WHERE invoice_date BETWEEN :date_from AND :date_to
                AND NOT EXISTS (
                    SELECT 1 FROM yora_delivery_challan
                        WHERE yora_delivery_challan.invoice_no = yora_sales.invoice_no AND
                            yora_delivery_challan.invoice_date = yora_sales.invoice_date)
            """
        )

    with engine_mysql.connect() as connection:
        result = connection.execute(
            sql,
            {
                "date_from": date_from,
                "date_to": date_to,
            },
        ).fetchall()

    df = pd.DataFrame(result)

    if df.empty:
        return {
            "status": "success",
            "message": "No sales data found!",
            "data": [],
        }

    # Convert numeric columns once (vectorized)
    df["invoice_no"] = df["invoice_no"].astype(int)
    df["buyer"] = df["buyer"].fillna("NA")
    df["representative"] = df["representative"].fillna("NA")
    df["qty"] = pd.to_numeric(df["qty"], errors="coerce")
    df["value"] = pd.to_numeric(df["value"], errors="coerce")
    df["rate"] = pd.to_numeric(df["rate"], errors="coerce")
    df.sort_values(by=["invoice_no", "invoice_date"], inplace=True)

    sales = []

    # Group by invoice
    grouped = df.groupby(["invoice_no", "invoice_date", "buyer", "representative"])

    for (invoice_no, invoice_date, buyer, representative), group in grouped:
        details = group.drop(
            columns=["invoice_no", "invoice_date", "buyer", "representative"]
        )

        sales.append(
            {
                "invoice_no": int(invoice_no),
                "invoice_date": invoice_date,
                "buyer": buyer,
                "representative": representative,
                "no_of_items": int(group["stock_item"].count()),
                "qty": int(group["qty"].sum()),
                "value": float(group["value"].sum()),
                "details": details.to_dict(orient="records"),
            }
        )

    return {
        "status": "success",
        "message": "Sales list fetched successfully!",
        "data": sales,
    }


@router.post("/tally-sales-list")
def tally_sales_list():

    sql = text(
        """
            SELECT *
            FROM invoices i
            ORDER BY i.vno DESC, i.vdt DESC
        """
    )

    with engine_mysql.connect() as connection:
        result = connection.execute(sql).fetchall()

    df = pd.DataFrame(result)
    df.rename(
        columns={
            "VNO": "invoice_no",
            "VDT": "invoice_date",
            "LEDGER_NAME": "buyer",
            "BROKER": "representative",
            "ITEM_NO": "item_no",
            "ITEM_COUNT": "item_count",
            "STOCK_ITEM": "stock_item",
            "RATE": "rate",
            "QTY": "qty",
            "VALUE": "value",
        },
        inplace=True,
    )
    df.drop(
        columns=["id", "PACKING", "BRAND", "PACKING", "DISCOUNT", "CARTAGE"],
        inplace=True,
    )
    df["representative"] = df["representative"].fillna("NA")
    df["invoice_date"] = df["invoice_date"].dt.strftime("%Y-%m-%d")
    df["value"] = pd.to_numeric(df["value"], errors="coerce")
    df["rate"] = pd.to_numeric(df["rate"], errors="coerce")
    df["qty"] = pd.to_numeric(df["qty"], errors="coerce")
    df["item_count"] = df["item_count"].astype(int)
    df["item_no"] = df["item_no"].astype(int)
    df["checksum"] = df.apply(
        lambda x: hashlib.sha256(
            json.dumps(
                x[
                    [
                        "invoice_no",
                        "invoice_date",
                        "buyer",
                        "representative",
                        "stock_item",
                        "rate",
                        "qty",
                        "value",
                    ]
                ].to_dict()
            ).encode()
        ).hexdigest(),
        axis=1,
    )
    import_tally_sales(df)
    return {
        "status": "success",
        "message": "Tally Sales data fetched and imported successfully!",
        "data": df.to_dict(orient="records"),
    }


def import_tally_sales(sales: pd.DataFrame):
    invoice_nos = sales["invoice_no"].unique()
    for invoice_no in invoice_nos:
        details = sales[sales["invoice_no"] == invoice_no]
        invoice_no = details["invoice_no"].values[0]
        invoice_date = details["invoice_date"].values[0]
        buyer = details["buyer"].values[0]
        representative = details["representative"].values[0]

        sql = text(
            """
            DELETE FROM yora_sales
            WHERE invoice_no = :invoice_no AND invoice_date = :invoice_date
            """
        )

        with engine_mysql.begin() as connection:
            connection.execute(
                sql,
                {
                    "invoice_no": invoice_no,
                    "invoice_date": invoice_date,
                },
            )

        for detail in details.to_dict(orient="records"):
            stock_item = detail["stock_item"]
            qty = detail["qty"]
            rate = detail["rate"]
            value = detail["value"]

            sql = text(
                """
                INSERT INTO
                    yora_sales
                    (invoice_no, invoice_date, buyer, representative, stock_item, rate, qty, value)
                VALUES
                    (:invoice_no, :invoice_date, :buyer, :representative, :stock_item, :rate, :qty, :value)
                """
            )

            with engine_mysql.begin() as connection:
                connection.execute(
                    sql,
                    {
                        "invoice_no": invoice_no,
                        "invoice_date": invoice_date,
                        "buyer": buyer,
                        "representative": representative,
                        "stock_item": detail["stock_item"],
                        "rate": detail["rate"],
                        "qty": detail["qty"],
                        "value": detail["value"],
                    },
                )

    return {
        "status": "success",
        "message": "Tally Sales data imported successfully!",
    }
