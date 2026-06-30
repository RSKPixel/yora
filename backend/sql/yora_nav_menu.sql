-- Application navigation menu (left sidebar, spotlight search, quick access).
-- Hierarchical: top_link and section rows have parent_id NULL; section_link rows reference a section.

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
