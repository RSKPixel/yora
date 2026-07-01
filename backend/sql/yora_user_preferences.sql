-- Per-user general preferences (synced across devices).

CREATE TABLE IF NOT EXISTS yora_user_preferences (
    user_id                         VARCHAR(50) NOT NULL,
    menu_style                      VARCHAR(20) NOT NULL DEFAULT 'modern',
    root_font_size                  DECIMAL(4, 1) NOT NULL DEFAULT 17.0,
    dashboard_quick_access_visible  TINYINT(1) NOT NULL DEFAULT 1,
    dashboard_search_visible        TINYINT(1) NOT NULL DEFAULT 1,
    created_at                      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id),
    CONSTRAINT fk_yora_user_preferences_user
        FOREIGN KEY (user_id) REFERENCES yora_users(user_id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
