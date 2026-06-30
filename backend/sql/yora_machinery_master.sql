-- Machinery master under Masters

CREATE TABLE IF NOT EXISTS yora_machinery_master (
    id                      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    machine_id              VARCHAR(20) NOT NULL,
    machine_name            VARCHAR(150) NOT NULL,
    machine_type            VARCHAR(100) NOT NULL,
    machine_description     TEXT NULL,
    purchase_date           DATE NOT NULL,
    supplier_name           VARCHAR(150) NULL,
    amc_warranty_validity   DATE NULL,
    created_at              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_yora_machinery_master_machine_id (machine_id),
    UNIQUE KEY uq_yora_machinery_master_name (machine_name),
    KEY idx_yora_machinery_master_purchase_date (purchase_date),
    KEY idx_yora_machinery_master_amc_warranty (amc_warranty_validity)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
