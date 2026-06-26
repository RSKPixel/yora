import json
from calendar import monthrange
from datetime import date, datetime, timezone
from decimal import Decimal
from typing import Any
from urllib.error import URLError
from urllib.request import Request, urlopen

from fastapi import APIRouter
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from core.dependencies import engine_mysql

router = APIRouter()

FRANKFURTER_URL = "https://api.frankfurter.app/latest?from=USD&to=INR"
BRENT_OIL_URL = "https://query1.finance.yahoo.com/v8/finance/chart/BZ=F?interval=1d&range=1d"
USER_AGENT = "YoraERP/1.0"


def _serialize_value(value: Any) -> Any:
    if isinstance(value, Decimal):
        number = float(value)
        if number == int(number):
            return int(number)
        return number
    return value


def _month_bounds(year: int, month: int) -> tuple[date, date]:
    last_day = monthrange(year, month)[1]
    return date(year, month, 1), date(year, month, last_day)


def _month_label(month_start: date) -> str:
    return month_start.strftime("%b %Y")


def _sales_by_group_rows() -> dict[str, Any]:
    today = date.today()
    current_from, current_to = _month_bounds(today.year, today.month)

    if today.month == 1:
        previous_from, previous_to = _month_bounds(today.year - 1, 12)
    else:
        previous_from, previous_to = _month_bounds(today.year, today.month - 1)

    sql = text(
        """
        SELECT
            TRIM(si.parent) AS parent_group,
            COALESCE(SUM(
                CASE
                    WHEN s.invoice_date BETWEEN :current_from AND :current_to
                    THEN s.qty ELSE 0
                END
            ), 0) AS current_month_qty,
            COALESCE(SUM(
                CASE
                    WHEN s.invoice_date BETWEEN :previous_from AND :previous_to
                    THEN s.qty ELSE 0
                END
            ), 0) AS previous_month_qty
        FROM yora_sales s
        INNER JOIN yora_stockitems si
            ON si.stock_item = s.stock_item
        WHERE TRIM(COALESCE(si.parent, '')) != ''
          AND s.invoice_date BETWEEN :previous_from AND :current_to
        GROUP BY TRIM(si.parent)
        ORDER BY TRIM(si.parent)
        """
    )

    params = {
        "current_from": current_from.isoformat(),
        "current_to": current_to.isoformat(),
        "previous_from": previous_from.isoformat(),
        "previous_to": previous_to.isoformat(),
    }

    with engine_mysql.connect() as conn:
        rows = conn.execute(sql, params).mappings().all()

    items = [
        {
            "group": row["parent_group"],
            "current_month_qty": _serialize_value(row["current_month_qty"]),
            "previous_month_qty": _serialize_value(row["previous_month_qty"]),
        }
        for row in rows
    ]

    totals = {
        "current_month_qty": sum(item["current_month_qty"] for item in items),
        "previous_month_qty": sum(item["previous_month_qty"] for item in items),
    }

    return {
        "current_month": {
            "label": _month_label(current_from),
            "date_from": current_from.isoformat(),
            "date_to": current_to.isoformat(),
        },
        "previous_month": {
            "label": _month_label(previous_from),
            "date_from": previous_from.isoformat(),
            "date_to": previous_to.isoformat(),
        },
        "rows": items,
        "totals": totals,
    }


def _fetch_json(url: str) -> dict:
    request = Request(url, headers={"User-Agent": USER_AGENT})
    with urlopen(request, timeout=10) as response:
        return json.load(response)


@router.post("/sales-by-group")
def sales_by_group():
    try:
        data = _sales_by_group_rows()
    except SQLAlchemyError:
        return {
            "status": "error",
            "message": "Unable to fetch sales summary.",
            "data": None,
        }

    return {
        "status": "success",
        "message": "Sales summary fetched successfully!",
        "data": data,
    }


@router.post("/usd-inr")
def usd_inr():
    try:
        payload = _fetch_json(FRANKFURTER_URL)
    except URLError:
        return {
            "status": "error",
            "message": "Unable to fetch exchange rate.",
            "data": None,
        }

    rate = payload.get("rates", {}).get("INR")
    if rate is None:
        return {
            "status": "error",
            "message": "USD/INR rate unavailable.",
            "data": None,
        }

    return {
        "status": "success",
        "message": "Exchange rate fetched successfully!",
        "data": {
            "base": "USD",
            "quote": "INR",
            "rate": float(rate),
            "date": payload.get("date"),
        },
    }


@router.post("/brent-oil")
def brent_oil():
    try:
        payload = _fetch_json(BRENT_OIL_URL)
    except URLError:
        return {
            "status": "error",
            "message": "Unable to fetch Brent oil price.",
            "data": None,
        }

    try:
        meta = payload["chart"]["result"][0]["meta"]
    except (KeyError, IndexError, TypeError):
        return {
            "status": "error",
            "message": "Brent oil price unavailable.",
            "data": None,
        }

    price = meta.get("regularMarketPrice")
    if price is None:
        return {
            "status": "error",
            "message": "Brent oil price unavailable.",
            "data": None,
        }

    updated_at = None
    market_time = meta.get("regularMarketTime")
    if market_time:
        updated_at = datetime.fromtimestamp(market_time, tz=timezone.utc).isoformat()

    return {
        "status": "success",
        "message": "Brent oil price fetched successfully!",
        "data": {
            "symbol": meta.get("symbol", "BZ=F"),
            "name": "Brent Crude",
            "price": float(price),
            "currency": meta.get("currency", "USD"),
            "unit": "bbl",
            "updated_at": updated_at,
        },
    }
