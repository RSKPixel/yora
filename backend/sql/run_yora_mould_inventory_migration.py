import sys
from pathlib import Path

from sqlalchemy import text

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from core.dependencies import engine_mysql  # noqa: E402

SQL_PATH = Path(__file__).resolve().parent / "yora_mould_inventory.sql"

UPGRADE_STATEMENTS = [
    """
    ALTER TABLE yora_mould_inventory
    ADD COLUMN tool_id VARCHAR(20) NULL AFTER id
    """,
    """
    ALTER TABLE yora_mould_inventory
    ADD COLUMN purchase_date DATE NULL AFTER mould_type
    """,
    """
    ALTER TABLE yora_mould_inventory
    ADD COLUMN manufactured_by VARCHAR(150) NULL AFTER purchase_date
    """,
    """
    ALTER TABLE yora_mould_inventory
    ADD COLUMN tool_quality_status ENUM(
        'Good',
        'Service Required',
        'Damaged',
        'Unusable',
        'Need to Be replaced'
    ) NOT NULL DEFAULT 'Good' AFTER manufactured_by
    """,
    """
    UPDATE yora_mould_inventory
    SET purchase_date = COALESCE(purchase_date, DATE(created_at))
    WHERE purchase_date IS NULL
    """,
    """
    UPDATE yora_mould_inventory
    SET tool_id = CONCAT(
        LPAD(id, 3, '0'),
        '-',
        YEAR(COALESCE(purchase_date, created_at))
    )
    WHERE tool_id IS NULL OR tool_id = ''
    """,
    """
    ALTER TABLE yora_mould_inventory
    MODIFY COLUMN tool_id VARCHAR(20) NOT NULL
    """,
    """
    ALTER TABLE yora_mould_inventory
    MODIFY COLUMN purchase_date DATE NOT NULL
    """,
    """
    ALTER TABLE yora_mould_inventory
    ADD UNIQUE KEY uq_yora_mould_inventory_tool_id (tool_id)
    """,
    """
    ALTER TABLE yora_mould_inventory
    ADD KEY idx_yora_mould_inventory_purchase_date (purchase_date)
    """,
]


def _column_exists(connection, column_name: str) -> bool:
    row = connection.execute(
        text(
            """
            SELECT COUNT(*) AS total
            FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'yora_mould_inventory'
              AND COLUMN_NAME = :column_name
            """
        ),
        {"column_name": column_name},
    ).first()
    return bool(row and row.total)


def run_migration():
    base_sql = SQL_PATH.read_text(encoding="utf-8")
    with engine_mysql.begin() as conn:
        conn.execute(text(base_sql))

        if not _column_exists(conn, "tool_id"):
            for statement in UPGRADE_STATEMENTS:
                try:
                    conn.execute(text(statement))
                except Exception as exc:
                    if "Duplicate" not in str(exc):
                        raise

    with engine_mysql.connect() as conn:
        rows = conn.execute(
            text(
                """
                SELECT id, tool_id, mould_name, purchase_date, tool_quality_status
                FROM yora_mould_inventory
                ORDER BY tool_id
                """
            )
        ).mappings().all()

    print("yora_mould_inventory table ready")
    for row in rows:
        print(dict(row))


if __name__ == "__main__":
    run_migration()
