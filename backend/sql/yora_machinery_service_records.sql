-- Service records for machinery master

CREATE TABLE IF NOT EXISTS yora_machinery_service_records (
    id                      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    machinery_id            BIGINT UNSIGNED NOT NULL,
    service_date            DATE NOT NULL,
    complaint_description   TEXT NULL,
    service_description     TEXT NOT NULL,
    created_at              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_yora_machinery_service_machinery (machinery_id),
    KEY idx_yora_machinery_service_date (service_date),
    CONSTRAINT fk_yora_machinery_service_machinery
        FOREIGN KEY (machinery_id) REFERENCES yora_machinery_master(id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
