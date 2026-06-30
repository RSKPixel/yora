from datetime import date, datetime
from decimal import Decimal, InvalidOperation
from typing import Optional

from fastapi import APIRouter, Form, HTTPException
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

from core.dependencies import engine_mysql

router = APIRouter()

MOULD_TYPES = ("Blow Mould", "Injection Mould")
TOOL_QUALITY_STATUSES = (
    "Good",
    "Service Required",
    "Damaged",
    "Unusable",
    "Need to Be replaced",
)

SELECT_SQL = """
SELECT
    m.id,
    m.tool_id,
    m.mould_name,
    m.mould_type,
    m.purchase_date,
    m.manufactured_by,
    m.tool_quality_status,
    m.neck_size_mm,
    m.capacity_ml,
    m.compatible_machine_id,
    m.inventory_location_id,
    CONCAT(machine.machine_id, ' — ', machine.machine_name) AS compatible_machine_name,
    location.cost_center_name AS inventory_location_name
FROM yora_mould_inventory m
LEFT JOIN yora_machinery_master machine ON machine.id = m.compatible_machine_id
LEFT JOIN yora_cost_centers location ON location.id = m.inventory_location_id
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


def _parse_optional_decimal(value: Optional[str], field_label: str) -> Optional[Decimal]:
    if value is None:
        return None
    cleaned = value.strip()
    if not cleaned:
        return None
    try:
        number = Decimal(cleaned)
    except InvalidOperation as exc:
        raise HTTPException(status_code=400, detail=f"Invalid {field_label}.") from exc
    if number < 0:
        raise HTTPException(status_code=400, detail=f"{field_label} cannot be negative.")
    return number


def _parse_required_date(value: str, field_label: str) -> date:
    cleaned = _normalize_text(value)
    if not cleaned:
        raise HTTPException(status_code=400, detail=f"{field_label} is required.")
    try:
        return datetime.strptime(cleaned, "%Y-%m-%d").date()
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=f"Invalid {field_label}.") from exc


def _serialize_row(row) -> dict:
    purchase_date = row.purchase_date
    if isinstance(purchase_date, datetime):
        purchase_date = purchase_date.date()

    return {
        "id": row.id,
        "tool_id": row.tool_id,
        "mould_name": row.mould_name,
        "mould_type": row.mould_type,
        "purchase_date": purchase_date.isoformat() if purchase_date else None,
        "manufactured_by": row.manufactured_by,
        "tool_quality_status": row.tool_quality_status,
        "neck_size_mm": float(row.neck_size_mm) if row.neck_size_mm is not None else None,
        "capacity_ml": float(row.capacity_ml) if row.capacity_ml is not None else None,
        "compatible_machine_id": row.compatible_machine_id,
        "compatible_machine_name": row.compatible_machine_name,
        "inventory_location_id": row.inventory_location_id,
        "inventory_location_name": row.inventory_location_name,
    }


def _fetch_rows(connection, *, search: str = "") -> list:
    filters = ["1 = 1"]
    params = {}

    query = _normalize_text(search)
    if query:
        filters.append(
            """
            (
                m.mould_name LIKE :search
                OR m.tool_id LIKE :search
                OR m.manufactured_by LIKE :search
            )
            """
        )
        params["search"] = f"%{query}%"

    sql = text(
        f"""
        {SELECT_SQL}
        WHERE {' AND '.join(filters)}
        ORDER BY m.tool_id DESC, m.mould_name
        """
    )
    return connection.execute(sql, params).fetchall()


def _validate_machinery_master(connection, machinery_id: int) -> None:
    row = connection.execute(
        text("SELECT id FROM yora_machinery_master WHERE id = :id LIMIT 1"),
        {"id": machinery_id},
    ).first()
    if not row:
        raise HTTPException(status_code=400, detail="Selected machine is not valid.")


def _validate_cost_center_child(connection, cost_center_id: int, parent_name: str) -> None:
    sql = text(
        """
        SELECT child.id
        FROM yora_cost_centers parent
        INNER JOIN yora_cost_centers child ON child.under_id = parent.id
        WHERE parent.cost_center_name = :parent_name
          AND child.id = :id
        LIMIT 1
        """
    )
    row = connection.execute(sql, {"parent_name": parent_name, "id": cost_center_id}).first()
    if not row:
        raise HTTPException(
            status_code=400,
            detail=f"Selected value is not a valid cost center under {parent_name}.",
        )


def _next_tool_id(connection, purchase_date: date) -> str:
    year = purchase_date.year
    row = connection.execute(
        text(
            """
            SELECT tool_id
            FROM yora_mould_inventory
            WHERE tool_id LIKE :pattern
            ORDER BY CAST(SUBSTRING_INDEX(tool_id, '-', 1) AS UNSIGNED) DESC
            LIMIT 1
            """
        ),
        {"pattern": f"%-{year}"},
    ).first()

    next_sequence = 1
    if row and row.tool_id:
        sequence_part = row.tool_id.split("-", 1)[0]
        if sequence_part.isdigit():
            next_sequence = int(sequence_part) + 1

    return f"{next_sequence:03d}-{year}"


@router.post("/lookups")
def mould_inventory_lookups():
    locations_sql = text(
        """
        SELECT child.id, child.cost_center_name
        FROM yora_cost_centers parent
        INNER JOIN yora_cost_centers child ON child.under_id = parent.id
        WHERE parent.cost_center_name = :parent_name
        ORDER BY child.cost_center_name
        """
    )
    machines_sql = text(
        """
        SELECT id, machine_id, machine_name, machine_type
        FROM yora_machinery_master
        ORDER BY machine_id, machine_name
        """
    )

    with engine_mysql.connect() as conn:
        machines = conn.execute(machines_sql).fetchall()
        locations = conn.execute(locations_sql, {"parent_name": "Locations"}).fetchall()

    return {
        "status": "success",
        "message": "Mould inventory lookups fetched successfully.",
        "data": {
            "mould_types": list(MOULD_TYPES),
            "tool_quality_statuses": list(TOOL_QUALITY_STATUSES),
            "machines": [
                {
                    "id": row.id,
                    "machine_id": row.machine_id,
                    "machine_name": row.machine_name,
                    "machine_type": row.machine_type,
                }
                for row in machines
            ],
            "locations": [
                {"id": row.id, "cost_center_name": row.cost_center_name} for row in locations
            ],
        },
    }


@router.post("/search")
def search_mould_inventory(mould_name: str = Form("")):
    with engine_mysql.connect() as conn:
        rows = _fetch_rows(conn, search=mould_name)

    return {
        "status": "success",
        "message": "Mould inventory fetched successfully.",
        "data": [_serialize_row(row) for row in rows],
    }


@router.post("/retrieve")
def retrieve_mould_inventory(id: str = Form(...)):
    mould_id = _parse_optional_id(id)
    if mould_id is None:
        raise HTTPException(status_code=400, detail="Mould id is required.")

    sql = text(
        f"""
        {SELECT_SQL}
        WHERE m.id = :id
        LIMIT 1
        """
    )

    with engine_mysql.connect() as conn:
        row = conn.execute(sql, {"id": mould_id}).fetchone()

    if not row:
        return {
            "status": "error",
            "message": "Mould not found.",
            "data": None,
        }

    return {
        "status": "success",
        "message": "Mould fetched successfully.",
        "data": _serialize_row(row),
    }


@router.post("/save")
def save_mould_inventory(
    action: str = Form(...),
    mould_name: str = Form(...),
    mould_type: str = Form(...),
    purchase_date: str = Form(...),
    manufactured_by: str = Form(""),
    tool_quality_status: str = Form("Good"),
    neck_size_mm: str = Form(""),
    capacity_ml: str = Form(""),
    compatible_machine_id: str = Form(""),
    inventory_location_id: str = Form(""),
    id: Optional[str] = Form(None),
):
    action = action.strip().lower()
    if action not in {"new", "modify"}:
        raise HTTPException(status_code=400, detail="Invalid action.")

    name = _normalize_text(mould_name)
    mould_type_value = _normalize_text(mould_type)
    manufacturer = _normalize_text(manufactured_by) or None
    quality_status = _normalize_text(tool_quality_status) or "Good"
    purchase_date_value = _parse_required_date(purchase_date, "Purchase date")

    if not name:
        raise HTTPException(status_code=400, detail="Mould name is required.")

    if mould_type_value not in MOULD_TYPES:
        raise HTTPException(status_code=400, detail="Invalid mould type.")

    if quality_status not in TOOL_QUALITY_STATUSES:
        raise HTTPException(status_code=400, detail="Invalid tool quality status.")

    neck_size = _parse_optional_decimal(neck_size_mm, "Neck size")
    capacity = _parse_optional_decimal(capacity_ml, "Capacity")

    machine_id = _parse_optional_id(compatible_machine_id)
    location_id = _parse_optional_id(inventory_location_id)

    if machine_id is None:
        raise HTTPException(status_code=400, detail="Compatible machine is required.")

    if location_id is None:
        raise HTTPException(status_code=400, detail="Current inventory location is required.")

    duplicate_name_sql = text(
        """
        SELECT id
        FROM yora_mould_inventory
        WHERE mould_name = :mould_name
          AND (:id IS NULL OR id <> :id)
        LIMIT 1
        """
    )

    try:
        with engine_mysql.begin() as conn:
            mould_id = _parse_optional_id(id) if id else None

            duplicate_name = conn.execute(
                duplicate_name_sql,
                {"mould_name": name, "id": mould_id},
            ).first()
            if duplicate_name:
                return {
                    "status": "error",
                    "message": "A mould with this name already exists.",
                    "data": None,
                }

            _validate_machinery_master(conn, machine_id)
            _validate_cost_center_child(conn, location_id, "Locations")

            payload = {
                "mould_name": name,
                "mould_type": mould_type_value,
                "purchase_date": purchase_date_value,
                "manufactured_by": manufacturer,
                "tool_quality_status": quality_status,
                "neck_size_mm": neck_size,
                "capacity_ml": capacity,
                "compatible_machine_id": machine_id,
                "inventory_location_id": location_id,
            }

            if action == "new":
                tool_id = _next_tool_id(conn, purchase_date_value)
                result = conn.execute(
                    text(
                        """
                        INSERT INTO yora_mould_inventory
                            (tool_id, mould_name, mould_type, purchase_date, manufactured_by,
                             tool_quality_status, neck_size_mm, capacity_ml,
                             compatible_machine_id, inventory_location_id)
                        VALUES
                            (:tool_id, :mould_name, :mould_type, :purchase_date, :manufactured_by,
                             :tool_quality_status, :neck_size_mm, :capacity_ml,
                             :compatible_machine_id, :inventory_location_id)
                        """
                    ),
                    {**payload, "tool_id": tool_id},
                )
                mould_id = result.lastrowid
                message = "Mould saved successfully."
            else:
                if mould_id is None:
                    raise HTTPException(status_code=400, detail="Mould id is required.")

                updated = conn.execute(
                    text(
                        """
                        UPDATE yora_mould_inventory
                        SET mould_name = :mould_name,
                            mould_type = :mould_type,
                            purchase_date = :purchase_date,
                            manufactured_by = :manufactured_by,
                            tool_quality_status = :tool_quality_status,
                            neck_size_mm = :neck_size_mm,
                            capacity_ml = :capacity_ml,
                            compatible_machine_id = :compatible_machine_id,
                            inventory_location_id = :inventory_location_id
                        WHERE id = :id
                        """
                    ),
                    {**payload, "id": mould_id},
                )
                if updated.rowcount == 0:
                    return {
                        "status": "error",
                        "message": "Mould not found.",
                        "data": None,
                    }
                message = "Mould updated successfully."

            row = conn.execute(
                text(
                    f"""
                    {SELECT_SQL}
                    WHERE m.id = :id
                    LIMIT 1
                    """
                ),
                {"id": mould_id},
            ).fetchone()
    except HTTPException:
        raise
    except IntegrityError as exc:
        raise HTTPException(
            status_code=400,
            detail="Unable to save mould. Check the entered details.",
        ) from exc
    except SQLAlchemyError as exc:
        raise HTTPException(
            status_code=500,
            detail="Unable to save mould.",
        ) from exc

    return {
        "status": "success",
        "message": message,
        "data": _serialize_row(row),
    }
