-- Registration / compliance fields for yora_company.
-- Database: sivendhiind.trueerp.in

ALTER TABLE yora_company
    ADD COLUMN gstin VARCHAR(20) NULL AFTER phone,
    ADD COLUMN pan VARCHAR(20) NULL AFTER gstin,
    ADD COLUMN fssai VARCHAR(20) NULL AFTER pan,
    ADD COLUMN msme VARCHAR(20) NULL AFTER fssai;
