import sys
from pathlib import Path

from sqlalchemy import text

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from core.dependencies import engine_mysql  # noqa: E402

SQL_PATH = Path(__file__).resolve().parent / "yora_machinery_service_records.sql"

UPGRADE_STATEMENTS = [
    """
    ALTER TABLE yora_machinery_service_records
    ADD COLUMN complaint_description TEXT NULL AFTER service_date
    """,
]


def run_migration():
    sql = SQL_PATH.read_text(encoding="utf-8")
    with engine_mysql.begin() as conn:
        for statement in sql.split(";"):
            cleaned = statement.strip()
            if cleaned:
                conn.execute(text(cleaned))

        for statement in UPGRADE_STATEMENTS:
            try:
                conn.execute(text(statement))
            except Exception as exc:
                if "Duplicate column name" not in str(exc):
                    raise

    with engine_mysql.connect() as conn:
        count = conn.execute(text("SELECT COUNT(*) FROM yora_machinery_service_records")).scalar()

    print("yora_machinery_service_records table ready")
    print(f"rows: {count}")


if __name__ == "__main__":
    run_migration()
