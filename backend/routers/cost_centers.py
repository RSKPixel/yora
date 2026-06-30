from typing import Optional

from fastapi import APIRouter, Form, HTTPException
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

from core.dependencies import engine_mysql

router = APIRouter()

PRIMARY_LABEL = "Primary"

SELECT_SQL = """
SELECT
    cc.id,
    cc.cost_center_name,
    cc.under_id,
    parent.cost_center_name AS under_name
FROM yora_cost_centers cc
LEFT JOIN yora_cost_centers parent ON parent.id = cc.under_id
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
        raise HTTPException(status_code=400, detail="Invalid cost center id.") from exc


def _fetch_rows(connection, *, cost_center_name: str = "") -> list:
    filters = ["1 = 1"]
    params = {}

    name = _normalize_text(cost_center_name)
    if name:
        filters.append("cc.cost_center_name LIKE :cost_center_name")
        params["cost_center_name"] = f"%{name}%"

    sql = text(
        f"""
        {SELECT_SQL}
        WHERE {' AND '.join(filters)}
        ORDER BY cc.cost_center_name
        """
    )
    return connection.execute(sql, params).fetchall()


def _rows_by_id(rows) -> dict:
    return {row.id: row for row in rows}


def _is_direct_under_primary(row) -> bool:
    return row.under_id is None


def _serialize_row(row) -> dict:
    return {
        "id": row.id,
        "cost_center_name": row.cost_center_name,
        "under_id": row.under_id,
        "under_name": row.under_name or PRIMARY_LABEL,
    }


def _serialize_under_option(row) -> dict:
    return {
        "id": row.id,
        "cost_center_name": row.cost_center_name,
    }


@router.post("/search")
def search_cost_centers(cost_center_name: str = Form("")):
    with engine_mysql.connect() as conn:
        rows = _fetch_rows(conn, cost_center_name=cost_center_name)

    return {
        "status": "success",
        "message": "Cost centers fetched successfully.",
        "data": [_serialize_row(row) for row in rows],
    }


@router.post("/under-options")
def under_options(exclude_id: str = Form("")):
    exclude = _parse_optional_id(exclude_id) if exclude_id.strip() else None

    with engine_mysql.connect() as conn:
        rows = _fetch_rows(conn)

        options = [{"id": None, "cost_center_name": PRIMARY_LABEL}]
        for row in rows:
            if not _is_direct_under_primary(row):
                continue
            if exclude is not None and row.id == exclude:
                continue
            options.append(_serialize_under_option(row))

    return {
        "status": "success",
        "message": "Under options fetched successfully.",
        "data": options,
    }


@router.post("/retrieve")
def retrieve_cost_center(id: str = Form(...)):
    cost_center_id = _parse_optional_id(id)
    if cost_center_id is None:
        raise HTTPException(status_code=400, detail="Cost center id is required.")

    sql = text(
        f"""
        {SELECT_SQL}
        WHERE cc.id = :id
        LIMIT 1
        """
    )

    with engine_mysql.connect() as conn:
        row = conn.execute(sql, {"id": cost_center_id}).fetchone()

    if not row:
        return {
            "status": "error",
            "message": "Cost center not found.",
            "data": None,
        }

    return {
        "status": "success",
        "message": "Cost center fetched successfully.",
        "data": _serialize_row(row),
    }


def _validate_under_id(
    connection,
    under_id: Optional[int],
    *,
    cost_center_id: Optional[int],
) -> None:
    if under_id is None:
        return

    rows = _fetch_rows(connection)
    by_id = _rows_by_id(rows)

    if cost_center_id is not None and under_id == cost_center_id:
        raise HTTPException(status_code=400, detail="A cost center cannot be under itself.")

    parent = by_id.get(under_id)
    if parent is None:
        raise HTTPException(status_code=400, detail="Selected Under cost center was not found.")

    if not _is_direct_under_primary(parent):
        raise HTTPException(
            status_code=400,
            detail="Selected Under cost center is not eligible.",
        )


@router.post("/save")
def save_cost_center(
    action: str = Form(...),
    cost_center_name: str = Form(...),
    under_id: str = Form(""),
    id: Optional[str] = Form(None),
):
    action = action.strip().lower()
    if action not in {"new", "modify"}:
        raise HTTPException(status_code=400, detail="Invalid action.")

    name = _normalize_text(cost_center_name)
    parent_id = _parse_optional_id(under_id)

    if not name:
        raise HTTPException(status_code=400, detail="Cost center name is required.")

    duplicate_name_sql = text(
        """
        SELECT id
        FROM yora_cost_centers
        WHERE cost_center_name = :cost_center_name
          AND (:id IS NULL OR id <> :id)
        LIMIT 1
        """
    )

    try:
        with engine_mysql.begin() as conn:
            cost_center_id = _parse_optional_id(id) if id else None

            duplicate_name = conn.execute(
                duplicate_name_sql,
                {"cost_center_name": name, "id": cost_center_id},
            ).first()
            if duplicate_name:
                return {
                    "status": "error",
                    "message": "A cost center with this name already exists.",
                    "data": None,
                }

            _validate_under_id(conn, parent_id, cost_center_id=cost_center_id)

            payload = {
                "cost_center_name": name,
                "under_id": parent_id,
            }

            if action == "new":
                result = conn.execute(
                    text(
                        """
                        INSERT INTO yora_cost_centers
                            (cost_center_name, under_id)
                        VALUES
                            (:cost_center_name, :under_id)
                        """
                    ),
                    payload,
                )
                cost_center_id = result.lastrowid
                message = "Cost center saved successfully."
            else:
                if cost_center_id is None:
                    raise HTTPException(status_code=400, detail="Cost center id is required.")

                updated = conn.execute(
                    text(
                        """
                        UPDATE yora_cost_centers
                        SET cost_center_name = :cost_center_name,
                            under_id = :under_id
                        WHERE id = :id
                        """
                    ),
                    {**payload, "id": cost_center_id},
                )
                if updated.rowcount == 0:
                    return {
                        "status": "error",
                        "message": "Cost center not found.",
                        "data": None,
                    }
                message = "Cost center updated successfully."

            row = conn.execute(
                text(
                    f"""
                    {SELECT_SQL}
                    WHERE cc.id = :id
                    LIMIT 1
                    """
                ),
                {"id": cost_center_id},
            ).fetchone()
    except HTTPException:
        raise
    except IntegrityError as exc:
        raise HTTPException(
            status_code=400,
            detail="Unable to save cost center. Check the entered details.",
        ) from exc
    except SQLAlchemyError as exc:
        raise HTTPException(
            status_code=500,
            detail="Unable to save cost center.",
        ) from exc

    return {
        "status": "success",
        "message": message,
        "data": _serialize_row(row),
    }
