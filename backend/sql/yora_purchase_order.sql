-- Purchase order tables for YORA ERP
-- Database: sivendhiind.trueerp.in
--
-- Vendor address/GSTIN/PAN are not stored here — join yora_ledger view on vendor = name.
-- yora_ledger is a view (not a table), so vendor is validated in the API, not via FK.
-- Line-item master fields (parent, unit, hsn_code) are snapshotted at save time.

CREATE TABLE IF NOT EXISTS yora_purchase_order (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    po_no           VARCHAR(20) NOT NULL,
    po_date         DATE NOT NULL,
    vendor          VARCHAR(100) NOT NULL,
    vendor_quotation_no VARCHAR(100) NULL,
    shipping        VARCHAR(255) NULL,
    insurance       VARCHAR(255) NULL,
    payment_terms   VARCHAR(500) NULL,
    delivery_terms  VARCHAR(500) NULL,
    status          VARCHAR(30) NOT NULL DEFAULT 'Open',
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_yora_purchase_order_po_no (po_no),
    KEY idx_yora_purchase_order_vendor (vendor),
    KEY idx_yora_purchase_order_po_date (po_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS yora_purchase_order_details (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    po_no           VARCHAR(20) NOT NULL,
    line_no         INT UNSIGNED NOT NULL,
    stock_item      VARCHAR(100) NOT NULL,
    parent          VARCHAR(100) NULL,
    unit            VARCHAR(20) NULL,
    hsn_code        VARCHAR(20) NULL,
    qty             DECIMAL(12, 3) NOT NULL,
    unit_price      DECIMAL(14, 2) NULL,
    discount_pct    DECIMAL(5, 2) NULL,
    gst             DECIMAL(5, 2) NULL,
    description     VARCHAR(500) NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_yora_purchase_order_details_po_line (po_no, line_no),
    KEY idx_yora_purchase_order_details_stock_item (stock_item),
    CONSTRAINT fk_yora_purchase_order_details_po_no
        FOREIGN KEY (po_no) REFERENCES yora_purchase_order (po_no)
        ON UPDATE CASCADE
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
