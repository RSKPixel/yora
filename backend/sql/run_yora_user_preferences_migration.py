import sys
from pathlib import Path

from sqlalchemy import text

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from core.dependencies import engine_mysql  # noqa: E402

SQL_PATH = Path(__file__).resolve().parent / "yora_user_preferences.sql"


def run_migration():
    sql = SQL_PATH.read_text(encoding="utf-8")
    with engine_mysql.begin() as conn:
        for statement in sql.split(";"):
            cleaned = statement.strip()
            if cleaned:
                conn.execute(text(cleaned))

    with engine_mysql.connect() as conn:
        count = conn.execute(text("SELECT COUNT(*) FROM yora_user_preferences")).scalar()

    print("yora_user_preferences table ready")
    print(f"rows: {count}")


if __name__ == "__main__":
    run_migration()
