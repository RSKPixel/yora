-- Profile fields for yora_users (email, phone, profile picture).
-- Database: sivendhiind.trueerp.in

ALTER TABLE yora_users
    ADD COLUMN email VARCHAR(255) NULL AFTER name,
    ADD COLUMN phone VARCHAR(20) NULL AFTER email,
    ADD COLUMN profile_pic MEDIUMTEXT NULL AFTER phone;
