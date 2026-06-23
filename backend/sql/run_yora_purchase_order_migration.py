import sys
from pathlib import Path

from sqlalchemy import text

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from core.dependencies import engine_mysql  # noqa: E402

SQL_PATH = Path(__file__).resolve().parent / "yora_purchase_order.sql"


def _strip_sql_comments(sql: str) -> str:
    lines = []
    for line in sql.splitlines():
        stripped = line.strip()
        if stripped.startswith("--"):
            continue
        lines.append(line)
    return "\n".join(lines)


DROP_VENDOR_FK_SQL = """
ALTER TABLE yora_purchase_order
DROP FOREIGN KEY fk_yora_purchase_order_vendor
"""

ADD_STATUS_COLUMN_SQL = """
ALTER TABLE yora_purchase_order
ADD COLUMN status VARCHAR(30) NOT NULL DEFAULT 'Open' AFTER delivery_terms
"""

ADD_DISCOUNT_COLUMN_SQL = """
ALTER TABLE yora_purchase_order_details
ADD COLUMN discount_pct DECIMAL(5, 2) NULL AFTER unit_price
"""

ADD_VENDOR_QUOTATION_NO_SQL = """
ALTER TABLE yora_purchase_order
ADD COLUMN vendor_quotation_no VARCHAR(100) NULL AFTER vendor
"""


def run_migration():
    ddl = _strip_sql_comments(SQL_PATH.read_text(encoding="utf-8"))
    statements = [stmt.strip() for stmt in ddl.split(";") if stmt.strip()]

    with engine_mysql.begin() as conn:
        try:
            conn.execute(text(DROP_VENDOR_FK_SQL))
        except Exception:
            pass
        try:
            conn.execute(text(ADD_STATUS_COLUMN_SQL))
        except Exception:
            pass
        try:
            conn.execute(text(ADD_DISCOUNT_COLUMN_SQL))
        except Exception:
            pass
        try:
            conn.execute(text(ADD_VENDOR_QUOTATION_NO_SQL))
        except Exception:
            pass
        for statement in statements:
            conn.execute(text(statement))

    with engine_mysql.connect() as conn:
        tables = conn.execute(
            text("SHOW TABLES LIKE 'yora_purchase_order%'")
        ).fetchall()

    print("Purchase order tables ready.")
    for row in tables:
        print(f"  - {row[0]}")


if __name__ == "__main__":
    run_migration()
