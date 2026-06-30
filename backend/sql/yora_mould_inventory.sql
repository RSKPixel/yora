-- Mould inventory under Transactions

CREATE TABLE IF NOT EXISTS yora_mould_inventory (
    id                      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    tool_id                 VARCHAR(20) NOT NULL,
    mould_name              VARCHAR(150) NOT NULL,
    mould_type              ENUM('Blow Mould', 'Injection Mould') NOT NULL,
    purchase_date           DATE NOT NULL,
    manufactured_by         VARCHAR(150) NULL,
    tool_quality_status     ENUM(
        'Good',
        'Service Required',
        'Damaged',
        'Unusable',
        'Need to Be replaced'
    ) NOT NULL DEFAULT 'Good',
    neck_size_mm            DECIMAL(10, 2) NULL,
    capacity_ml             DECIMAL(10, 2) NULL,
    compatible_machine_id   BIGINT UNSIGNED NULL,
    inventory_location_id   BIGINT UNSIGNED NULL,
    created_at              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_yora_mould_inventory_tool_id (tool_id),
    UNIQUE KEY uq_yora_mould_inventory_name (mould_name),
    KEY idx_yora_mould_inventory_purchase_date (purchase_date),
    KEY idx_yora_mould_inventory_machine (compatible_machine_id),
    KEY idx_yora_mould_inventory_location (inventory_location_id),
    CONSTRAINT fk_yora_mould_inventory_machinery
        FOREIGN KEY (compatible_machine_id) REFERENCES yora_machinery_master (id),
    CONSTRAINT fk_yora_mould_inventory_location
        FOREIGN KEY (inventory_location_id) REFERENCES yora_cost_centers (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
