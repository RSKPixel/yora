-- Cost center master for YORA ERP
-- Database: sivendhiind.trueerp.in
-- under_id NULL = directly under Primary

CREATE TABLE IF NOT EXISTS yora_cost_centers (
    id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    cost_center_name    VARCHAR(100) NOT NULL,
    under_id            BIGINT UNSIGNED NULL,
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_yora_cost_centers_name (cost_center_name),
    KEY idx_yora_cost_centers_under (under_id),
    CONSTRAINT fk_yora_cost_centers_under
        FOREIGN KEY (under_id) REFERENCES yora_cost_centers (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
