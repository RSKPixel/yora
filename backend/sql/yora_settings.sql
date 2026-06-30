-- Global application settings (shared by all users).
-- setting_value is JSON; keys are application-defined.

CREATE TABLE IF NOT EXISTS yora_settings (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    setting_key     VARCHAR(100) NOT NULL,
    setting_value   JSON NOT NULL,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_yora_settings_key (setting_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

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
ON DUPLICATE KEY UPDATE setting_key = setting_key;
