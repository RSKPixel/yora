from datetime import datetime
from fastapi import APIRouter, Form
from core.dependencies import engine_mysql
from sqlalchemy import text, bindparam
import pandas as pd

router = APIRouter()


@router.post("/tally-sales-list")
def tally_sales_list():

    sql = text(
        """
            SELECT *
            FROM invoices i
            WHERE NOT EXISTS (
                SELECT 1
                FROM yora_sales y
                WHERE y.invoice_no = i.vno
                AND y.invoice_date = i.vdt
            )
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
            "LEDGER_NAME": "customer",
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
    # df["invoice_no"] = pd.to_numeric(df["invoice_no"], errors="coerce")
    df["invoice_date"] = df["invoice_date"].dt.strftime("%Y-%m-%d")
    df["value"] = pd.to_numeric(df["value"], errors="coerce")
    df["rate"] = pd.to_numeric(df["rate"], errors="coerce")
    df["qty"] = pd.to_numeric(df["qty"], errors="coerce")
    df["item_count"] = df["item_count"].astype(int)
    df["item_no"] = df["item_no"].astype(int)
    df["invoice_no_numeric"] = (
        pd.to_numeric(df["invoice_no"], errors="coerce").fillna(0).astype(int)
    )
    print(type(df["invoice_no_numeric"][0]))
    df = df.sort_values(
        by=["invoice_no_numeric", "invoice_date"], ascending=[True, False]
    )
    sales = []
    for (
        invoice_no,
        invoice_date,
        customer,
        representative,
    ), group in df.groupby(
        ["invoice_no", "invoice_date", "customer", "representative"],
        sort=False,
    ):
        sales.append(
            {
                "invoice_no": invoice_no,
                "invoice_date": str(invoice_date),
                "customer": customer,
                "representative": representative,
                "qty": int(group["qty"].sum()),
                "value": round(group["value"].sum(), 2),
                "details": group.drop(
                    columns=[
                        "invoice_no",
                        "invoice_date",
                        "customer",
                        "representative",
                    ]
                ).to_dict(
                    orient="records",
                ),
            }
        )
    return {
        "status": "success",
        "message": "Sales list fetched successfully!",
        "data": sales,
    }
