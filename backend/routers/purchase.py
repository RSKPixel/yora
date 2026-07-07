from fastapi import APIRouter, Form
from core.dependencies import engine_mysql
from sqlalchemy import text, bindparam
from sqlalchemy.exc import SQLAlchemyError
import json
from fastapi import HTTPException
from datetime import date, datetime
from decimal import Decimal

router = APIRouter()


def _serialize_value(value):
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, Decimal):
        number = float(value)
        if number == int(number):
            return int(number)
        return number
    return value


def _serialize_row(row: dict) -> dict:
    return {key: _serialize_value(value) for key, value in row.items()}


@router.post("/update")
def update_purchase(
    purchase_id: str = Form(...),
    purchase_date: str = Form(...),
    vendor: str = Form(...),
    expenses: float = Form(...),
    details: str = Form(...),
):

    try:
        details = json.loads(details)

        if not isinstance(details, list):
            raise HTTPException(
                status_code=400,
                detail="Details must be a list",
            )

    except json.JSONDecodeError:
        return {
            "status": "error",
            "message": "Invalid details",
        }

    purchase_sql = text(
        """
        INSERT INTO yora_purchase
        (
            purchase_id,
            purchase_date,
            vendor,
            expenses
        )
        VALUES
        (
            :purchase_id,
            :purchase_date,
            :vendor,
            :expenses
        )
        ON DUPLICATE KEY UPDATE
            vendor = VALUES(vendor),
            expenses = VALUES(expenses)
        """
    )

    delete_details_sql = text(
        """
        DELETE FROM yora_purchase_details
        WHERE purchase_id = :purchase_id
          AND purchase_date = :purchase_date
        """
    )

    insert_detail_sql = text(
        """
        INSERT INTO yora_purchase_details
        (
            purchase_id,
            purchase_date,
            stock_item,
            qty,
            carton,
            qty_per_carton,
            item_count,
            item_no,
            list_price,
            cost_price,
            expenses,
            landing_cost,
            cost_with_gst,
            gst
        )
        VALUES
        (
            :purchase_id,
            :purchase_date,
            :stock_item,
            :qty,
            :carton,
            :qty_per_carton,
            :item_count,
            :item_no,
            :list_price,
            :cost_price,
            :expenses,
            :landing_cost,
            :cost_with_gst,
            :gst
        )
        """
    )

    detail_params = [
        {
            "purchase_id": purchase_id,
            "purchase_date": purchase_date,
            "stock_item": d["stock_item"],
            "qty": d["qty"],
            "carton": d["carton"],
            "qty_per_carton": d["qty_per_carton"],
            "item_count": d["item_count"],
            "item_no": d["item_no"],
            "list_price": d["list_price"],
            "cost_price": d["cost_price"],
            "expenses": d["expenses"],
            "landing_cost": d["landing_cost"],
            "cost_with_gst": d["cost_with_gst"],
            "gst": d["gst"],
        }
        for d in details
    ]

    try:
        with engine_mysql.begin() as connection:

            # Purchase Header
            connection.execute(
                purchase_sql,
                {
                    "purchase_id": purchase_id,
                    "purchase_date": purchase_date,
                    "vendor": vendor,
                    "expenses": expenses,
                },
            )

            # Remove Existing Details
            connection.execute(
                delete_details_sql,
                {
                    "purchase_id": purchase_id,
                    "purchase_date": purchase_date,
                },
            )

            # Insert Current Details
            if detail_params:
                connection.execute(
                    insert_detail_sql,
                    detail_params,
                )

        return {
            "status": "success",
            "message": "Purchase updated successfully!",
        }

    except Exception as e:
        print(e.args)
        return {
            "status": "error",
            "message": str(e.args),
        }


@router.post("/tally-details")
def tally_details(purchase_id: str = Form(...), purchase_date: str = Form(...)):
    sql = text(
        """
        SELECT
            p.stock_item,
            p.qty,
            p.carton_box,
            p.carton_box_qty,
            p.itemcount,
            p.itemno,
            p.rate,
            p.value,
            COALESCE(si.gst, 0) AS gst,
            si.hsn_code AS hsn_code
        FROM purchases p
        LEFT JOIN yora_stockitems si
            ON si.stock_item = p.stock_item
        WHERE p.vno = :purchase_id
          AND DATE(p.vdt) = :purchase_date
        ORDER BY p.itemno
        """
    )

    try:
        with engine_mysql.connect() as connection:
            rows = (
                connection.execute(
                    sql,
                    {"purchase_id": purchase_id, "purchase_date": purchase_date},
                )
                .mappings()
                .all()
            )

        if not rows:
            return {
                "status": "error",
                "message": "Purchase bill not found in Tally data.",
                "data": None,
            }

        purchase_details = []
        for row in rows:
            qty = float(row["qty"] or 0)
            if qty <= 0:
                continue

            carton_box = float(row["carton_box"] or 0)
            value = float(row["value"] or 0)
            cost_price = value / qty if qty else 0.0
            gst = float(row["gst"] or 0)
            expenses = 0.0
            landing_cost = cost_price + expenses

            purchase_details.append(
                {
                    "stock_item": row["stock_item"],
                    "qty": qty,
                    "carton": carton_box if carton_box > 0 else qty / 72,
                    "qty_per_carton": float(row["carton_box_qty"] or 0),
                    "item_count": row["itemcount"],
                    "item_no": row["itemno"],
                    "list_price": float(row["rate"] or 0),
                    "cost_price": cost_price,
                    "value": value,
                    "expenses": expenses,
                    "landing_cost": landing_cost,
                    "gst": gst,
                    "cost_with_gst": landing_cost * (1 + gst / 100),
                    "hsn_code": row["hsn_code"],
                }
            )

        return {
            "status": "success",
            "message": "Purchase details fetched successfully!",
            "data": purchase_details,
        }
    except Exception as e:
        print(e.args)
        return {
            "status": "error",
            "message": f"Unable to load Tally purchase details: {e}",
            "data": None,
        }


@router.post("/pending-purchase-bills")
@router.get("/pending-purchase-bills")
def pending_purchase_bills():
    sql = text(
        """
        SELECT
            p.vno AS purchase_id,
            DATE(p.vdt) AS purchase_date,
            p.ledger_name AS vendor,
            SUM(p.qty) AS qty
        FROM purchases p
        WHERE NOT EXISTS (
            SELECT 1
            FROM yora_purchase pc
            WHERE pc.purchase_id = p.vno
              AND pc.purchase_date = DATE(p.vdt)
        )
        GROUP BY p.vno, DATE(p.vdt), p.ledger_name
        ORDER BY purchase_date DESC, purchase_id DESC
        """
    )

    try:
        with engine_mysql.connect() as connection:
            rows = connection.execute(sql).mappings().all()

        pending_bills = [_serialize_row(dict(row)) for row in rows]

        return {
            "status": "success",
            "message": "Pending costing bills fetched successfully!",
            "data": pending_bills,
        }
    except Exception as e:
        print(e.args)
        return {
            "status": "error",
            "message": f"Unable to fetch pending purchase bills: {e}",
            "data": [],
        }


@router.post("/fetch")
def fetch_purchase(purchase_id: str = Form(...), purchase_date: str = Form(...)):
    sql = text(
        """
        SELECT p.*, sum(pd.qty) as qty, sum(pd.carton) as carton FROM yora_purchase p
        INNER JOIN yora_purchase_details pd
            ON p.purchase_id = pd.purchase_id
            AND p.purchase_date = pd.purchase_date
        WHERE p.purchase_id = :purchase_id
        AND p.purchase_date = :purchase_date
        GROUP BY p.purchase_id, p.purchase_date
    """
    )

    detail_sql = text(
        """
        SELECT * FROM yora_purchase_details
        WHERE purchase_id = :purchase_id
        AND purchase_date = :purchase_date
    """
    )

    with engine_mysql.connect() as connection:
        purchase_row = (
            connection.execute(
                sql, {"purchase_id": purchase_id, "purchase_date": purchase_date}
            )
            .mappings()
            .fetchone()
        )

        detail_rows = (
            connection.execute(
                detail_sql, {"purchase_id": purchase_id, "purchase_date": purchase_date}
            )
            .mappings()
            .fetchall()
        )

    # Handle no data case
    if not purchase_row:
        return {
            "status": "error",
            "message": "Purchase not found",
            "data": None,
        }

    purchase = dict(purchase_row)
    details = [dict(row) for row in detail_rows]

    purchase["details"] = details

    return {
        "status": "success",
        "message": "Purchase fetched successfully!",
        "data": purchase,
    }


@router.post("/list")
def purchase(
    date_from: str = Form(...),
    date_to: str = Form(...),
    include_details: bool = Form(True),
):

    purchase_sql = text(
        """
        SELECT p.*, sum(pd.qty) as qty, sum(pd.carton) as carton
        FROM yora_purchase p
        INNER JOIN yora_purchase_details pd
            ON p.purchase_id = pd.purchase_id
            AND p.purchase_date = pd.purchase_date
        WHERE p.purchase_date BETWEEN :date_from AND :date_to
        GROUP BY p.purchase_id, p.purchase_date
        ORDER BY p.purchase_date DESC, p.purchase_id DESC
    """
    )

    with engine_mysql.connect() as connection:
        result = (
            connection.execute(
                purchase_sql,
                {
                    "date_from": date_from,
                    "date_to": date_to,
                },
            )
            .mappings()
            .all()
        )

    purchases = [dict(row) for row in result]

    if not purchases:
        return {
            "status": "success",
            "message": "No purchases found",
            "data": [],
        }

    if include_details:

        purchase_ids = list({row["purchase_id"] for row in purchases})

        detail_sql = text(
            """
            SELECT *
            FROM yora_purchase_details
            WHERE purchase_id IN :purchase_ids
        """
        ).bindparams(
            bindparam(
                "purchase_ids",
                expanding=True,
            )
        )

        with engine_mysql.connect() as connection:
            detail_rows = (
                connection.execute(
                    detail_sql,
                    {
                        "purchase_ids": purchase_ids,
                    },
                )
                .mappings()
                .all()
            )

        detail_map = {}

        for row in detail_rows:
            row = dict(row)

            key = (
                row["purchase_id"],
                str(row["purchase_date"]),
            )

            detail_map.setdefault(
                key,
                [],
            ).append(row)

        for purchase in purchases:

            key = (
                purchase["purchase_id"],
                str(purchase["purchase_date"]),
            )

            purchase["details"] = detail_map.get(
                key,
                [],
            )

    return {
        "status": "success",
        "message": "Purchase fetched successfully!",
        "data": purchases,
    }


@router.post("/report")
def purchase_report(
    date_from: str = Form(...),
    date_to: str = Form(...),
    vendor: str = Form(...),
    group: str = Form(""),
):
    """Purchase quantities grouped by stock item for a vendor."""
    date_from = date_from.strip()
    date_to = date_to.strip()
    vendor = vendor.strip()
    group = group.strip()

    if not vendor:
        raise HTTPException(
            status_code=400,
            detail="Vendor is required.",
        )

    if date_from > date_to:
        raise HTTPException(
            status_code=400,
            detail="From date cannot be after to date.",
        )

    group_filter = "AND TRIM(si.parent) = :group" if group else ""

    report_sql = text(
        f"""
        SELECT
            pd.stock_item,
            COALESCE(SUM(pd.carton), 0) AS carton,
            COALESCE(SUM(pd.qty), 0) AS qty,
            CASE
                WHEN COALESCE(SUM(pd.qty), 0) > 0
                THEN SUM(pd.qty * COALESCE(pd.list_price, 0)) / SUM(pd.qty)
                ELSE NULL
            END AS list_price
        FROM yora_purchase p
        INNER JOIN yora_purchase_details pd
            ON pd.purchase_id = p.purchase_id
            AND pd.purchase_date = p.purchase_date
        INNER JOIN yora_stockitems si
            ON si.stock_item = pd.stock_item
        WHERE p.purchase_date BETWEEN :date_from AND :date_to
          AND p.vendor = :vendor
          {group_filter}
        GROUP BY pd.stock_item
        ORDER BY pd.stock_item ASC
        """
    )

    try:
        with engine_mysql.connect() as connection:
            rows = (
                connection.execute(
                    report_sql,
                    {
                        "date_from": date_from,
                        "date_to": date_to,
                        "vendor": vendor,
                        "group": group,
                    },
                )
                .mappings()
                .all()
            )
    except SQLAlchemyError as exc:
        raise HTTPException(
            status_code=500,
            detail="Unable to generate purchase report. Please try again later.",
        ) from exc

    report_rows = [_serialize_row(dict(row)) for row in rows]
    totals = {
        "carton": sum(float(row.get("carton") or 0) for row in report_rows),
        "qty": sum(float(row.get("qty") or 0) for row in report_rows),
    }

    return {
        "status": "success",
        "message": (
            "Purchase report generated."
            if report_rows
            else "No purchases found for the selected filters."
        ),
        "data": {
            "date_from": date_from,
            "date_to": date_to,
            "vendor": vendor,
            "group": group,
            "rows": report_rows,
            "totals": totals,
            "summary": {
                "row_count": len(report_rows),
            },
        },
    }
