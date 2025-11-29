-- === Categories ===
CREATE TABLE IF NOT EXISTS gauge_categories (
  id INT PRIMARY KEY AUTO_INCREMENT,
  equipment_type ENUM('thread_gauge','hand_tool','large_equipment','calibration_standard') NOT NULL,
  category_name VARCHAR(100) NOT NULL,
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_category (equipment_type, category_name),
  INDEX idx_equipment_type (equipment_type, is_active)
) ENGINE=InnoDB;

-- seed (idempotent)
INSERT IGNORE INTO gauge_categories (equipment_type, category_name, display_order)
VALUES
  ('thread_gauge','Standard',1),
  ('thread_gauge','Metric',2),
  ('thread_gauge','ACME',3),
  ('thread_gauge','NPT',4),
  ('thread_gauge','STI',5),
  ('thread_gauge','Spiralock',6),
  ('hand_tool','Caliper',1),
  ('hand_tool','Micrometer',2),
  ('hand_tool','Depth Gauge',3),
  ('hand_tool','Bore Gauge',4),
  ('large_equipment','CMM',1),
  ('large_equipment','Optical Comparator',2),
  ('large_equipment','Height Gauge',3),
  ('large_equipment','Surface Plate',4),
  ('large_equipment','Hardness Tester',5),
  ('large_equipment','Force/Torque Tester',6),
  ('calibration_standard','Gauge Block',1),
  ('calibration_standard','Master Ring',2),
  ('calibration_standard','Master Plug',3),
  ('calibration_standard','Reference Standard',4);

-- === ID Config ===
CREATE TABLE IF NOT EXISTS gauge_id_config (
  id INT PRIMARY KEY AUTO_INCREMENT,
  category_id INT NOT NULL,
  gauge_type VARCHAR(20), -- 'plug','ring' or NULL
  prefix VARCHAR(4) NOT NULL,
  current_sequence INT DEFAULT 0,
  is_locked BOOLEAN DEFAULT FALSE,
  locked_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_gic_category FOREIGN KEY (category_id) REFERENCES gauge_categories(id) ON DELETE RESTRICT,
  CONSTRAINT chk_prefix_format CHECK (LENGTH(prefix) BETWEEN 2 AND 4 AND prefix REGEXP '^[A-Z]+$'),
  UNIQUE KEY unique_prefix (prefix),
  UNIQUE KEY unique_config (category_id, gauge_type)
) ENGINE=InnoDB;

-- === System Config ===
CREATE TABLE IF NOT EXISTS gauge_system_config (
  id INT PRIMARY KEY AUTO_INCREMENT,
  config_key VARCHAR(50) NOT NULL UNIQUE,
  config_value VARCHAR(255),
  config_type ENUM('string','number','boolean','json') DEFAULT 'string',
  description VARCHAR(255),
  is_locked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT INTO gauge_system_config (config_key, config_value, description)
VALUES
  ('id_display_mode','both','Display preference: system, custom, or both'),
  ('prefixes_locked','false','Whether ID prefixes are locked'),
  ('calibration_standard_enabled','true','Enable calibration standards module')
ON DUPLICATE KEY UPDATE config_value = VALUES(config_value);

-- === Companion History ===
CREATE TABLE IF NOT EXISTS gauge_companion_history (
  id INT PRIMARY KEY AUTO_INCREMENT,
  gauge_id INT NOT NULL,
  companion_gauge_id INT NULL,
  companion_serial VARCHAR(100),
  old_companion_id INT NULL,
  old_companion_serial VARCHAR(100),
  action ENUM('paired','unpaired','replaced') NOT NULL,
  reason VARCHAR(255),
  changed_by INT NOT NULL,
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_gch_gauge FOREIGN KEY (gauge_id) REFERENCES gauges(id) ON DELETE CASCADE,
  CONSTRAINT fk_gch_companion FOREIGN KEY (companion_gauge_id) REFERENCES gauges(id) ON DELETE SET NULL,
  CONSTRAINT fk_gch_old_companion FOREIGN KEY (old_companion_id) REFERENCES gauges(id) ON DELETE SET NULL,
  CONSTRAINT fk_gch_user FOREIGN KEY (changed_by) REFERENCES core_users(id) ON DELETE RESTRICT,
  INDEX idx_gauge_history (gauge_id, changed_at),
  INDEX idx_companion_changes (companion_gauge_id)
) ENGINE=InnoDB;

-- === Thread Specs ===
CREATE TABLE IF NOT EXISTS gauge_thread_specifications (
  gauge_id INT PRIMARY KEY,
  thread_size VARCHAR(20) NOT NULL,
  thread_type VARCHAR(20) NOT NULL,       -- standard, metric, acme, npt, sti, spiralock
  thread_form VARCHAR(10),                -- UN, UNF, NPT, etc.
  thread_class VARCHAR(10) NOT NULL,      -- 2A, 2B, 6g, L1, L2, L3 ...
  gauge_type VARCHAR(10) NOT NULL,        -- plug, ring
  thread_hand VARCHAR(5) DEFAULT 'RH',    -- RH/LH
  acme_starts INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_ts_gauge FOREIGN KEY (gauge_id) REFERENCES gauges(id) ON DELETE CASCADE,
  INDEX idx_thread_search (thread_type, thread_size, thread_class, gauge_type)
) ENGINE=InnoDB;

-- === Hand Tool Specs ===
CREATE TABLE IF NOT EXISTS gauge_hand_tool_specifications (
  gauge_id INT PRIMARY KEY,
  tool_type VARCHAR(20) NOT NULL,         -- caliper, micrometer, depth_gauge, bore_gauge
  format VARCHAR(20) NOT NULL,            -- digital, dial
  range_min DECIMAL(10,4) NOT NULL,
  range_max DECIMAL(10,4) NOT NULL,
  range_unit VARCHAR(10) DEFAULT 'inches',
  resolution DECIMAL(10,6) NOT NULL,
  ownership_type VARCHAR(20) DEFAULT 'company',
  owner_employee_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_hts_gauge FOREIGN KEY (gauge_id) REFERENCES gauges(id) ON DELETE CASCADE,
  CONSTRAINT fk_hts_owner FOREIGN KEY (owner_employee_id) REFERENCES core_users(id) ON DELETE SET NULL,
  CONSTRAINT chk_range CHECK (range_min < range_max)
) ENGINE=InnoDB;

-- === Large Equipment Specs ===
CREATE TABLE IF NOT EXISTS gauge_large_equipment_specifications (
  gauge_id INT PRIMARY KEY,
  equipment_type VARCHAR(50) NOT NULL,
  capacity VARCHAR(100),
  accuracy_class VARCHAR(20),
  fixed_location BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_les_gauge FOREIGN KEY (gauge_id) REFERENCES gauges(id) ON DELETE CASCADE,
  INDEX idx_equipment_type (equipment_type),
  INDEX idx_fixed_location (fixed_location)
) ENGINE=InnoDB;

-- === Calibration Standard Specs ===
CREATE TABLE IF NOT EXISTS gauge_calibration_standard_specifications (
  gauge_id INT PRIMARY KEY,
  standard_type VARCHAR(50) NOT NULL,
  nominal_value DECIMAL(15,6) NOT NULL,
  uncertainty DECIMAL(15,6) NOT NULL,
  uncertainty_units VARCHAR(20) DEFAULT 'inches',
  traceability_organization VARCHAR(50),
  traceability_certificate VARCHAR(100),
  access_restricted BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_css_gauge FOREIGN KEY (gauge_id) REFERENCES gauges(id) ON DELETE CASCADE,
  INDEX idx_standard_type (standard_type),
  INDEX idx_nominal_value (nominal_value)
) ENGINE=InnoDB;

-- === Gauges helpful indexes (non-destructive) ===
CREATE INDEX idx_gauges_type_cat_spare ON gauges(equipment_type, category_id, is_spare);
CREATE INDEX idx_gauges_companion ON gauges(companion_gauge_id);
CREATE INDEX idx_gauges_status ON gauges(status);

-- === Calibration FK hardening ===
ALTER TABLE gauge_calibrations
  ADD CONSTRAINT fk_gc_gauge FOREIGN KEY (gauge_id) REFERENCES gauges(id) ON DELETE CASCADE;

ALTER TABLE gauge_calibrations
  ADD INDEX idx_gc_gauge_date (gauge_id, calibration_date);

-- === Active Checkouts / Transactions FKs ===
ALTER TABLE gauge_active_checkouts
  ADD CONSTRAINT fk_gac_gauge FOREIGN KEY (gauge_id) REFERENCES gauges(id) ON DELETE CASCADE;

ALTER TABLE gauge_active_checkouts
  ADD CONSTRAINT fk_gac_user FOREIGN KEY (checked_out_to) REFERENCES core_users(id) ON DELETE RESTRICT;

ALTER TABLE gauge_transactions
  ADD CONSTRAINT fk_gt_gauge FOREIGN KEY (gauge_id) REFERENCES gauges(id) ON DELETE CASCADE;

ALTER TABLE gauge_transactions
  ADD CONSTRAINT fk_gt_actor FOREIGN KEY (actor_user_id) REFERENCES core_users(id) ON DELETE SET NULL;