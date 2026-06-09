from fastapi import APIRouter, Form
from core.dependencies import engine_mysql
from sqlalchemy import text
import pandas as pd
import json

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
        raise HTTPException(
            status_code=400,
            detail="Invalid details JSON",
        )

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
            "list_price": d["rate"],
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
        raise HTTPException(
            status_code=500,
            detail=str(e),
        )


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
            "RATE": "rate",
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


@router.post("/purchase")
def purchase(
    purchase_id: str = Form(None),
    purchase_date: str = Form(None),
    date_from: str = Form(None),
    date_to: str = Form(None),
):

    base_sql = """
        SELECT *
        FROM yora_purchase
        INNER JOIN yora_purchase_details
            ON yora_purchase.purchase_id = yora_purchase_details.purchase_id
            AND yora_purchase.purchase_date = yora_purchase_details.purchase_date
    """

    params = {}

    # Fetch specific purchase
    if purchase_id and purchase_date:

        sql = text(
            base_sql
            + """
            WHERE yora_purchase.purchase_id = :purchase_id
            AND yora_purchase.purchase_date = :purchase_date
            """
        )

        params = {
            "purchase_id": purchase_id,
            "purchase_date": purchase_date,
        }

    # Fetch date range
    elif date_from and date_to:

        sql = text(
            base_sql
            + """
            WHERE yora_purchase.purchase_date
            BETWEEN :date_from AND :date_to
            """
        )

        params = {
            "date_from": date_from,
            "date_to": date_to,
        }

    # Fetch everything
    else:

        sql = text(base_sql)

    with engine_mysql.connect() as connection:

        result = connection.execute(sql, params)

        purchase = [
            dict(row._mapping)
            for row in result
        ]

    return {
        "status": "success",
        "message": "Purchase fetched successfully!",
        "data": purchase,
    }