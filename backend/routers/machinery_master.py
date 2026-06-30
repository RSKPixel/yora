from datetime import date, datetime
from typing import Optional

from fastapi import APIRouter, Form, HTTPException
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

from core.dependencies import engine_mysql

router = APIRouter()

MACHINE_TYPES = (
    "Blow Moulding Machine",
    "Injection Moulding Machine",
    "Compressor",
    "Air Dryer",
    "Chiller",
    "Auxiliary Equipment",
    "Other",
)

SELECT_SQL = """
SELECT
    m.id,
    m.machine_id,
    m.machine_name,
    m.machine_type,
    m.machine_description,
    m.purchase_date,
    m.supplier_name,
    m.amc_warranty_validity
FROM yora_machinery_master m
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


def _parse_optional_date(value: Optional[str], field_label: str) -> Optional[date]:
    if value is None:
        return None
    cleaned = _normalize_text(value)
    if not cleaned:
        return None
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
        "machine_id": row.machine_id,
        "machine_name": row.machine_name,
        "machine_type": row.machine_type,
        "machine_description": row.machine_description,
        "purchase_date": _format_date(row.purchase_date),
        "supplier_name": row.supplier_name,
        "amc_warranty_validity": _format_date(row.amc_warranty_validity),
    }


def _fetch_rows(connection, *, search: str = "") -> list:
    filters = ["1 = 1"]
    params = {}

    query = _normalize_text(search)
    if query:
        filters.append(
            """
            (
                m.machine_name LIKE :search
                OR m.machine_id LIKE :search
                OR m.supplier_name LIKE :search
                OR m.machine_type LIKE :search
            )
            """
        )
        params["search"] = f"%{query}%"

    sql = text(
        f"""
        {SELECT_SQL}
        WHERE {' AND '.join(filters)}
        ORDER BY m.machine_id DESC, m.machine_name
        """
    )
    return connection.execute(sql, params).fetchall()


def _next_machine_id(connection, purchase_date: date) -> str:
    year = purchase_date.year
    row = connection.execute(
        text(
            """
            SELECT machine_id
            FROM yora_machinery_master
            WHERE machine_id LIKE :pattern
            ORDER BY CAST(SUBSTRING(SUBSTRING_INDEX(machine_id, '-', 1), 2) AS UNSIGNED) DESC
            LIMIT 1
            """
        ),
        {"pattern": f"M%-{year}"},
    ).first()

    next_sequence = 1
    if row and row.machine_id:
        prefix = row.machine_id.split("-", 1)[0]
        if prefix.startswith("M") and prefix[1:].isdigit():
            next_sequence = int(prefix[1:]) + 1

    return f"M{next_sequence:03d}-{year}"


@router.post("/lookups")
def machinery_master_lookups():
    return {
        "status": "success",
        "message": "Machinery master lookups fetched successfully.",
        "data": {
            "machine_types": list(MACHINE_TYPES),
        },
    }


@router.post("/search")
def search_machinery_master(search: str = Form("")):
    with engine_mysql.connect() as conn:
        rows = _fetch_rows(conn, search=search)

    return {
        "status": "success",
        "message": "Machinery master fetched successfully.",
        "data": [_serialize_row(row) for row in rows],
    }


@router.post("/retrieve")
def retrieve_machinery_master(id: str = Form(...)):
    record_id = _parse_optional_id(id)
    if record_id is None:
        raise HTTPException(status_code=400, detail="Machine id is required.")

    with engine_mysql.connect() as conn:
        row = conn.execute(
            text(f"{SELECT_SQL} WHERE m.id = :id LIMIT 1"),
            {"id": record_id},
        ).fetchone()

    if not row:
        return {
            "status": "error",
            "message": "Machine not found.",
            "data": None,
        }

    return {
        "status": "success",
        "message": "Machine fetched successfully.",
        "data": _serialize_row(row),
    }


@router.post("/save")
def save_machinery_master(
    action: str = Form(...),
    machine_name: str = Form(...),
    machine_type: str = Form(...),
    machine_description: str = Form(""),
    purchase_date: str = Form(...),
    supplier_name: str = Form(""),
    amc_warranty_validity: str = Form(""),
    id: Optional[str] = Form(None),
):
    action = action.strip().lower()
    if action not in {"new", "modify"}:
        raise HTTPException(status_code=400, detail="Invalid action.")

    name = _normalize_text(machine_name)
    machine_type_value = _normalize_text(machine_type)
    description = _normalize_text(machine_description) or None
    supplier = _normalize_text(supplier_name) or None
    purchase_date_value = _parse_required_date(purchase_date, "Purchase date")
    amc_warranty_date = _parse_optional_date(amc_warranty_validity, "AMC/Warranty validity")

    if not name:
        raise HTTPException(status_code=400, detail="Machine name is required.")

    if machine_type_value not in MACHINE_TYPES:
        raise HTTPException(status_code=400, detail="Invalid machine type.")

    duplicate_name_sql = text(
        """
        SELECT id
        FROM yora_machinery_master
        WHERE machine_name = :machine_name
          AND (:id IS NULL OR id <> :id)
        LIMIT 1
        """
    )

    try:
        with engine_mysql.begin() as conn:
            record_id = _parse_optional_id(id) if id else None

            duplicate_name = conn.execute(
                duplicate_name_sql,
                {"machine_name": name, "id": record_id},
            ).first()
            if duplicate_name:
                return {
                    "status": "error",
                    "message": "A machine with this name already exists.",
                    "data": None,
                }

            payload = {
                "machine_name": name,
                "machine_type": machine_type_value,
                "machine_description": description,
                "purchase_date": purchase_date_value,
                "supplier_name": supplier,
                "amc_warranty_validity": amc_warranty_date,
            }

            if action == "new":
                machine_code = _next_machine_id(conn, purchase_date_value)
                result = conn.execute(
                    text(
                        """
                        INSERT INTO yora_machinery_master
                            (machine_id, machine_name, machine_type, machine_description,
                             purchase_date, supplier_name, amc_warranty_validity)
                        VALUES
                            (:machine_id, :machine_name, :machine_type, :machine_description,
                             :purchase_date, :supplier_name, :amc_warranty_validity)
                        """
                    ),
                    {**payload, "machine_id": machine_code},
                )
                record_id = result.lastrowid
                message = "Machine saved successfully."
            else:
                if record_id is None:
                    raise HTTPException(status_code=400, detail="Machine id is required.")

                updated = conn.execute(
                    text(
                        """
                        UPDATE yora_machinery_master
                        SET machine_name = :machine_name,
                            machine_type = :machine_type,
                            machine_description = :machine_description,
                            purchase_date = :purchase_date,
                            supplier_name = :supplier_name,
                            amc_warranty_validity = :amc_warranty_validity
                        WHERE id = :id
                        """
                    ),
                    {**payload, "id": record_id},
                )
                if updated.rowcount == 0:
                    return {
                        "status": "error",
                        "message": "Machine not found.",
                        "data": None,
                    }
                message = "Machine updated successfully."

            row = conn.execute(
                text(f"{SELECT_SQL} WHERE m.id = :id LIMIT 1"),
                {"id": record_id},
            ).fetchone()
    except HTTPException:
        raise
    except IntegrityError as exc:
        raise HTTPException(
            status_code=400,
            detail="Unable to save machine. Check the entered details.",
        ) from exc
    except SQLAlchemyError as exc:
        raise HTTPException(
            status_code=500,
            detail="Unable to save machine.",
        ) from exc

    return {
        "status": "success",
        "message": message,
        "data": _serialize_row(row),
    }
