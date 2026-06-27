from decimal import Decimal
from typing import Any

from fastapi import APIRouter, Form, HTTPException
from sqlalchemy import bindparam, text
from sqlalchemy.exc import SQLAlchemyError

from core.dependencies import engine_mysql
from services.stock_fifo import compute_fifo_avg_prices_by_item

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


def _sales_filter(date_from: str, date_to: str) -> str:
    if date_from and date_to:
        return "invoice_date >= :date_from AND invoice_date <= :date_to"
    if date_to:
        return "invoice_date <= :date_to"
    if date_from:
        return "invoice_date >= :date_from"
    return "1 = 1"


def _fetch_avg_selling_prices(
    connection,
    *,
    date_from: str,
    date_to: str,
    stock_items: list[str] | None = None,
) -> dict[str, float]:
    sales_filter = _sales_filter(date_from, date_to)
    stock_clause = " AND stock_item IN :stock_items" if stock_items else ""

    sql = text(
        f"""
        SELECT
            stock_item,
            CASE
                WHEN COALESCE(SUM(qty), 0) > 0 THEN SUM(value) / SUM(qty)
                ELSE NULL
            END AS avg_selling_price
        FROM yora_sales
        WHERE {sales_filter}
        {stock_clause}
        GROUP BY stock_item
        """
    )

    if stock_items:
        sql = sql.bindparams(bindparam("stock_items", expanding=True))

    query_params = {key: value for key, value in {"date_from": date_from, "date_to": date_to}.items() if value}
    if stock_items:
        query_params["stock_items"] = stock_items

    rows = connection.execute(sql, query_params).mappings()
    return {
        row["stock_item"]: float(row["avg_selling_price"])
        for row in rows
        if row["stock_item"] and row["avg_selling_price"] is not None
    }


def _fetch_item_rows(params: dict[str, str]) -> list[dict[str, Any]]:
    date_from = params.get("date_from", "")
    date_to = params.get("date_to", "")

    if date_from and date_to:
        opening_stock_filter = "opening_date < :date_from"
        opening_purchase_filter = "purchase_date < :date_from"
        opening_sales_filter = "invoice_date < :date_from"
        purchase_filter = "purchase_date >= :date_from AND purchase_date <= :date_to"
        sales_filter = _sales_filter(date_from, date_to)
    elif date_to:
        # As-on snapshot: cumulative movements up to date_to only.
        opening_stock_filter = "opening_date <= :date_to"
        opening_purchase_filter = "1 = 0"
        opening_sales_filter = "1 = 0"
        purchase_filter = "purchase_date <= :date_to"
        sales_filter = _sales_filter(date_from, date_to)
    elif date_from:
        opening_stock_filter = "opening_date < :date_from"
        opening_purchase_filter = "purchase_date < :date_from"
        opening_sales_filter = "invoice_date < :date_from"
        purchase_filter = "purchase_date >= :date_from"
        sales_filter = _sales_filter(date_from, date_to)
    else:
        opening_stock_filter = "1 = 1"
        opening_purchase_filter = "1 = 0"
        opening_sales_filter = "1 = 0"
        purchase_filter = "1 = 1"
        sales_filter = _sales_filter(date_from, date_to)

    opening_sql = f"""
        SELECT
            stock_item,
            COALESCE(SUM(qty), 0) AS opening_qty
        FROM (
            SELECT
                stock_item,
                qty
            FROM yora_opening_stock
            WHERE {opening_stock_filter}
            UNION ALL
            SELECT
                stock_item,
                qty
            FROM yora_purchase_details
            WHERE {opening_purchase_filter}
            UNION ALL
            SELECT
                stock_item,
                -qty AS qty
            FROM yora_sales
            WHERE {opening_sales_filter}
        ) opening_movements
        GROUP BY stock_item
    """

    purchase_sql = f"""
        SELECT
            stock_item,
            COALESCE(SUM(qty), 0) AS purchase_qty
        FROM yora_purchase_details
        WHERE {purchase_filter}
        GROUP BY stock_item
    """

    sales_sql = f"""
        SELECT
            stock_item,
            COALESCE(SUM(qty), 0) AS sales_qty
        FROM yora_sales
        WHERE {sales_filter}
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
        query_params = {key: value for key, value in params.items() if value}
        return connection.execute(report_sql, query_params).mappings().all()


def _build_item_report(
    rows: list[dict[str, Any]],
    avg_prices: dict[str, float | None] | None = None,
    avg_selling_prices: dict[str, float] | None = None,
) -> tuple[list[dict], dict]:
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
        stock_item = row["stock_item"] or ""
        avg_price = (avg_prices or {}).get(stock_item)
        avg_selling_price = (avg_selling_prices or {}).get(stock_item)

        report_rows.append(
            {
                "stock_item": stock_item,
                "group": parent,
                "unit": row["unit"] or "",
                "opening_qty": _serialize_value(opening_qty),
                "purchase_qty": _serialize_value(purchase_qty),
                "sales_qty": _serialize_value(sales_qty),
                "closing_qty": _serialize_value(closing_qty),
                "reorder_level": _serialize_value(reorder_level),
                "needs_reorder": needs_reorder,
                "avg_price": (
                    _serialize_value(round(avg_price, 2))
                    if avg_price is not None and closing_qty > 0
                    else None
                ),
                "avg_selling_price": (
                    _serialize_value(round(avg_selling_price, 2))
                    if avg_selling_price is not None and sales_qty > 0
                    else None
                ),
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
        with engine_mysql.connect() as connection:
            raw_rows = _fetch_item_rows(params)
            stock_items = [row["stock_item"] for row in raw_rows]
            avg_prices = compute_fifo_avg_prices_by_item(
                connection,
                date_to=date_to,
                stock_items=stock_items,
            )
            avg_selling_prices = _fetch_avg_selling_prices(
                connection,
                date_from=date_from,
                date_to=date_to,
                stock_items=stock_items,
            )
        report_rows, totals = _build_item_report(
            raw_rows,
            avg_prices,
            avg_selling_prices,
        )
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
