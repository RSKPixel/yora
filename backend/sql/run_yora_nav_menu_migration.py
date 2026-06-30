import sys
from pathlib import Path

from sqlalchemy import text

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from core.dependencies import engine_mysql  # noqa: E402
from services.nav_menu import CREATE_TABLE_SQL, seed_nav_menu  # noqa: E402


def run_migration():
    with engine_mysql.begin() as conn:
        conn.execute(text(CREATE_TABLE_SQL))
        seed_nav_menu(conn)

    with engine_mysql.connect() as conn:
        rows = conn.execute(
            text(
                """
                SELECT node_type, label, path, icon, sort_order
                FROM yora_nav_menu
                WHERE is_active = 1
                ORDER BY sort_order ASC, id ASC
                """
            )
        ).mappings().all()

    print("yora_nav_menu table ready")
    for row in rows:
        print(dict(row))


if __name__ == "__main__":
    run_migration()
