"""
Renumber existing purchase orders to PO/{FY}/{####} (Indian FY, slash separators).

Example: PO/2526/0001

Safe two-phase update to avoid unique-key collisions.
Details rows follow via ON UPDATE CASCADE on fk_yora_purchase_order_details_po_no.
"""

import sys
from collections import defaultdict
from datetime import date
from pathlib import Path

from sqlalchemy import text

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from core.dependencies import engine_mysql  # noqa: E402
from routers.purchase_orders import _indian_fy_code  # noqa: E402


def _already_formatted(po_no: str) -> bool:
    parts = str(po_no).split("/")
    if len(parts) != 3:
        return False
    if parts[0] != "PO" or len(parts[1]) != 4 or not parts[1].isdigit():
        return False
    return parts[2].isdigit() and len(parts[2]) == 4


def renumber_purchase_orders(*, dry_run: bool = False) -> None:
    with engine_mysql.begin() as conn:
        rows = (
            conn.execute(
                text(
                    """
                    SELECT id, po_no, po_date
                    FROM yora_purchase_order
                    ORDER BY po_date ASC, id ASC
                    """
                )
            )
            .mappings()
            .all()
        )

        if not rows:
            print("No purchase orders to renumber.")
            return

        by_fy: dict[str, list] = defaultdict(list)
        for row in rows:
            po_date = row["po_date"]
            if isinstance(po_date, date):
                fy = _indian_fy_code(po_date)
            else:
                fy = _indian_fy_code(date.fromisoformat(str(po_date)[:10]))
            by_fy[fy].append(row)

        mapping: list[tuple[str, str, int]] = []
        for fy in sorted(by_fy.keys()):
            for index, row in enumerate(by_fy[fy], start=1):
                new_po_no = f"PO/{fy}/{index:04d}"
                old_po_no = row["po_no"]
                if old_po_no == new_po_no:
                    continue
                mapping.append((old_po_no, new_po_no, row["id"]))

        if not mapping:
            print("All purchase orders already use PO/FY/#### format.")
            return

        print(f"{'Dry-run: would renumber' if dry_run else 'Renumbering'} {len(mapping)} purchase order(s):")
        for old_po_no, new_po_no, _row_id in mapping:
            print(f"  {old_po_no} -> {new_po_no}")

        if dry_run:
            return

        # Phase 1: move to temporary unique keys (avoids unique collisions).
        for _old_po_no, _new_po_no, row_id in mapping:
            temp_po_no = f"__TMP_PO__{row_id}"
            conn.execute(
                text(
                    """
                    UPDATE yora_purchase_order
                    SET po_no = :temp_po_no
                    WHERE id = :id
                    """
                ),
                {"temp_po_no": temp_po_no, "id": row_id},
            )

        # Phase 2: assign final PO/FY/#### numbers.
        for _old_po_no, new_po_no, row_id in mapping:
            conn.execute(
                text(
                    """
                    UPDATE yora_purchase_order
                    SET po_no = :new_po_no
                    WHERE id = :id
                    """
                ),
                {"new_po_no": new_po_no, "id": row_id},
            )

        print("Renumber complete. Detail lines updated via ON UPDATE CASCADE.")


if __name__ == "__main__":
    dry = "--dry-run" in sys.argv
    renumber_purchase_orders(dry_run=dry)
