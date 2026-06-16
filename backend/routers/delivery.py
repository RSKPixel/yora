from fastapi import APIRouter, Form
from sqlalchemy import text, select, insert, update
from core.models import delivery_challan
from core.dependencies import engine_mysql
import pandas as pd

router = APIRouter()

@router.post("/search")
def search_delivery_challan(invoice_no: int = Form(...), invoice_date: str = Form(...)):

    stmt = (select(delivery_challan)
                .where(
                    delivery_challan.c.invoice_no == invoice_no,
                    delivery_challan.c.invoice_date == invoice_date)
            )

    stmt = stmt.order_by(delivery_challan.c.delivery_date.desc())

    with engine_mysql.connect() as connection:
        result = connection.execute(stmt).fetchall()

    delivery_challan_list = []
    if not result:
        return {"status": "error", "message": "Delivery challan not found", "data": []}

    df = pd.DataFrame(result)
    delivery_challan_list = df.to_dict(orient="records")[0]
    return {"status": "success", "message": "Delivery challan found successfully", "data": delivery_challan_list}


@router.post("/create")
def create_delivery_challan(
    delivery_no: str = Form(...),
    delivery_date: str = Form(...),
    invoice_no: int = Form(...),
    invoice_date: str = Form(...),
    buyer: str = Form(...),
    vehicle_no: str = Form(...),
    driver_name: str = Form(...),
    delivery_location: str = Form(...),
    delivered_by: str = Form(...),
):

    print(delivery_no, delivery_date, invoice_no, invoice_date, buyer, vehicle_no, driver_name, delivery_location, delivered_by)

    with engine_mysql.begin() as conn:
        conn.execute(
            insert(delivery_challan),
            {
                "delivery_date": delivery_date,
                "invoice_no": invoice_no,
                "invoice_date": invoice_date,
                "buyer": buyer,
                "vehicle_no": vehicle_no,
                "driver_name": driver_name,
                "delivery_location": delivery_location,
                "delivered_by": delivered_by,
            },
        )

    return {"status": "success", "message": "Delivery challan created successfully"}

@router.post("/delete")
def delete_delivery_challan(delivery_no: str = Form(...)):
    if delivery_no == "new":
        return {"status": "error", "message": "Delivery challan not found"}

    sql = text(
        """
        DELETE FROM yora_delivery_challan
        WHERE delivery_no = :delivery_no
        """
    )

    with engine_mysql.begin() as conn:
        result = conn.execute(sql, {"delivery_no": delivery_no})

        if not result:
            return {"status": "error", "message": "Delivery challan not found"}

    return {"status": "success", "message": "Delivery challan deleted successfully"}