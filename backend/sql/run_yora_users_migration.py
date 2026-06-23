import os
import sys
from pathlib import Path

from sqlalchemy import text

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from core.dependencies import engine_mysql  # noqa: E402
from core.passwords import hash_password  # noqa: E402

CREATE_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS yora_users (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id         VARCHAR(50) NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    name            VARCHAR(100) NOT NULL,
    is_active       TINYINT(1) NOT NULL DEFAULT 1,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_yora_users_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
"""

ALTER_PASSWORD_COLUMN_SQL = """
ALTER TABLE yora_users
MODIFY COLUMN password_hash VARCHAR(255) NOT NULL
"""

SEED_USER_SQL = """
INSERT INTO yora_users (user_id, password_hash, name, is_active)
VALUES (:user_id, :password_hash, :name, 1)
ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    is_active = VALUES(is_active)
"""


def run_migration():
    admin_password = os.environ.get("YORA_ADMIN_PASSWORD", "admin123")

    with engine_mysql.begin() as conn:
        conn.execute(text(CREATE_TABLE_SQL))
        try:
            conn.execute(text(ALTER_PASSWORD_COLUMN_SQL))
        except Exception:
            pass
        conn.execute(
            text(SEED_USER_SQL),
            {
                "user_id": "admin",
                "password_hash": hash_password(admin_password),
                "name": "Admin",
            },
        )

    with engine_mysql.connect() as conn:
        users = conn.execute(
            text("SELECT user_id, name, is_active FROM yora_users ORDER BY user_id")
        ).fetchall()

    print("yora_users table ready in sivendhiind.trueerp.in")
    print("Seed user: user_id=admin (password from YORA_ADMIN_PASSWORD or default admin123)")
    for row in users:
        print(dict(row._mapping))


if __name__ == "__main__":
    run_migration()
