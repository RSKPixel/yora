import sys
from pathlib import Path

from sqlalchemy import text

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from core.dependencies import engine_mysql  # noqa: E402

ADD_EMAIL_SQL = """
ALTER TABLE yora_users
    ADD COLUMN email VARCHAR(255) NULL AFTER name
"""

ADD_PHONE_SQL = """
ALTER TABLE yora_users
    ADD COLUMN phone VARCHAR(20) NULL AFTER email
"""

ADD_PROFILE_PIC_SQL = """
ALTER TABLE yora_users
    ADD COLUMN profile_pic MEDIUMTEXT NULL AFTER phone
"""


def _column_exists(conn, column_name: str) -> bool:
    row = conn.execute(
        text(
            """
            SELECT COUNT(*) AS cnt
            FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'yora_users'
              AND COLUMN_NAME = :column_name
            """
        ),
        {"column_name": column_name},
    ).mappings().first()
    return bool(row and row["cnt"])


def run_migration():
    with engine_mysql.begin() as conn:
        if not _column_exists(conn, "email"):
            conn.execute(text(ADD_EMAIL_SQL))
            print("Added column: email")
        else:
            print("Column already exists: email")

        if not _column_exists(conn, "phone"):
            conn.execute(text(ADD_PHONE_SQL))
            print("Added column: phone")
        else:
            print("Column already exists: phone")

        if not _column_exists(conn, "profile_pic"):
            conn.execute(text(ADD_PROFILE_PIC_SQL))
            print("Added column: profile_pic")
        else:
            print("Column already exists: profile_pic")

    with engine_mysql.connect() as conn:
        users = conn.execute(
            text(
                """
                SELECT user_id, name, email, phone,
                       CASE WHEN profile_pic IS NULL THEN NULL ELSE 'set' END AS profile_pic
                FROM yora_users
                ORDER BY user_id
                """
            )
        ).fetchall()

    print("yora_users profile columns ready")
    for row in users:
        print(dict(row._mapping))


if __name__ == "__main__":
    run_migration()
