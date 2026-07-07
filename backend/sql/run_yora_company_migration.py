import sys
from pathlib import Path

from sqlalchemy import text

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from core.dependencies import engine_mysql  # noqa: E402

COLUMNS = (
    ("gstin", "ADD COLUMN gstin VARCHAR(20) NULL AFTER phone"),
    ("pan", "ADD COLUMN pan VARCHAR(20) NULL AFTER gstin"),
    ("fssai", "ADD COLUMN fssai VARCHAR(20) NULL AFTER pan"),
    ("msme", "ADD COLUMN msme VARCHAR(20) NULL AFTER fssai"),
)


def _column_exists(conn, column_name: str) -> bool:
    row = conn.execute(
        text(
            """
            SELECT COUNT(*) AS cnt
            FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'yora_company'
              AND COLUMN_NAME = :column_name
            """
        ),
        {"column_name": column_name},
    ).mappings().first()
    return bool(row and row["cnt"])


def run_migration():
    with engine_mysql.begin() as conn:
        for column_name, alter_clause in COLUMNS:
            if not _column_exists(conn, column_name):
                conn.execute(text(f"ALTER TABLE yora_company {alter_clause}"))
                print(f"Added column: {column_name}")
            else:
                print(f"Column already exists: {column_name}")

    with engine_mysql.connect() as conn:
        row = conn.execute(
            text(
                """
                SELECT company_name, gstin, pan, fssai, msme
                FROM yora_company
                LIMIT 1
                """
            )
        ).mappings().first()

    print("yora_company compliance columns ready")
    if row:
        print(dict(row))


if __name__ == "__main__":
    run_migration()
