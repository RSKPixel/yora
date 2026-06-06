from fastapi import APIRouter, Form
from core.dependencies import engine_mysql
from sqlalchemy import text
import pandas as pd


router = APIRouter()

@router.post("/details")
def purchase_details(vno: str = Form(...), vdt: str = Form(...)):

    sql = text("""
            SELECT
                p.*,
                i.gst,
                i.hsn_code
            FROM purchases p
            INNER JOIN items i
                ON p.stock_item = i.stock_item
            WHERE p.vno = :vno
            AND DATE(p.vdt) = :vdt
            ORDER BY p.itemno
        """)

    with engine_mysql.connect() as connection:
        result = connection.execute(sql, {"vno": vno, "vdt": vdt}).fetchall()

    purchase_details = pd.DataFrame(result)
    purchase_details["CARTON"] = purchase_details.apply(lambda x: x["CARTON_BOX"] if x["CARTON_BOX"] > 0 else x["QTY"] / 72, axis=1)
    purchase_details["COST_PRICE"] = purchase_details["VALUE"] / purchase_details["QTY"]
    purchase_details["EXPENSES"] = 0
    purchase_details["LANDING_COST"] = purchase_details["COST_PRICE"]+ purchase_details["EXPENSES"]
    purchase_details["GST"] = purchase_details["gst"]
    purchase_details["COST_WITH_GST"] = (
        purchase_details["LANDING_COST"] * (1 + purchase_details["GST"] / 100)
    )
    purchase_details = purchase_details.to_dict(orient="records")

    return {
        "status": "success",
        "message": "Purchase details fetched successfully!",
        "data": purchase_details,
    }

@router.post("/pending-costing-bills")
@router.get("/pending-costing-bills")
def pending_costing_bills():
    sql = text("""
        SELECT p.VNO, date(p.vdt) as VDT, p.LEDGER_NAME as VENDOR, sum(p.qty) as QTY
            FROM purchases p
        WHERE NOT EXISTS (
            SELECT 1
                FROM purchase_costing pc
            WHERE pc.vno = p.vno
                AND pc.vdt = p.vdt
        )
        GROUP BY vno, vdt, ledger_name;
    """)

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
