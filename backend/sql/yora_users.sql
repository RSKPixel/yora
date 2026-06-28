-- User login table for YORA ERP
-- Database: sivendhiind.trueerp.in

CREATE TABLE IF NOT EXISTS yora_users (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id         VARCHAR(50) NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    name            VARCHAR(100) NOT NULL,
    email           VARCHAR(255) NULL,
    phone           VARCHAR(20) NULL,
    profile_pic     MEDIUMTEXT NULL,
    is_active       TINYINT(1) NOT NULL DEFAULT 1,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_yora_users_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Optional dev seed (run migration script; do not commit real passwords here).
-- Existing SHA-256 hashes are upgraded to bcrypt automatically on next successful login.
