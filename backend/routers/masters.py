from fastapi import APIRouter, Form
from core.dependencies import engine_mysql
from sqlalchemy import text

router = APIRouter()


@router.post("/stock-items")
def stock_items():
    sql = text(
        """
        SELECT
            stock_item,
            parent,
            unit,
            hsn_code,
            gst
        FROM yora_stockitems
        ORDER BY stock_item
        """
    )

    with engine_mysql.connect() as conn:
        result = conn.execute(sql).fetchall()

    items = [
        {
            "stock_item": row.stock_item,
            "parent": row.parent,
            "unit": row.unit,
            "hsn_code": row.hsn_code,
            "gst": float(row.gst) if row.gst is not None else 0,
        }
        for row in result
    ]

    return {
        "status": "success",
        "message": "Stock items fetched successfully!",
        "data": items,
    }


@router.post("/ledger")
def ledger(primary_group: str = Form(...)):
    sql = text(
        """
        SELECT
            name,
            address_1,
            address_2,
            address_3,
            address_4,
            pincode,
            gstin,
            pan,
            primary_group,
            representative
        FROM yora_ledger
        WHERE primary_group = :primary_group
        ORDER BY name
        """
    )

    with engine_mysql.connect() as conn:
        result = conn.execute(sql, {"primary_group": primary_group}).fetchall()

    ledgers = [
        {
            "name": row.name,
            "address_1": row.address_1,
            "address_2": row.address_2,
            "address_3": row.address_3,
            "address_4": row.address_4,
            "pincode": row.pincode,
            "gstin": row.gstin,
            "pan": row.pan,
            "primary_group": row.primary_group,
            "representative": row.representative,
        }
        for row in result
    ]

    return {
        "status": "success",
        "message": "Ledgers fetched successfully!",
        "data": ledgers,
    }


@router.post("/company")
def company():
    sql = text(
        """
        SELECT
            company_name,
            address,
            area,
            city,
            state,
            pincode,
            email,
            phone
        FROM company
        LIMIT 1
        """
    )

    with engine_mysql.connect() as conn:
        row = conn.execute(sql).fetchone()

    if not row:
        return {
            "status": "success",
            "message": "Company not found!",
            "data": None,
        }

    return {
        "status": "success",
        "message": "Company fetched successfully!",
        "data": {
            "company_name": row.company_name,
            "address": row.address,
            "area": row.area,
            "city": row.city,
            "state": row.state,
            "pincode": row.pincode,
            "email": row.email,
            "phone": row.phone,
        },
    }
