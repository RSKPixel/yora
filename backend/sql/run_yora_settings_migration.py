import sys
from pathlib import Path

from sqlalchemy import text

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from core.dependencies import engine_mysql  # noqa: E402

CREATE_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS yora_settings (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    setting_key     VARCHAR(100) NOT NULL,
    setting_value   JSON NOT NULL,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_yora_settings_key (setting_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
"""

SEED_QUICK_ACCESS_SQL = """
INSERT INTO yora_settings (setting_key, setting_value)
VALUES (
    'quick_access',
    JSON_ARRAY(
        '/transactions/purchase-order',
        '/transactions/purchase',
        '/transactions/sales',
        '/reports/stockposition'
    )
)
ON DUPLICATE KEY UPDATE setting_key = setting_key
"""


def run_migration():
    with engine_mysql.begin() as conn:
        conn.execute(text(CREATE_TABLE_SQL))
        conn.execute(text(SEED_QUICK_ACCESS_SQL))

    with engine_mysql.connect() as conn:
        row = conn.execute(
            text(
                """
                SELECT setting_key, setting_value, updated_at
                FROM yora_settings
                WHERE setting_key = 'quick_access'
                """
            )
        ).mappings().first()

    print("yora_settings table ready in sivendhiind.trueerp.in")
    if row:
        print(f"quick_access: {row['setting_value']}")
        print(f"updated_at: {row['updated_at']}")


if __name__ == "__main__":
    run_migration()
