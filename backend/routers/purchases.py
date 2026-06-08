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

    details = json.loads(details)

    purchase_sql = text(
        """
        INSERT INTO yora_purchases
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

    purchase_detail_sql = text(
        """
        INSERT INTO yora_purchases_details
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
        ON DUPLICATE KEY UPDATE
            qty = VALUES(qty),
            carton = VALUES(carton),
            qty_per_carton = VALUES(qty_per_carton),
            item_count = VALUES(item_count),
            item_no = VALUES(item_no),
            list_price = VALUES(list_price),
            cost_price = VALUES(cost_price),
            expenses = VALUES(expenses),
            landing_cost = VALUES(landing_cost),
            cost_with_gst = VALUES(cost_with_gst),
            gst = VALUES(gst)
    """
    )

    detail_params = []

    for detail in details:
        detail_params.append(
            {
                "purchase_id": purchase_id,
                "purchase_date": purchase_date,
                "stock_item": detail["stock_item"],
                "qty": detail["qty"],
                "carton": detail["carton"],
                "qty_per_carton": detail["qty_per_carton"],
                "item_count": detail["item_count"],
                "item_no": detail["item_no"],
                "list_price": detail["rate"],
                "cost_price": detail["cost_price"],
                "expenses": detail["expenses"],
                "landing_cost": detail["landing_cost"],
                "cost_with_gst": detail["cost_with_gst"],
                "gst": detail["gst"],
            }
        )

    with engine_mysql.begin() as connection:

        connection.execute(
            purchase_sql,
            {
                "purchase_id": purchase_id,
                "purchase_date": purchase_date,
                "vendor": vendor,
                "expenses": expenses,
            },
        )

        connection.execute(
            purchase_detail_sql,
            detail_params,
        )

        connection.commit()

    return {
        "status": "success",
        "message": "Purchase updated successfully!",
    }


@router.post("/details")
def purchase_details(purchase_id: str = Form(...), purchase_date: str = Form(...)):
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
                FROM yora_purchases pc
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
def purchase(vno: str = Form(...), vdt: str = Form(...)):

    pass
