from fastapi import APIRouter, Form
from core.dependencies import engine
from sqlalchemy import text
from typing import Optional

router = APIRouter()

@router.post("/retrive")
def retrive_inventory(id: str = Form(...)):

    sql = text("""
        SELECT *
        FROM inventory_master
        WHERE id = :id
    """)


    with engine.connect() as conn:
        result = conn.execute(sql, {"id": id}).fetchone()
        if not result:
            return {
                "status": "error",
                "message": "Inventory not found.",
                "data": {},
            }
        inventory_data = {
            "id": result.id,
            "inventory_name": result.inventory_name,
            "inventory_category": result.inventory_category,
            "neck_size": result.neck_size,
            "weight": result.weight,
            "quantity_per_pack": result.quantity_per_pack,
            "remarks": result.remarks if result.remarks else "",
        }

    return {
        "status": "success",
        "message": "Inventory details fetched successfully!",
        "data": inventory_data,
    }


@router.post("/search")
def search_inventory(inventory_name: str = Form(...)):

    inventory_name = inventory_name.strip().upper()

    if inventory_name:
        sql = text("""
            SELECT *
            FROM inventory_master
            WHERE inventory_name ILIKE '%' || :inventory_name || '%'
            ORDER BY inventory_name
        """)
    else:
        sql = text("""
        SELECT * FROM inventory_master
        ORDER BY inventory_name
        """)

    with engine.connect() as conn:
        result = conn.execute(sql, {"inventory_name": inventory_name}).fetchall()
        inventory_list = []
        for row in result:
            inventory_list.append(
                {
                    "id": row.id,
                    "inventory_name": row.inventory_name,
                    "inventory_category": row.inventory_category,
                    "neck_size": row.neck_size,
                    "weight": row.weight,
                    "quantity_per_pack": row.quantity_per_pack,
                    "remarks": row.remarks,
                }
            )
    return {
        "status": "success",
        "message": "Inventory list fetched successfully!",
        "data": inventory_list,
    }


@router.post("/save")
def save_inventory(
    action: str = Form(...),
    inventory_name: str = Form(...),
    inventory_category: str = Form(...),
    neck_size: float = Form(...),
    weight: float = Form(...),
    quantity_per_pack: int = Form(...),
    remarks: Optional[str] = Form(None),
):

    inventory_name = inventory_name.strip().upper()
    inventory_category = inventory_category.strip().upper()
    remarks = remarks.strip().upper() if remarks else None

    if action == "new":
        sql = text("""
        SELECT *
        FROM inventory_master
        WHERE to_tsvector('english', inventory_name)
        @@ plainto_tsquery('english', :inventory_name)
        """)

        with engine.connect() as conn:
            result = conn.execute(sql, {"inventory_name": inventory_name}).fetchone()
            if result:
                return {
                    "status": "error",
                    "message": "Inventory with this name already exists.",
                    "data": {},
                }

            insert_sql = text("""
                INSERT INTO inventory_master (inventory_name, inventory_category, neck_size, weight, quantity_per_pack, remarks)
                VALUES (:inventory_name, :inventory_category, :neck_size, :weight, :quantity_per_pack, :remarks)
            """)
            conn.execute(
                insert_sql,
                {
                    "inventory_name": inventory_name,
                    "inventory_category": inventory_category,
                    "neck_size": neck_size,
                    "weight": weight,
                    "quantity_per_pack": quantity_per_pack,
                    "remarks": remarks,
                },
            )
            conn.commit()
    elif action == "modify":
        sql = text("""
        UPDATE inventory_master
        SET inventory_category = :inventory_category,
            neck_size = :neck_size,
            weight = :weight,
            quantity_per_pack = :quantity_per_pack,
            remarks = :remarks
        WHERE inventory_name = :inventory_name
        """)

        with engine.connect() as conn:
            conn.execute(
                sql,
                {
                    "id": id,
                    "inventory_name": inventory_name,
                    "inventory_category": inventory_category,
                    "neck_size": neck_size,
                    "weight": weight,
                    "quantity_per_pack": quantity_per_pack,
                    "remarks": remarks,
                },
            )
            conn.commit()
    return {
        "status": "success",
        "message": "Inventory saved/updated successfully!",
        "data": {},
    }
