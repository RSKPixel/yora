from fastapi import APIRouter, Form
from core.dependencies import engine_mysql
from sqlalchemy import text, bindparam
import pandas as pd
import json
from fastapi import HTTPException

router = APIRouter()


@router.post("/update")
def update_purchase(
    purchase_id: str = Form(...),
    purchase_date: str = Form(...),
    vendor: str = Form(...),
    expenses: float = Form(...),
    details: str = Form(...),
):

    try:
        details = json.loads(details)

        if not isinstance(details, list):
            raise HTTPException(
                status_code=400,
                detail="Details must be a list",
            )

    except json.JSONDecodeError:
        return {
            "status": "error",
            "message": "Invalid details",
        }

    purchase_sql = text(
        """
        INSERT INTO yora_purchase
        (
            purchase_id,
            purchase_date,
            vendor,
            expenses
        )
        VALUES
        (
            :purchase_id,
            :purchase_date,
            :vendor,
            :expenses
        )
        ON DUPLICATE KEY UPDATE
            vendor = VALUES(vendor),
            expenses = VALUES(expenses)
        """
    )

    delete_details_sql = text(
        """
        DELETE FROM yora_purchase_details
        WHERE purchase_id = :purchase_id
          AND purchase_date = :purchase_date
        """
    )

    insert_detail_sql = text(
        """
        INSERT INTO yora_purchase_details
        (
            purchase_id,
            purchase_date,
            stock_item,
            qty,
            carton,
            qty_per_carton,
            item_count,
            item_no,
            list_price,
            cost_price,
            expenses,
            landing_cost,
            cost_with_gst,
            gst
        )
        VALUES
        (
            :purchase_id,
            :purchase_date,
            :stock_item,
            :qty,
            :carton,
            :qty_per_carton,
            :item_count,
            :item_no,
            :list_price,
            :cost_price,
            :expenses,
            :landing_cost,
            :cost_with_gst,
            :gst
        )
        """
    )

    detail_params = [
        {
            "purchase_id": purchase_id,
            "purchase_date": purchase_date,
            "stock_item": d["stock_item"],
            "qty": d["qty"],
            "carton": d["carton"],
            "qty_per_carton": d["qty_per_carton"],
            "item_count": d["item_count"],
            "item_no": d["item_no"],
            "list_price": d["list_price"],
            "cost_price": d["cost_price"],
            "expenses": d["expenses"],
            "landing_cost": d["landing_cost"],
            "cost_with_gst": d["cost_with_gst"],
            "gst": d["gst"],
        }
        for d in details
    ]

    try:
        with engine_mysql.begin() as connection:

            # Purchase Header
            connection.execute(
                purchase_sql,
                {
                    "purchase_id": purchase_id,
                    "purchase_date": purchase_date,
                    "vendor": vendor,
                    "expenses": expenses,
                },
            )

            # Remove Existing Details
            connection.execute(
                delete_details_sql,
                {
                    "purchase_id": purchase_id,
                    "purchase_date": purchase_date,
                },
            )

            # Insert Current Details
            if detail_params:
                connection.execute(
                    insert_detail_sql,
                    detail_params,
                )

        return {
            "status": "success",
            "message": "Purchase updated successfully!",
        }

    except Exception as e:
        print(e.args)
        return {
            "status": "error",
            "message": str(e.args),
        }


@router.post("/tally-details")
def tally_details(purchase_id: str = Form(...), purchase_date: str = Form(...)):
    sql = text(
        """
            SELECT
                p.*,
                i.gst,
                i.hsn_code
            FROM purchases p
            INNER JOIN items i
                ON p.stock_item = i.stock_item
            WHERE p.vno = :purchase_id
            AND DATE(p.vdt) = :purchase_date
            ORDER BY p.itemno
        """
    )

    with engine_mysql.connect() as connection:
        result = connection.execute(
            sql, {"purchase_id": purchase_id, "purchase_date": purchase_date}
        ).fetchall()

    purchase_details = pd.DataFrame(result)
    purchase_details.rename(
        columns={
            "CARTON_BOX": "carton_box",
            "CARTON_BOX_QTY": "qty_per_carton",
            "ITEMCOUNT": "item_count",
            "ITEMNO": "item_no",
            "LEDGER_NAME": "vendor",
            "QTY": "qty",
            "VALUE": "value",
            "GST": "gst",
            "STOCK_ITEM": "stock_item",
            "RATE": "list_price",
            "COST_PRICE": "cost_price",
            "LANDING_COST": "landing_cost",
            "COST_WITH_GST": "cost_with_gst",
            "VNO": "purchase_id",
            "VDT": "purchase_date",
        },
        inplace=True,
    )
    purchase_details.drop(
        columns=["ALT_QTY", "PACKING", "BRAND", "REPNAME"], inplace=True
    )

    purchase_details["carton"] = purchase_details.apply(
        lambda x: x["carton_box"] if x["carton_box"] > 0 else x["qty"] / 72, axis=1
    )

    purchase_details["cost_price"] = purchase_details["value"] / purchase_details["qty"]
    purchase_details["expenses"] = 0
    purchase_details["landing_cost"] = (
        purchase_details["cost_price"] + purchase_details["expenses"]
    )
    purchase_details["gst"] = purchase_details["gst"]
    purchase_details["cost_with_gst"] = purchase_details["landing_cost"] * (
        1 + purchase_details["gst"] / 100
    )
    print(purchase_details.columns)

    purchase_details = purchase_details.to_dict(orient="records")

    return {
        "status": "success",
        "message": "Purchase details fetched successfully!",
        "data": purchase_details,
    }


@router.post("/pending-purchase-bills")
@router.get("/pending-purchase-bills")
def pending_purchase_bills():
    sql = text(
        """
        SELECT p.vno as purchase_id,
            date(p.vdt) as purchase_date, p.ledger_name as vendor, sum(p.qty) as qty
            FROM purchases p
        WHERE NOT EXISTS (
            SELECT 1
                FROM yora_purchase pc
            WHERE pc.purchase_id = p.vno
                AND pc.purchase_date = p.vdt
        )
        GROUP BY p.vno, p.vdt, ledger_name;
    """
    )

    with engine_mysql.connect() as connection:
        result = connection.execute(sql).fetchall()

    pending_bills = pd.DataFrame(result)
    pending_bills = pending_bills.to_dict(orient="records")

    return {
        "status": "success",
        "message": "Pending costing bills fetched successfully!",
        "data": pending_bills,
    }


@router.post("/fetch")
def fetch_purchase(purchase_id: str = Form(...), purchase_date: str = Form(...)):
    sql = text(
        """
        SELECT p.*, sum(pd.qty) as qty, sum(pd.carton) as carton FROM yora_purchase p
        INNER JOIN yora_purchase_details pd
            ON p.purchase_id = pd.purchase_id
            AND p.purchase_date = pd.purchase_date
        WHERE p.purchase_id = :purchase_id
        AND p.purchase_date = :purchase_date
        GROUP BY p.purchase_id, p.purchase_date
    """
    )

    detail_sql = text(
        """
        SELECT * FROM yora_purchase_details
        WHERE purchase_id = :purchase_id
        AND purchase_date = :purchase_date
    """
    )

    with engine_mysql.connect() as connection:
        purchase_row = (
            connection.execute(
                sql, {"purchase_id": purchase_id, "purchase_date": purchase_date}
            )
            .mappings()
            .fetchone()
        )

        detail_rows = (
            connection.execute(
                detail_sql, {"purchase_id": purchase_id, "purchase_date": purchase_date}
            )
            .mappings()
            .fetchall()
        )

    # Handle no data case
    if not purchase_row:
        return {
            "status": "error",
            "message": "Purchase not found",
            "data": None,
        }

    purchase = dict(purchase_row)
    details = [dict(row) for row in detail_rows]

    purchase["details"] = details

    return {
        "status": "success",
        "message": "Purchase fetched successfully!",
        "data": purchase,
    }


@router.post("/list")
def purchase(
    date_from: str = Form(...),
    date_to: str = Form(...),
    include_details: bool = Form(True),
):

    purchase_sql = text(
        """
        SELECT p.*, sum(pd.qty) as qty, sum(pd.carton) as carton
        FROM yora_purchase p
        INNER JOIN yora_purchase_details pd
            ON p.purchase_id = pd.purchase_id
            AND p.purchase_date = pd.purchase_date
        WHERE p.purchase_date BETWEEN :date_from AND :date_to
        GROUP BY p.purchase_id, p.purchase_date
        ORDER BY p.purchase_date DESC, p.purchase_id DESC
    """
    )

    with engine_mysql.connect() as connection:
        result = (
            connection.execute(
                purchase_sql,
                {
                    "date_from": date_from,
                    "date_to": date_to,
                },
            )
            .mappings()
            .all()
        )

    purchases = [dict(row) for row in result]

    if not purchases:
        return {
            "status": "success",
            "message": "No purchases found",
            "data": [],
        }

    if include_details:

        purchase_ids = list({row["purchase_id"] for row in purchases})

        detail_sql = text(
            """
            SELECT *
            FROM yora_purchase_details
            WHERE purchase_id IN :purchase_ids
        """
        ).bindparams(
            bindparam(
                "purchase_ids",
                expanding=True,
            )
        )

        with engine_mysql.connect() as connection:
            detail_rows = (
                connection.execute(
                    detail_sql,
                    {
                        "purchase_ids": purchase_ids,
                    },
                )
                .mappings()
                .all()
            )

        detail_map = {}

        for row in detail_rows:
            row = dict(row)

            key = (
                row["purchase_id"],
                str(row["purchase_date"]),
            )

            detail_map.setdefault(
                key,
                [],
            ).append(row)

        for purchase in purchases:

            key = (
                purchase["purchase_id"],
                str(purchase["purchase_date"]),
            )

            purchase["details"] = detail_map.get(
                key,
                [],
            )

    return {
        "status": "success",
        "message": "Purchase fetched successfully!",
        "data": purchases,
    }
