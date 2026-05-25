from fastapi import APIRouter, Form
from core.dependencies import engine
from sqlalchemy import text
from typing import Optional

router = APIRouter()

@router.post("/groups")
def ledger_groups():
    sql = text("""
        SELECT *
        FROM ledger_group
        ORDER BY group_name
    """)

    with engine.connect() as conn:
        result = conn.execute(sql).fetchall()
        ledger_groups = []
        for row in result:
            ledger_groups.append({
                "id": row.id,
                "group_name": row.group_name,
            })

    return {
        "status": "success",
        "message": "Ledger groups fetched successfully!",
        "data": ledger_groups,
    }

@router.post("/save")
def save_ledger(
    action: str = Form(...),
    ledger_name: str = Form(...),
    group_name: str = Form(...),
):

    ledger_name = ledger_name.strip().upper()

    if action == "new":
        sql = text("""
            INSERT INTO ledger (ledger_name, group_name)
            VALUES (:ledger_name, :group_name)
        """)
    elif action == "modify":
        sql = text("""
            UPDATE ledger
            SET group_name = :group_name
            WHERE ledger_name = :ledger_name
        """)


    try:
        with engine.connect() as conn:
            conn.execute(sql, {
                "ledger_name": ledger_name,
                "group_name": group_name,
            })
            conn.commit()
    except Exception as e:
        return {
            "status": "error",
            "message": str(e),
        }
    return {
        "status": "success",
        "message": f"Ledger {'created' if action == 'new' else 'updated'} successfully!",
    }

@router.post("/check-ledger-name")
def search_ledgers(ledger_name: str = Form(...)):
    sql = text("""
        SELECT *
        FROM ledger
        WHERE ledger_name = :ledger_name
    """)

    with engine.connect() as conn:
        result = conn.execute(sql, {"ledger_name": ledger_name}).fetchall()

    if result:
        return {
            "status": "error",
            "message": "Ledger name already exists!",
            "data": {}
        }
    else:
        return {
            "status": "success",
            "message": "Ledger name is available!",
            "data": {}
        }