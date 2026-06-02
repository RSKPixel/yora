from fastapi import APIRouter, Form
from core.dependencies import engine_mysql
from sqlalchemy import text

router = APIRouter()

@router.post("/pending-costing-bills")
def pending_costing_bills():
    sql = text("""
        SELECT p.VNO, date(p.vdt) as VDT, p.LEDGER_NAME as VENDOR
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

    pending_bills = []
    for row in result:
        pending_bills.append({
            "vno": row.VNO,
            "vdt": row.VDT,
            "vendor": row.VENDOR,
        })

    return {
        "status": "success",
        "message": "Pending costing bills fetched successfully!",
        "data": pending_bills,
    }