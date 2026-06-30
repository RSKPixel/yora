import sys
from pathlib import Path

from sqlalchemy import text

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from core.dependencies import engine_mysql  # noqa: E402

SQL_PATH = Path(__file__).resolve().parent / "yora_cost_centers.sql"


def _strip_sql_comments(sql: str) -> str:
    lines = []
    for line in sql.splitlines():
        stripped = line.strip()
        if stripped.startswith("--"):
            continue
        lines.append(line)
    return "\n".join(lines)


DROP_LOCATIONS_TABLE_SQL = "DROP TABLE IF EXISTS yora_locations"

DROP_CODE_INDEX_SQL = """
ALTER TABLE yora_cost_centers
DROP INDEX uq_yora_cost_centers_code
"""

DROP_CODE_COLUMN_SQL = """
ALTER TABLE yora_cost_centers
DROP COLUMN cost_center_code
"""

DROP_DESCRIPTION_COLUMN_SQL = """
ALTER TABLE yora_cost_centers
DROP COLUMN description
"""

DROP_TYPE_INDEX_SQL = """
ALTER TABLE yora_cost_centers
DROP INDEX idx_yora_cost_centers_type
"""

DROP_TYPE_COLUMN_SQL = """
ALTER TABLE yora_cost_centers
DROP COLUMN cost_center_type
"""

ADD_UNDER_COLUMN_SQL = """
ALTER TABLE yora_cost_centers
ADD COLUMN under_id BIGINT UNSIGNED NULL AFTER cost_center_name
"""

ADD_UNDER_INDEX_SQL = """
ALTER TABLE yora_cost_centers
ADD KEY idx_yora_cost_centers_under (under_id)
"""

ADD_UNDER_FK_SQL = """
ALTER TABLE yora_cost_centers
ADD CONSTRAINT fk_yora_cost_centers_under
    FOREIGN KEY (under_id) REFERENCES yora_cost_centers (id)
"""


def _try_execute(conn, sql: str) -> None:
    try:
        conn.execute(text(sql))
    except Exception:
        pass


def run_migration():
    ddl = _strip_sql_comments(SQL_PATH.read_text(encoding="utf-8"))
    statements = [stmt.strip() for stmt in ddl.split(";") if stmt.strip()]

    with engine_mysql.begin() as conn:
        conn.execute(text(DROP_LOCATIONS_TABLE_SQL))
        for statement in statements:
            conn.execute(text(statement))

        for cleanup_sql in (
            DROP_CODE_INDEX_SQL,
            DROP_CODE_COLUMN_SQL,
            DROP_DESCRIPTION_COLUMN_SQL,
            DROP_TYPE_INDEX_SQL,
            DROP_TYPE_COLUMN_SQL,
        ):
            _try_execute(conn, cleanup_sql)

        _try_execute(conn, ADD_UNDER_COLUMN_SQL)
        _try_execute(conn, ADD_UNDER_INDEX_SQL)
        _try_execute(conn, ADD_UNDER_FK_SQL)

    with engine_mysql.connect() as conn:
        rows = conn.execute(
            text(
                """
                SELECT
                    cc.id,
                    cc.cost_center_name,
                    cc.under_id,
                    COALESCE(parent.cost_center_name, 'Primary') AS under_name
                FROM yora_cost_centers cc
                LEFT JOIN yora_cost_centers parent ON parent.id = cc.under_id
                ORDER BY cc.cost_center_name
                """
            )
        ).mappings().all()

    print("yora_cost_centers table ready")
    for row in rows:
        print(dict(row))


if __name__ == "__main__":
    run_migration()
