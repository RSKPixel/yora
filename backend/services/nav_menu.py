from sqlalchemy import text

DEFAULT_NAV_MENU = {
    "top_level": [
        {
            "label": "Dashboard",
            "path": "/dashboard",
            "icon": "bi-speedometer2",
            "sort_order": 1,
        }
    ],
    "sections": [
        {
            "label": "Masters",
            "icon": "bi-database",
            "sort_order": 2,
            "items": [
                {"label": "Cost Center", "path": "/masters/cost-center", "icon": "bi-building", "sort_order": 1},
                {"label": "Mould Master", "path": "/masters/mould-master", "icon": "bi-box-seam", "sort_order": 2},
                {"label": "Machinery Master", "path": "/masters/machinery-master", "icon": "bi-gear-wide-connected", "sort_order": 3},
            ],
        },
        {
            "label": "Transactions",
            "icon": "bi-arrow-left-right",
            "sort_order": 3,
            "items": [
                {"label": "Purchase Order", "path": "/transactions/purchase-order", "icon": "bi-clipboard-check", "sort_order": 1},
                {"label": "Purchase", "path": "/transactions/purchase", "icon": "bi-cart-plus", "sort_order": 2},
                {"label": "Sales", "path": "/transactions/sales", "icon": "bi-receipt", "sort_order": 3},
                {"label": "Service Record", "path": "/transactions/service-record", "icon": "bi-wrench-adjustable", "sort_order": 4},
                {"label": "Credit Note", "path": "/transactions/creditnote", "icon": "bi-file-earmark-minus", "sort_order": 5},
            ],
        },
        {
            "label": "Stock Movement",
            "icon": "bi-arrow-repeat",
            "sort_order": 4,
            "items": [
                {"label": "Stock Journal", "path": "/stock-movement/stock-journal", "icon": "bi-journal-text", "sort_order": 1},
                {"label": "Blowing", "path": "/stock-movement/blowing", "icon": "bi-wind", "sort_order": 2},
            ],
        },
        {
            "label": "Reports",
            "icon": "bi-bar-chart",
            "sort_order": 5,
            "items": [
                {"label": "Stock Report", "path": "/reports/stockposition", "icon": "bi-boxes", "sort_order": 1},
                {"label": "Stock Summary", "path": "/reports/stocksummary", "icon": "bi-pie-chart", "sort_order": 2},
                {"label": "Purchase Order Report", "path": "/reports/purchaseorder", "icon": "bi-file-earmark-bar-graph", "sort_order": 3},
            ],
        },
    ],
}

CREATE_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS yora_nav_menu (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    parent_id       BIGINT UNSIGNED NULL,
    node_type       ENUM('top_link', 'section', 'section_link') NOT NULL,
    label           VARCHAR(100) NOT NULL,
    path            VARCHAR(255) NULL,
    icon            VARCHAR(64) NOT NULL DEFAULT 'bi-circle',
    sort_order      INT NOT NULL DEFAULT 0,
    is_active       TINYINT(1) NOT NULL DEFAULT 1,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_yora_nav_menu_parent_sort (parent_id, sort_order),
    KEY idx_yora_nav_menu_type_sort (node_type, sort_order),
    CONSTRAINT fk_yora_nav_menu_parent
        FOREIGN KEY (parent_id) REFERENCES yora_nav_menu(id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
"""


def seed_nav_menu(connection) -> None:
    count = connection.execute(text("SELECT COUNT(*) FROM yora_nav_menu")).scalar()
    if count:
        return

    for entry in DEFAULT_NAV_MENU["top_level"]:
        connection.execute(
            text(
                """
                INSERT INTO yora_nav_menu (node_type, label, path, icon, sort_order)
                VALUES ('top_link', :label, :path, :icon, :sort_order)
                """
            ),
            entry,
        )

    for section in DEFAULT_NAV_MENU["sections"]:
        result = connection.execute(
            text(
                """
                INSERT INTO yora_nav_menu (node_type, label, path, icon, sort_order)
                VALUES ('section', :label, NULL, :icon, :sort_order)
                """
            ),
            {
                "label": section["label"],
                "icon": section["icon"],
                "sort_order": section["sort_order"],
            },
        )
        section_id = result.lastrowid

        for item in section["items"]:
            connection.execute(
                text(
                    """
                    INSERT INTO yora_nav_menu
                        (parent_id, node_type, label, path, icon, sort_order)
                    VALUES
                        (:parent_id, 'section_link', :label, :path, :icon, :sort_order)
                    """
                ),
                {**item, "parent_id": section_id},
            )


def fetch_nav_menu_rows(connection):
    return (
        connection.execute(
            text(
                """
                SELECT id, parent_id, node_type, label, path, icon, sort_order
                FROM yora_nav_menu
                WHERE is_active = 1
                ORDER BY sort_order ASC, id ASC
                """
            )
        )
        .mappings()
        .all()
    )


def build_nav_menu_response(rows) -> dict:
    top_level = []
    sections_by_id = {}
    sections_order = []
    pending_links = []

    for row in rows:
        if row["node_type"] == "top_link":
            top_level.append(
                {
                    "label": row["label"],
                    "path": row["path"],
                    "icon": row["icon"],
                }
            )
        elif row["node_type"] == "section":
            section = {"label": row["label"], "icon": row["icon"], "items": []}
            sections_by_id[row["id"]] = section
            sections_order.append(row["id"])
        elif row["node_type"] == "section_link":
            pending_links.append(row)

    section_items: dict[int, list] = {}

    for row in pending_links:
        parent_id = row["parent_id"]
        if parent_id in sections_by_id:
            section_items.setdefault(parent_id, []).append(row)

    for section_id, section in sections_by_id.items():
        rows_for_section = section_items.get(section_id, [])
        rows_for_section.sort(key=lambda item: (item["sort_order"], item["id"]))
        section["items"] = [
            {
                "label": row["label"],
                "path": row["path"],
                "icon": row["icon"],
            }
            for row in rows_for_section
        ]

    sections = [sections_by_id[section_id] for section_id in sections_order]
    return {"topLevel": top_level, "sections": sections}


def dedupe_nav_menu_paths(connection) -> None:
    connection.execute(
        text(
            """
            DELETE n1
            FROM yora_nav_menu n1
            INNER JOIN yora_nav_menu n2
                ON n1.path = n2.path
                AND n1.path IS NOT NULL
                AND n1.node_type = 'section_link'
                AND n2.node_type = 'section_link'
                AND n1.id > n2.id
            """
        )
    )


def remove_retired_nav_items(connection) -> None:
    connection.execute(
        text(
            """
            DELETE FROM yora_nav_menu
            WHERE path IN (
                '/masters/inventory',
                '/masters/ledger',
                '/masters/machinery',
                '/masters/locations',
                '/transactions/mould-inventory',
                '/transactions/machinery-service-recorder'
            )
            """
        )
    )


def sync_nav_menu_items(connection) -> None:
    for section in DEFAULT_NAV_MENU["sections"]:
        row = (
            connection.execute(
                text(
                    """
                    SELECT id
                    FROM yora_nav_menu
                    WHERE node_type = 'section' AND label = :label
                    LIMIT 1
                    """
                ),
                {"label": section["label"]},
            )
            .first()
        )

        if row:
            section_id = row[0]
            connection.execute(
                text(
                    """
                    UPDATE yora_nav_menu
                    SET icon = :icon,
                        sort_order = :sort_order,
                        is_active = 1
                    WHERE id = :id
                    """
                ),
                {
                    "icon": section["icon"],
                    "sort_order": section["sort_order"],
                    "id": section_id,
                },
            )
        else:
            result = connection.execute(
                text(
                    """
                    INSERT INTO yora_nav_menu (node_type, label, path, icon, sort_order)
                    VALUES ('section', :label, NULL, :icon, :sort_order)
                    """
                ),
                {
                    "label": section["label"],
                    "icon": section["icon"],
                    "sort_order": section["sort_order"],
                },
            )
            section_id = result.lastrowid

        for item in section["items"]:
            existing = (
                connection.execute(
                    text(
                        """
                        SELECT id
                        FROM yora_nav_menu
                        WHERE path = :path
                        LIMIT 1
                        """
                    ),
                    {"path": item["path"]},
                )
                .first()
            )

            if existing:
                connection.execute(
                    text(
                        """
                        UPDATE yora_nav_menu
                        SET parent_id = :parent_id,
                            node_type = 'section_link',
                            label = :label,
                            icon = :icon,
                            sort_order = :sort_order,
                            is_active = 1
                        WHERE id = :id
                        """
                    ),
                    {
                        **item,
                        "parent_id": section_id,
                        "id": existing[0],
                    },
                )
            else:
                connection.execute(
                    text(
                        """
                        INSERT INTO yora_nav_menu
                            (parent_id, node_type, label, path, icon, sort_order)
                        VALUES
                            (:parent_id, 'section_link', :label, :path, :icon, :sort_order)
                        """
                    ),
                    {**item, "parent_id": section_id},
                )


def ensure_nav_menu_defaults(connection) -> dict:
    connection.execute(text(CREATE_TABLE_SQL))
    seed_nav_menu(connection)
    remove_retired_nav_items(connection)
    sync_nav_menu_items(connection)
    dedupe_nav_menu_paths(connection)
    rows = fetch_nav_menu_rows(connection)
    return build_nav_menu_response(rows)
