from datetime import date, datetime
from typing import Optional

from fastapi import APIRouter, Form, HTTPException
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from core.dependencies import engine_mysql

router = APIRouter()

SELECT_SQL = """
SELECT
    s.id,
    s.machinery_id,
    m.machine_id,
    m.machine_name,
    s.service_date,
    s.complaint_description,
    s.service_description
FROM yora_machinery_service_records s
INNER JOIN yora_machinery_master m ON m.id = s.machinery_id
"""


def _normalize_text(value: str) -> str:
    return value.strip()


def _parse_optional_id(value: Optional[str]) -> Optional[int]:
    if value is None:
        return None
    cleaned = value.strip()
    if not cleaned:
        return None
    try:
        return int(cleaned)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid id.") from exc


def _parse_required_date(value: str, field_label: str) -> date:
    cleaned = _normalize_text(value)
    if not cleaned:
        raise HTTPException(status_code=400, detail=f"{field_label} is required.")
    try:
        return datetime.strptime(cleaned, "%Y-%m-%d").date()
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=f"Invalid {field_label}.") from exc


def _format_date(value) -> Optional[str]:
    if value is None:
        return None
    if isinstance(value, datetime):
        value = value.date()
    return value.isoformat()


def _serialize_row(row) -> dict:
    return {
        "id": row.id,
        "machinery_id": row.machinery_id,
        "machine_id": row.machine_id,
        "machine_name": row.machine_name,
        "service_date": _format_date(row.service_date),
        "complaint_description": row.complaint_description or "",
        "service_description": row.service_description,
    }


def _fetch_rows(connection, *, search: str = "") -> list:
    filters = ["1 = 1"]
    params = {}

    query = _normalize_text(search)
    if query:
        filters.append(
            """
            (
                m.machine_id LIKE :search
                OR m.machine_name LIKE :search
                OR s.complaint_description LIKE :search
                OR s.service_description LIKE :search
            )
            """
        )
        params["search"] = f"%{query}%"

    sql = text(
        f"""
        {SELECT_SQL}
        WHERE {' AND '.join(filters)}
        ORDER BY s.service_date DESC, s.id DESC
        """
    )
    return connection.execute(sql, params).fetchall()


def _ensure_machinery_exists(connection, machinery_id: int):
    row = connection.execute(
        text(
            """
            SELECT id, machine_id, machine_name
            FROM yora_machinery_master
            WHERE id = :id
            LIMIT 1
            """
        ),
        {"id": machinery_id},
    ).first()
    if not row:
        raise HTTPException(status_code=400, detail="Machine not found.")
    return row


@router.post("/lookups")
def machinery_service_lookups():
    with engine_mysql.connect() as conn:
        rows = conn.execute(
            text(
                """
                SELECT id, machine_id, machine_name, machine_type
                FROM yora_machinery_master
                ORDER BY machine_id, machine_name
                """
            )
        ).fetchall()

    return {
        "status": "success",
        "message": "Machinery service lookups fetched successfully.",
        "data": {
            "machines": [
                {
                    "id": row.id,
                    "machine_id": row.machine_id,
                    "machine_name": row.machine_name,
                    "machine_type": row.machine_type,
                }
                for row in rows
            ],
        },
    }


@router.post("/search")
def search_machinery_service_records(search: str = Form("")):
    with engine_mysql.connect() as conn:
        rows = _fetch_rows(conn, search=search)

    return {
        "status": "success",
        "message": "Machinery service records fetched successfully.",
        "data": [_serialize_row(row) for row in rows],
    }


@router.post("/retrieve")
def retrieve_machinery_service_record(id: str = Form(...)):
    record_id = _parse_optional_id(id)
    if record_id is None:
        raise HTTPException(status_code=400, detail="Service record id is required.")

    with engine_mysql.connect() as conn:
        row = conn.execute(
            text(f"{SELECT_SQL} WHERE s.id = :id LIMIT 1"),
            {"id": record_id},
        ).fetchone()

    if not row:
        return {
            "status": "error",
            "message": "Service record not found.",
            "data": None,
        }

    return {
        "status": "success",
        "message": "Service record fetched successfully.",
        "data": _serialize_row(row),
    }


@router.post("/save")
def save_machinery_service_record(
    action: str = Form(...),
    machinery_id: str = Form(...),
    service_date: str = Form(...),
    complaint_description: str = Form(""),
    service_description: str = Form(...),
    id: Optional[str] = Form(None),
):
    action = action.strip().lower()
    if action not in {"new", "modify"}:
        raise HTTPException(status_code=400, detail="Invalid action.")

    record_machinery_id = _parse_optional_id(machinery_id)
    if record_machinery_id is None:
        raise HTTPException(status_code=400, detail="Machine is required.")

    service_date_value = _parse_required_date(service_date, "Service date")
    complaint = _normalize_text(complaint_description) or None
    description = _normalize_text(service_description)
    if not description:
        raise HTTPException(status_code=400, detail="Service description is required.")

    try:
        with engine_mysql.begin() as conn:
            _ensure_machinery_exists(conn, record_machinery_id)
            payload = {
                "machinery_id": record_machinery_id,
                "service_date": service_date_value,
                "complaint_description": complaint,
                "service_description": description,
            }

            if action == "new":
                result = conn.execute(
                    text(
                        """
                        INSERT INTO yora_machinery_service_records
                            (machinery_id, service_date, complaint_description, service_description)
                        VALUES
                            (:machinery_id, :service_date, :complaint_description, :service_description)
                        """
                    ),
                    payload,
                )
                record_id = result.lastrowid
                message = "Service record saved successfully."
            else:
                record_id = _parse_optional_id(id)
                if record_id is None:
                    raise HTTPException(status_code=400, detail="Service record id is required.")

                updated = conn.execute(
                    text(
                        """
                        UPDATE yora_machinery_service_records
                        SET machinery_id = :machinery_id,
                            service_date = :service_date,
                            complaint_description = :complaint_description,
                            service_description = :service_description
                        WHERE id = :id
                        """
                    ),
                    {**payload, "id": record_id},
                )
                if updated.rowcount == 0:
                    return {
                        "status": "error",
                        "message": "Service record not found.",
                        "data": None,
                    }
                message = "Service record updated successfully."

            row = conn.execute(
                text(f"{SELECT_SQL} WHERE s.id = :id LIMIT 1"),
                {"id": record_id},
            ).fetchone()
    except HTTPException:
        raise
    except SQLAlchemyError as exc:
        raise HTTPException(
            status_code=500,
            detail="Unable to save service record.",
        ) from exc

    return {
        "status": "success",
        "message": message,
        "data": _serialize_row(row),
    }


@router.post("/delete")
def delete_machinery_service_record(id: str = Form(...)):
    record_id = _parse_optional_id(id)
    if record_id is None:
        raise HTTPException(status_code=400, detail="Service record id is required.")

    try:
        with engine_mysql.begin() as conn:
            row = conn.execute(
                text(f"{SELECT_SQL} WHERE s.id = :id LIMIT 1"),
                {"id": record_id},
            ).fetchone()
            if not row:
                return {
                    "status": "error",
                    "message": "Service record not found.",
                }

            conn.execute(
                text("DELETE FROM yora_machinery_service_records WHERE id = :id"),
                {"id": record_id},
            )
    except SQLAlchemyError as exc:
        raise HTTPException(
            status_code=500,
            detail="Unable to delete service record.",
        ) from exc

    return {
        "status": "success",
        "message": f"Service record for {row.machine_id} deleted.",
    }
