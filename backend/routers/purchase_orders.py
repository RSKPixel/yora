import json
from datetime import date, datetime
from decimal import Decimal
from typing import Any, Optional

from fastapi import APIRouter, Form, HTTPException
from sqlalchemy import bindparam, text
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

from core.dependencies import engine_mysql

router = APIRouter()

PO_STATUS_OPEN = "Open"
PO_STATUS_PARTIAL_COMPLETE = "Partial Complete"
PO_STATUS_SUPPLY_COMPLETE = "Supply Complete"
PO_STATUS_DISPUTED = "Disputed"
PO_STATUS_ON_HOLD = "On Hold"
PO_STATUS_CANCELLED = "Cancelled"

PO_STATUSES = (
    PO_STATUS_OPEN,
    PO_STATUS_PARTIAL_COMPLETE,
    PO_STATUS_SUPPLY_COMPLETE,
    PO_STATUS_DISPUTED,
    PO_STATUS_ON_HOLD,
    PO_STATUS_CANCELLED,
)

DEFAULT_PO_STATUS = PO_STATUS_OPEN
SHORTAGE_TOLERANCE_PCT = 5.0


def _normalize_status(status: Optional[str]) -> str:
    value = (status or DEFAULT_PO_STATUS).strip()
    if value not in PO_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status. Choose one of: {', '.join(PO_STATUSES)}.",
        )
    return value


def _null_if_empty(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    stripped = value.strip()
    return stripped or None


def _to_float(value: Any) -> Optional[float]:
    if value is None or value == "":
        return None
    return float(value)


def _serialize_value(value: Any) -> Any:
    if isinstance(value, Decimal):
        number = float(value)
        if number == int(number):
            return str(int(number))
        return str(number)
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    return value


def _serialize_line(row: dict) -> dict:
    return {
        "stock_item": row["stock_item"] or "",
        "parent": (row["parent"] or "").strip(),
        "unit": row["unit"] or "",
        "hsn_code": row["hsn_code"] or "",
        "qty": _serialize_value(row["qty"]) or "",
        "unit_price": _serialize_value(row["unit_price"]) or "",
        "discount_pct": _serialize_value(row.get("discount_pct")) or "",
        "gst": _serialize_value(row["gst"]) or "",
        "description": row["description"] or "",
    }


def _serialize_order(header: dict, details: list[dict]) -> dict:
    return {
        "po_no": header["po_no"],
        "po_date": str(header["po_date"])[:10],
        "vendor": header["vendor"],
        "vendor_quotation_no": header.get("vendor_quotation_no") or "",
        "shipping": header["shipping"] or "",
        "insurance": header["insurance"] or "",
        "payment_terms": header["payment_terms"] or "",
        "delivery_terms": header["delivery_terms"] or "",
        "status": header.get("status") or DEFAULT_PO_STATUS,
        "created_at": _serialize_value(header.get("created_at")),
        "updated_at": _serialize_value(header.get("updated_at")),
        "details": [_serialize_line(row) for row in details],
    }


def _parse_details(raw_details: str) -> list[dict]:
    try:
        details = json.loads(raw_details)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail="Invalid details JSON.") from exc

    if not isinstance(details, list) or not details:
        raise HTTPException(
            status_code=400,
            detail="Add at least one line item with quantity.",
        )

    parsed: list[dict] = []
    for line in details:
        if not isinstance(line, dict):
            raise HTTPException(status_code=400, detail="Each detail must be an object.")

        stock_item = (line.get("stock_item") or "").strip()
        qty = _to_float(line.get("qty"))
        if not stock_item or qty is None or qty <= 0:
            continue

        unit_price = _to_float(line.get("unit_price"))
        discount_pct = _to_float(line.get("discount_pct"))
        gst = _to_float(line.get("gst"))
        if discount_pct is not None and (discount_pct < 0 or discount_pct > 100):
            raise HTTPException(
                status_code=400,
                detail="Discount must be between 0 and 100.",
            )
        if gst is not None and gst < 0:
            raise HTTPException(status_code=400, detail="GST cannot be negative.")

        parsed.append(
            {
                "stock_item": stock_item,
                "parent": _null_if_empty(line.get("parent")),
                "unit": _null_if_empty(line.get("unit")),
                "hsn_code": _null_if_empty(line.get("hsn_code")),
                "qty": qty,
                "unit_price": unit_price,
                "discount_pct": discount_pct,
                "gst": gst,
                "description": _null_if_empty(line.get("description")),
            }
        )

    if not parsed:
        raise HTTPException(
            status_code=400,
            detail="Add at least one line item with quantity.",
        )

    for index, line in enumerate(parsed, start=1):
        line["line_no"] = index

    return parsed


def _parse_po_date(po_date: str) -> date:
    try:
        return date.fromisoformat(str(po_date).strip()[:10])
    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail="Invalid purchase order date.",
        ) from exc


def _indian_fy_code(d: date) -> str:
    """Indian FY code: Apr–Mar → e.g. 2025-04-01 → 2526."""
    start_year = d.year if d.month >= 4 else d.year - 1
    return f"{start_year % 100:02d}{(start_year + 1) % 100:02d}"


def _next_po_no(connection, po_date: date) -> str:
    """Format: PO/{FY}/{running} e.g. PO/2526/0001."""
    prefix = f"PO/{_indian_fy_code(po_date)}/"
    row = (
        connection.execute(
            text(
                """
                SELECT po_no
                FROM yora_purchase_order
                WHERE po_no LIKE :prefix
                ORDER BY po_no DESC
                LIMIT 1
                """
            ),
            {"prefix": f"{prefix}%"},
        )
        .mappings()
        .first()
    )

    if not row:
        return f"{prefix}0001"

    seq = int(str(row["po_no"])[len(prefix) :])
    return f"{prefix}{seq + 1:04d}"


def _vendor_exists(connection, vendor: str) -> bool:
    """yora_ledger is a view — validate vendor name at save time."""
    row = connection.execute(
        text("SELECT 1 FROM yora_ledger WHERE name = :vendor LIMIT 1"),
        {"vendor": vendor},
    ).first()
    return row is not None


def _fetch_order(connection, po_no: str) -> Optional[dict]:
    header = (
        connection.execute(
            text(
                """
                SELECT
                    po_no,
                    po_date,
                    vendor,
                    vendor_quotation_no,
                    shipping,
                    insurance,
                    payment_terms,
                    delivery_terms,
                    status,
                    created_at,
                    updated_at
                FROM yora_purchase_order
                WHERE po_no = :po_no
                LIMIT 1
                """
            ),
            {"po_no": po_no},
        )
        .mappings()
        .first()
    )
    if not header:
        return None

    details = (
        connection.execute(
            text(
                """
                SELECT
                    stock_item,
                    parent,
                    unit,
                    hsn_code,
                    qty,
                    unit_price,
                    discount_pct,
                    gst,
                    description
                FROM yora_purchase_order_details
                WHERE po_no = :po_no
                ORDER BY line_no
                """
            ),
            {"po_no": po_no},
        )
        .mappings()
        .all()
    )

    return _serialize_order(dict(header), [dict(row) for row in details])


def _save_order(
    *,
    po_no: Optional[str],
    po_date: str,
    vendor: str,
    vendor_quotation_no: str,
    shipping: str,
    insurance: str,
    payment_terms: str,
    delivery_terms: str,
    status: str,
    details: list[dict],
) -> dict:
    vendor = vendor.strip()
    if not vendor:
        raise HTTPException(status_code=400, detail="Vendor is required.")
    if not po_date:
        raise HTTPException(status_code=400, detail="Purchase order date is required.")

    parsed_po_date = _parse_po_date(po_date)

    insert_header_sql = text(
        """
        INSERT INTO yora_purchase_order (
            po_no,
            po_date,
            vendor,
            vendor_quotation_no,
            shipping,
            insurance,
            payment_terms,
            delivery_terms,
            status
        )
        VALUES (
            :po_no,
            :po_date,
            :vendor,
            :vendor_quotation_no,
            :shipping,
            :insurance,
            :payment_terms,
            :delivery_terms,
            :status
        )
        """
    )

    update_header_sql = text(
        """
        UPDATE yora_purchase_order
        SET
            po_date = :po_date,
            vendor = :vendor,
            vendor_quotation_no = :vendor_quotation_no,
            shipping = :shipping,
            insurance = :insurance,
            payment_terms = :payment_terms,
            delivery_terms = :delivery_terms,
            status = :status
        WHERE po_no = :po_no
        """
    )

    delete_details_sql = text(
        """
        DELETE FROM yora_purchase_order_details
        WHERE po_no = :po_no
        """
    )

    insert_detail_sql = text(
        """
        INSERT INTO yora_purchase_order_details (
            po_no,
            line_no,
            stock_item,
            parent,
            unit,
            hsn_code,
            qty,
            unit_price,
            discount_pct,
            gst,
            description
        )
        VALUES (
            :po_no,
            :line_no,
            :stock_item,
            :parent,
            :unit,
            :hsn_code,
            :qty,
            :unit_price,
            :discount_pct,
            :gst,
            :description
        )
        """
    )

    header_params = {
        "po_date": po_date,
        "vendor": vendor,
        "vendor_quotation_no": _null_if_empty(vendor_quotation_no),
        "shipping": _null_if_empty(shipping),
        "insurance": _null_if_empty(insurance),
        "payment_terms": _null_if_empty(payment_terms),
        "delivery_terms": _null_if_empty(delivery_terms),
        "status": _normalize_status(status),
    }

    try:
        with engine_mysql.begin() as connection:
            if not _vendor_exists(connection, vendor):
                raise HTTPException(status_code=400, detail="Vendor not found in ledger.")

            is_update = bool(po_no and po_no.strip())
            target_po_no = (
                po_no.strip()
                if is_update
                else _next_po_no(connection, parsed_po_date)
            )

            if is_update:
                existing = connection.execute(
                    text(
                        """
                        SELECT po_no
                        FROM yora_purchase_order
                        WHERE po_no = :po_no
                        LIMIT 1
                        """
                    ),
                    {"po_no": target_po_no},
                ).first()
                if not existing:
                    raise HTTPException(status_code=404, detail="Purchase order not found.")

                connection.execute(
                    update_header_sql,
                    {"po_no": target_po_no, **header_params},
                )
            else:
                connection.execute(
                    insert_header_sql,
                    {"po_no": target_po_no, **header_params},
                )

            connection.execute(delete_details_sql, {"po_no": target_po_no})

            for line in details:
                connection.execute(
                    insert_detail_sql,
                    {
                        "po_no": target_po_no,
                        **line,
                    },
                )

            saved = _fetch_order(connection, target_po_no)
    except HTTPException:
        raise
    except IntegrityError as exc:
        raise HTTPException(
            status_code=400,
            detail="Unable to save purchase order. Check vendor and line items.",
        ) from exc
    except SQLAlchemyError as exc:
        raise HTTPException(
            status_code=500,
            detail="Unable to save purchase order. Please try again later.",
        ) from exc

    if not saved:
        raise HTTPException(
            status_code=500,
            detail="Purchase order saved but could not be loaded.",
        )

    return saved


@router.post("/list")
def list_purchase_orders(
    date_from: str = Form(""),
    date_to: str = Form(""),
):
    filters = []
    params: dict[str, str] = {}

    if date_from.strip():
        filters.append("po.po_date >= :date_from")
        params["date_from"] = date_from.strip()
    if date_to.strip():
        filters.append("po.po_date <= :date_to")
        params["date_to"] = date_to.strip()

    where_clause = f"WHERE {' AND '.join(filters)}" if filters else ""

    header_sql = text(
        f"""
        SELECT
            po.po_no,
            po.po_date,
            po.vendor,
            po.vendor_quotation_no,
            po.shipping,
            po.insurance,
            po.payment_terms,
            po.delivery_terms,
            po.status,
            po.created_at,
            po.updated_at
        FROM yora_purchase_order po
        {where_clause}
        ORDER BY po.po_date DESC, po.po_no DESC
        """
    )

    detail_sql = text(
        """
        SELECT
            po_no,
            stock_item,
            parent,
            unit,
            hsn_code,
            qty,
            unit_price,
            discount_pct,
            gst,
            description
        FROM yora_purchase_order_details
        WHERE po_no IN :po_numbers
        ORDER BY po_no, line_no
        """
    ).bindparams(bindparam("po_numbers", expanding=True))

    try:
        with engine_mysql.connect() as connection:
            headers = connection.execute(header_sql, params).mappings().all()
            if not headers:
                return {
                    "status": "success",
                    "message": "No purchase orders found.",
                    "data": [],
                }

            po_numbers = [row["po_no"] for row in headers]
            detail_rows = connection.execute(
                detail_sql,
                {"po_numbers": po_numbers},
            ).mappings().all()

            detail_map: dict[str, list[dict]] = {}
            for row in detail_rows:
                row_dict = dict(row)
                po_number = row_dict.pop("po_no")
                detail_map.setdefault(po_number, []).append(row_dict)

            orders = [
                _serialize_order(dict(header), detail_map.get(header["po_no"], []))
                for header in headers
            ]
    except SQLAlchemyError as exc:
        raise HTTPException(
            status_code=500,
            detail="Unable to load purchase orders. Please try again later.",
        ) from exc

    return {
        "status": "success",
        "message": "Purchase orders fetched successfully.",
        "data": orders,
    }


@router.post("/fetch")
def fetch_purchase_order(po_no: str = Form(...)):
    po_no = po_no.strip()
    if not po_no:
        raise HTTPException(status_code=400, detail="Purchase order number is required.")

    try:
        with engine_mysql.connect() as connection:
            order = _fetch_order(connection, po_no)
    except SQLAlchemyError as exc:
        raise HTTPException(
            status_code=500,
            detail="Unable to load purchase order. Please try again later.",
        ) from exc

    if not order:
        return {
            "status": "error",
            "message": "Purchase order not found.",
            "data": None,
        }

    return {
        "status": "success",
        "message": "Purchase order fetched successfully.",
        "data": order,
    }


@router.post("/save")
def save_purchase_order(
    po_no: str = Form(""),
    po_date: str = Form(...),
    vendor: str = Form(...),
    vendor_quotation_no: str = Form(""),
    shipping: str = Form(""),
    insurance: str = Form(""),
    payment_terms: str = Form(""),
    delivery_terms: str = Form(""),
    status: str = Form(DEFAULT_PO_STATUS),
    details: str = Form(...),
):
    parsed_details = _parse_details(details)
    saved = _save_order(
        po_no=po_no,
        po_date=po_date,
        vendor=vendor,
        vendor_quotation_no=vendor_quotation_no,
        shipping=shipping,
        insurance=insurance,
        payment_terms=payment_terms,
        delivery_terms=delivery_terms,
        status=status,
        details=parsed_details,
    )

    message = (
        f"Purchase order {saved['po_no']} updated."
        if po_no.strip()
        else f"Purchase order {saved['po_no']} saved."
    )

    return {
        "status": "success",
        "message": message,
        "data": saved,
    }


def _qty_number(value: Any) -> float:
    if value is None or value == "":
        return 0.0
    return float(value)


def _form_bool(value: Optional[str]) -> bool:
    return (value or "").strip().lower() in ("true", "1", "yes", "on")


def _should_exclude_by_shortage_filter(
    po_qty: float, shortage: float, tolerance_pct: float
) -> bool:
    """Exclude items with no shortage or shortage up to tolerance_pct."""
    if shortage <= 0:
        return True
    if po_qty <= 0:
        return False
    return (shortage / po_qty) * 100 <= tolerance_pct


@router.post("/vendors")
def list_report_vendors():
    """Vendors that appear in purchase orders or purchases."""
    vendor_sql = text(
        """
        SELECT vendor
        FROM yora_purchase_order
        WHERE vendor IS NOT NULL AND TRIM(vendor) != ''
        UNION
        SELECT vendor
        FROM yora_purchase
        WHERE vendor IS NOT NULL AND TRIM(vendor) != ''
        ORDER BY vendor
        """
    )

    try:
        with engine_mysql.connect() as connection:
            rows = connection.execute(vendor_sql).mappings().all()
    except SQLAlchemyError as exc:
        raise HTTPException(
            status_code=500,
            detail="Unable to load vendors. Please try again later.",
        ) from exc

    vendors = [row["vendor"] for row in rows if row.get("vendor")]

    return {
        "status": "success",
        "message": "Vendors fetched successfully.",
        "data": vendors,
    }


@router.post("/report")
def purchase_order_report(
    vendor: str = Form(...),
    po_no: str = Form(""),
    po_date_from: str = Form(""),
    po_date_to: str = Form(""),
    purchase_date_from: str = Form(""),
    purchase_date_to: str = Form(""),
    exclude_shortage_upto_5: str = Form(""),
):
    """Compare PO line quantities with purchases for the same vendor and item."""
    vendor = vendor.strip()
    if not vendor:
        raise HTTPException(status_code=400, detail="Vendor is required.")

    exclude_minor_shortage = _form_bool(exclude_shortage_upto_5)

    filters = ["po.vendor = :vendor"]
    params: dict[str, str] = {"vendor": vendor}

    po_no = po_no.strip()
    if po_no:
        filters.append("po.po_no = :po_no")
        params["po_no"] = po_no
    if po_date_from.strip():
        filters.append("po.po_date >= :po_date_from")
        params["po_date_from"] = po_date_from.strip()
    if po_date_to.strip():
        filters.append("po.po_date <= :po_date_to")
        params["po_date_to"] = po_date_to.strip()

    where_clause = f"WHERE {' AND '.join(filters)}"

    line_sql = text(
        f"""
        SELECT
            po.po_no,
            po.po_date,
            pod.stock_item,
            pod.unit,
            pod.qty AS po_qty
        FROM yora_purchase_order po
        INNER JOIN yora_purchase_order_details pod
            ON pod.po_no = po.po_no
        {where_clause}
        ORDER BY pod.stock_item, po.po_date, po.po_no
        """
    )

    purchase_filters = [
        "p.vendor = :vendor",
        "po_min.stock_item = pd.stock_item",
        "p.purchase_date >= po_min.min_po_date",
    ]
    if purchase_date_from.strip():
        purchase_filters.append("p.purchase_date >= :purchase_date_from")
        params["purchase_date_from"] = purchase_date_from.strip()
    if purchase_date_to.strip():
        purchase_filters.append("p.purchase_date <= :purchase_date_to")
        params["purchase_date_to"] = purchase_date_to.strip()

    purchase_where = " AND ".join(purchase_filters)

    purchase_sql = text(
        f"""
        SELECT
            pd.stock_item,
            COALESCE(SUM(pd.qty), 0) AS received_qty
        FROM yora_purchase p
        INNER JOIN yora_purchase_details pd
            ON pd.purchase_id = p.purchase_id
            AND pd.purchase_date = p.purchase_date
        INNER JOIN (
            SELECT
                pod.stock_item,
                MIN(po.po_date) AS min_po_date
            FROM yora_purchase_order po
            INNER JOIN yora_purchase_order_details pod
                ON pod.po_no = po.po_no
            {where_clause}
            GROUP BY pod.stock_item
        ) po_min
            ON po_min.stock_item = pd.stock_item
        WHERE {purchase_where}
        GROUP BY pd.stock_item
        """
    )

    po_ref_sql = text(
        f"""
        SELECT
            po.po_no,
            po.po_date,
            po.vendor_quotation_no
        FROM yora_purchase_order po
        {where_clause}
        ORDER BY po.po_date, po.po_no
        """
    )

    try:
        with engine_mysql.connect() as connection:
            line_rows = connection.execute(line_sql, params).mappings().all()
            purchase_rows = (
                connection.execute(purchase_sql, params).mappings().all()
                if line_rows
                else []
            )
            po_ref_rows = connection.execute(po_ref_sql, params).mappings().all()
    except SQLAlchemyError as exc:
        raise HTTPException(
            status_code=500,
            detail="Unable to generate purchase order report. Please try again later.",
        ) from exc

    received_by_item = {
        row["stock_item"]: _qty_number(row["received_qty"]) for row in purchase_rows
    }

    grouped: dict[str, dict[str, Any]] = {}
    po_numbers: set[str] = set()

    for row in line_rows:
        stock_item = row["stock_item"] or ""
        po_numbers.add(row["po_no"])

        if stock_item not in grouped:
            grouped[stock_item] = {
                "stock_item": stock_item,
                "unit": row["unit"] or "",
                "po_numbers": set(),
                "po_qty": 0.0,
            }

        entry = grouped[stock_item]
        entry["po_numbers"].add(row["po_no"])
        entry["po_qty"] += _qty_number(row["po_qty"])
        if not entry["unit"] and row["unit"]:
            entry["unit"] = row["unit"]

    report_rows: list[dict] = []
    totals = {
        "po_qty": 0.0,
        "received_qty": 0.0,
        "excess": 0.0,
        "shortage": 0.0,
    }

    for stock_item in sorted(grouped):
        entry = grouped[stock_item]
        po_qty = entry["po_qty"]
        received_qty = received_by_item.get(stock_item, 0.0)
        variance = received_qty - po_qty
        excess = variance if variance > 0 else 0.0
        shortage = -variance if variance < 0 else 0.0
        no_of_po = len(entry["po_numbers"])

        if exclude_minor_shortage and _should_exclude_by_shortage_filter(
            po_qty, shortage, SHORTAGE_TOLERANCE_PCT
        ):
            continue

        totals["po_qty"] += po_qty
        totals["received_qty"] += received_qty
        totals["excess"] += excess
        totals["shortage"] += shortage

        report_rows.append(
            {
                "stock_item": stock_item,
                "unit": entry["unit"],
                "no_of_po": no_of_po,
                "po_qty": _serialize_value(po_qty),
                "received_qty": _serialize_value(received_qty),
                "excess": _serialize_value(excess),
                "shortage": _serialize_value(shortage),
            }
        )

    po_references = [
        {
            "po_no": row["po_no"],
            "po_date": str(row["po_date"])[:10],
            "vendor_quotation_no": row.get("vendor_quotation_no") or "",
        }
        for row in po_ref_rows
    ]

    return {
        "status": "success",
        "message": (
            "Purchase order report generated."
            if report_rows
            else "No purchase order lines found for the selected filters."
        ),
        "data": {
            "vendor": vendor,
            "po_references": po_references,
            "rows": report_rows,
            "totals": {key: _serialize_value(value) for key, value in totals.items()},
            "summary": {
                "po_count": len(po_numbers),
                "item_count": len(report_rows),
                "exclude_shortage_upto_5": exclude_minor_shortage,
            },
        },
    }


@router.post("/delete")
def delete_purchase_order(po_no: str = Form(...)):
    po_no = po_no.strip()
    if not po_no:
        raise HTTPException(status_code=400, detail="Purchase order number is required.")

    delete_sql = text(
        """
        DELETE FROM yora_purchase_order
        WHERE po_no = :po_no
        """
    )

    try:
        with engine_mysql.begin() as connection:
            result = connection.execute(delete_sql, {"po_no": po_no})
            if result.rowcount == 0:
                return {
                    "status": "error",
                    "message": "Purchase order not found.",
                }
    except SQLAlchemyError as exc:
        raise HTTPException(
            status_code=500,
            detail="Unable to delete purchase order. Please try again later.",
        ) from exc

    return {
        "status": "success",
        "message": f"Purchase order {po_no} deleted.",
    }
