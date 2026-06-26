import json
from datetime import datetime, timezone
from urllib.error import URLError
from urllib.request import Request, urlopen

from fastapi import APIRouter

router = APIRouter()

FRANKFURTER_URL = "https://api.frankfurter.app/latest?from=USD&to=INR"
BRENT_OIL_URL = "https://query1.finance.yahoo.com/v8/finance/chart/BZ=F?interval=1d&range=1d"
USER_AGENT = "YoraERP/1.0"


def _fetch_json(url: str) -> dict:
    request = Request(url, headers={"User-Agent": USER_AGENT})
    with urlopen(request, timeout=10) as response:
        return json.load(response)


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
