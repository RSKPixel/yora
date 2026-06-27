from decimal import Decimal
from typing import Any

from fastapi import APIRouter, Form, HTTPException
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from core.dependencies import engine_mysql

router = APIRouter()


def _qty_number(value: Any) -> float:
    if value is None or value == "":
        return 0.0
    return float(value)


def _serialize_value(value: Any) -> Any:
    if isinstance(value, Decimal):
        number = float(value)
        if number == int(number):
            return str(int(number))
        return str(number)
    return value


def _normalize_parent(value: Any) -> str:
    return (value or "").strip()


def _fetch_item_rows(params: dict[str, str]) -> list[dict[str, Any]]:
    opening_sql = """
        SELECT
            stock_item,
            COALESCE(SUM(qty), 0) AS opening_qty
        FROM (
            SELECT
                stock_item,
                qty
            FROM yora_opening_stock
            WHERE (:date_from = '' OR opening_date < :date_from)
            UNION ALL
            SELECT
                stock_item,
                qty
            FROM yora_purchase_details
            WHERE (:date_from != '' AND purchase_date < :date_from)
            UNION ALL
            SELECT
                stock_item,
                -qty AS qty
            FROM yora_sales
            WHERE (:date_from != '' AND invoice_date < :date_from)
        ) opening_movements
        GROUP BY stock_item
    """

    purchase_sql = """
        SELECT
            stock_item,
            COALESCE(SUM(qty), 0) AS purchase_qty
        FROM yora_purchase_details
        WHERE (:date_from = '' OR purchase_date >= :date_from)
          AND (:date_to = '' OR purchase_date <= :date_to)
        GROUP BY stock_item
    """

    sales_sql = """
        SELECT
            stock_item,
            COALESCE(SUM(qty), 0) AS sales_qty
        FROM yora_sales
        WHERE (:date_from = '' OR invoice_date >= :date_from)
          AND (:date_to = '' OR invoice_date <= :date_to)
        GROUP BY stock_item
    """

    items_sql = """
        SELECT stock_item FROM yora_opening_stock
        UNION
        SELECT stock_item FROM yora_purchase_details
        UNION
        SELECT stock_item FROM yora_sales
    """

    group_filter = "AND TRIM(si.parent) = :group" if params["group"] else ""

    report_sql = text(
        f"""
        WITH items AS (
            {items_sql}
        ),
        opening_qty AS (
            {opening_sql}
        ),
        purchase_qty AS (
            {purchase_sql}
        ),
        sales_qty AS (
            {sales_sql}
        )
        SELECT
            i.stock_item,
            TRIM(COALESCE(si.parent, '')) AS parent,
            COALESCE(si.unit, '') AS unit,
            COALESCE(o.opening_qty, 0) AS opening_qty,
            COALESCE(p.purchase_qty, 0) AS purchase_qty,
            COALESCE(s.sales_qty, 0) AS sales_qty,
            COALESCE(o.opening_qty, 0)
                + COALESCE(p.purchase_qty, 0)
                - COALESCE(s.sales_qty, 0) AS closing_qty,
            COALESCE(inv.reorder_level, 0) AS reorder_level
        FROM items i
        INNER JOIN yora_stockitems si
            ON si.stock_item = i.stock_item
        LEFT JOIN opening_qty o
            ON o.stock_item = i.stock_item
        LEFT JOIN purchase_qty p
            ON p.stock_item = i.stock_item
        LEFT JOIN sales_qty s
            ON s.stock_item = i.stock_item
        LEFT JOIN yora_inventory inv
            ON inv.stock_item = i.stock_item
        WHERE TRIM(COALESCE(si.parent, '')) != ''
            {group_filter}
        ORDER BY TRIM(si.parent), i.stock_item
        """
    )

    with engine_mysql.connect() as connection:
        return connection.execute(report_sql, params).mappings().all()


def _build_item_report(rows: list[dict[str, Any]]) -> tuple[list[dict], dict]:
    report_rows = []
    totals = {
        "opening_qty": 0.0,
        "purchase_qty": 0.0,
        "sales_qty": 0.0,
        "closing_qty": 0.0,
    }

    for row in rows:
        opening_qty = _qty_number(row["opening_qty"])
        purchase_qty = _qty_number(row["purchase_qty"])
        sales_qty = _qty_number(row["sales_qty"])
        closing_qty = _qty_number(row["closing_qty"])
        reorder_level = _qty_number(row["reorder_level"])
        parent = _normalize_parent(row["parent"])
        if not parent:
            continue

        needs_reorder = reorder_level > 0 and closing_qty < reorder_level

        report_rows.append(
            {
                "stock_item": row["stock_item"] or "",
                "group": parent,
                "unit": row["unit"] or "",
                "opening_qty": _serialize_value(opening_qty),
                "purchase_qty": _serialize_value(purchase_qty),
                "sales_qty": _serialize_value(sales_qty),
                "closing_qty": _serialize_value(closing_qty),
                "reorder_level": _serialize_value(reorder_level),
                "needs_reorder": needs_reorder,
            }
        )

        totals["opening_qty"] += opening_qty
        totals["purchase_qty"] += purchase_qty
        totals["sales_qty"] += sales_qty
        totals["closing_qty"] += closing_qty

    return report_rows, totals


@router.post("/stock")
def stock_report(
    date_from: str = Form(""),
    date_to: str = Form(""),
    group: str = Form(""),
):
    """Opening + purchase - sales = closing for each stock item."""
    date_from = date_from.strip()
    date_to = date_to.strip()
    group = group.strip()

    if date_from and date_to and date_from > date_to:
        raise HTTPException(
            status_code=400,
            detail="From date cannot be after to date.",
        )

    params: dict[str, str] = {
        "date_from": date_from,
        "date_to": date_to,
        "group": group,
    }

    try:
        raw_rows = _fetch_item_rows(params)
        report_rows, totals = _build_item_report(raw_rows)
    except SQLAlchemyError as exc:
        raise HTTPException(
            status_code=500,
            detail="Unable to generate stock report. Please try again later.",
        ) from exc

    return {
        "status": "success",
        "message": (
            "Stock report generated."
            if report_rows
            else "No stock movements found for the selected filters."
        ),
        "data": {
            "date_from": date_from,
            "date_to": date_to,
            "group": group,
            "rows": report_rows,
            "totals": {key: _serialize_value(value) for key, value in totals.items()},
            "summary": {
                "row_count": len(report_rows),
                "reorder_count": sum(
                    1 for row in report_rows if row.get("needs_reorder")
                ),
            },
        },
    }
