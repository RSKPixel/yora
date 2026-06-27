"""
FIFO stock valuation from movement sources.

Add future inbound/outbound sources (credit notes, production, etc.) to
MOVEMENT_SOURCES without changing the FIFO engine.
"""

from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from typing import Any, Protocol

from sqlalchemy import bindparam, text
from sqlalchemy.engine import Connection


@dataclass(frozen=True)
class StockMovement:
    stock_item: str
    movement_date: str
    qty: Decimal
    unit_cost: Decimal | None
    movement_type: str
    sort_primary: int
    sort_secondary: int


class MovementSource(Protocol):
    movement_type: str

    def fetch(
        self,
        connection: Connection,
        date_to: str,
        stock_items: list[str] | None = None,
    ) -> list[StockMovement]:
        ...


def _stock_item_filter_clause(stock_items: list[str] | None) -> str:
    if not stock_items:
        return ""
    return " AND stock_item IN :stock_items"


def _date_to_filter(column: str, date_to: str) -> str:
    return f"{column} <= :date_to" if date_to else "1 = 1"


def _movement_query_params(
    *,
    date_to: str,
    movement_type: str,
    stock_items: list[str] | None,
) -> dict[str, Any]:
    params: dict[str, Any] = {"movement_type": movement_type}
    if date_to:
        params["date_to"] = date_to
    if stock_items:
        params["stock_items"] = stock_items
    return params


def _dec(value: Any) -> Decimal:
    if value is None or value == "":
        return Decimal("0")
    return Decimal(str(value))


def _row_to_movement(
    row: Any,
    *,
    qty_multiplier: Decimal = Decimal("1"),
) -> StockMovement:
    return StockMovement(
        stock_item=row["stock_item"] or "",
        movement_date=str(row["movement_date"]),
        qty=_dec(row["qty"]) * qty_multiplier,
        unit_cost=(
            _dec(row["unit_cost"])
            if row["unit_cost"] is not None
            else None
        ),
        movement_type=row["movement_type"],
        sort_primary=int(row["sort_primary"] or 0),
        sort_secondary=int(row["sort_secondary"] or 0),
    )


class OpeningStockMovementSource:
    movement_type = "opening"

    def fetch(
        self,
        connection: Connection,
        date_to: str,
        stock_items: list[str] | None = None,
    ) -> list[StockMovement]:
        # Use opening_rate when present; future sources can supply their own unit cost.
        sql = text(
            f"""
            SELECT
                stock_item,
                opening_date AS movement_date,
                qty,
                COALESCE(opening_rate, 0) AS unit_cost,
                :movement_type AS movement_type,
                id AS sort_primary,
                0 AS sort_secondary
            FROM yora_opening_stock
            WHERE { _date_to_filter("opening_date", date_to) }
            {_stock_item_filter_clause(stock_items)}
            """
        )
        query_params = _movement_query_params(
            date_to=date_to,
            movement_type=self.movement_type,
            stock_items=stock_items,
        )
        if stock_items:
            sql = sql.bindparams(bindparam("stock_items", expanding=True))
        rows = connection.execute(sql, query_params).mappings()
        return [_row_to_movement(row) for row in rows]


class PurchaseMovementSource:
    movement_type = "purchase"

    def fetch(
        self,
        connection: Connection,
        date_to: str,
        stock_items: list[str] | None = None,
    ) -> list[StockMovement]:
        sql = text(
            f"""
            SELECT
                stock_item,
                purchase_date AS movement_date,
                qty,
                landing_cost AS unit_cost,
                :movement_type AS movement_type,
                purchase_id AS sort_primary,
                item_no AS sort_secondary
            FROM yora_purchase_details
            WHERE {_date_to_filter("purchase_date", date_to)}
            {_stock_item_filter_clause(stock_items)}
            """
        )
        if stock_items:
            sql = sql.bindparams(bindparam("stock_items", expanding=True))
        rows = connection.execute(
            sql,
            _movement_query_params(
                date_to=date_to,
                movement_type=self.movement_type,
                stock_items=stock_items,
            ),
        ).mappings()
        return [_row_to_movement(row) for row in rows]


class SalesMovementSource:
    movement_type = "sale"

    def fetch(
        self,
        connection: Connection,
        date_to: str,
        stock_items: list[str] | None = None,
    ) -> list[StockMovement]:
        sql = text(
            f"""
            SELECT
                stock_item,
                invoice_date AS movement_date,
                qty,
                NULL AS unit_cost,
                :movement_type AS movement_type,
                invoice_no AS sort_primary,
                item_no AS sort_secondary
            FROM yora_sales
            WHERE {_date_to_filter("invoice_date", date_to)}
            {_stock_item_filter_clause(stock_items)}
            """
        )
        if stock_items:
            sql = sql.bindparams(bindparam("stock_items", expanding=True))
        rows = connection.execute(
            sql,
            _movement_query_params(
                date_to=date_to,
                movement_type=self.movement_type,
                stock_items=stock_items,
            ),
        ).mappings()
        return [_row_to_movement(row, qty_multiplier=Decimal("-1")) for row in rows]


# Register additional sources here, for example:
# - CreditNoteMovementSource (sales returns as inbound, purchase returns as outbound)
# - ProductionMovementSource (finished goods in, raw materials out)
MOVEMENT_SOURCES: list[MovementSource] = [
    OpeningStockMovementSource(),
    PurchaseMovementSource(),
    SalesMovementSource(),
]


def fetch_movements(
    connection: Connection,
    date_to: str,
    stock_items: list[str] | None = None,
) -> list[StockMovement]:
    movements: list[StockMovement] = []
    for source in MOVEMENT_SOURCES:
        movements.extend(source.fetch(connection, date_to, stock_items))
    return movements


def _movement_sort_key(movement: StockMovement) -> tuple[str, int, int, str]:
    return (
        movement.movement_date,
        movement.sort_primary,
        movement.sort_secondary,
        movement.movement_type,
    )


def compute_fifo_avg_price(movements: list[StockMovement]) -> float | None:
    """Return weighted-average unit cost of FIFO remaining layers."""
    if not movements:
        return None

    ordered = sorted(movements, key=_movement_sort_key)
    layers: list[list[Decimal]] = []

    for movement in ordered:
        if movement.qty > 0:
            unit_cost = (
                movement.unit_cost
                if movement.unit_cost is not None
                else Decimal("0")
            )
            layers.append([movement.qty, unit_cost])
            continue

        if movement.qty == 0:
            continue

        remaining = -movement.qty
        while remaining > 0 and layers:
            layer_qty, layer_cost = layers[0]
            if layer_qty <= remaining:
                remaining -= layer_qty
                layers.pop(0)
            else:
                layers[0][0] = layer_qty - remaining
                remaining = Decimal("0")

    total_qty = sum(layer[0] for layer in layers)
    if total_qty <= 0:
        return None

    total_value = sum(layer[0] * layer[1] for layer in layers)
    return float(total_value / total_qty)


def compute_fifo_avg_prices_by_item(
    connection: Connection,
    *,
    date_to: str,
    stock_items: list[str] | None = None,
) -> dict[str, float | None]:
    """Compute FIFO average price at date_to for each stock item."""
    item_filter = {item for item in stock_items if item} if stock_items else None
    grouped: dict[str, list[StockMovement]] = {}

    for movement in fetch_movements(connection, date_to, stock_items):
        if not movement.stock_item:
            continue
        if item_filter is not None and movement.stock_item not in item_filter:
            continue
        grouped.setdefault(movement.stock_item, []).append(movement)

    return {
        stock_item: compute_fifo_avg_price(item_movements)
        for stock_item, item_movements in grouped.items()
    }
