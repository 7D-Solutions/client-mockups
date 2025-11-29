-- Transaction Import System Tables

-- Import batches tracking
CREATE TABLE IF NOT EXISTS transaction_imports (
  id INT PRIMARY KEY AUTO_INCREMENT,
  filename VARCHAR(255) NOT NULL,
  uploaded_by INT NOT NULL,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  total_transactions INT NOT NULL,
  processed_rows INT DEFAULT 0,
  matched_count INT DEFAULT 0,
  status ENUM('processing', 'completed', 'failed') DEFAULT 'processing',
  error_message TEXT,
  INDEX idx_uploaded_by (uploaded_by),
  INDEX idx_status (status),
  INDEX idx_uploaded_at (uploaded_at)
);

-- Imported transactions from spreadsheets
CREATE TABLE IF NOT EXISTS imported_transactions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  import_id INT NOT NULL,
  transaction_date DATE NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  description TEXT,
  reference VARCHAR(255),
  row_number INT,
  raw_data JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (import_id) REFERENCES transaction_imports(id) ON DELETE CASCADE,
  INDEX idx_import_id (import_id),
  INDEX idx_transaction_date (transaction_date),
  INDEX idx_amount (amount)
);

-- Rental properties (if not exists)
CREATE TABLE IF NOT EXISTS properties (
  id INT PRIMARY KEY AUTO_INCREMENT,
  property_name VARCHAR(255) NOT NULL,
  address TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tenants (if not exists)
CREATE TABLE IF NOT EXISTS tenants (
  id INT PRIMARY KEY AUTO_INCREMENT,
  tenant_name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Rental payments (if not exists)
CREATE TABLE IF NOT EXISTS rental_payments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  property_id INT NOT NULL,
  tenant_id INT NOT NULL,
  amount_expected DECIMAL(10, 2) NOT NULL,
  amount_received DECIMAL(10, 2) DEFAULT 0,
  payment_date DATE NOT NULL,
  due_date DATE,
  reconciliation_status ENUM('unmatched', 'matched', 'disputed') DEFAULT 'unmatched',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (property_id) REFERENCES properties(id),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  INDEX idx_reconciliation_status (reconciliation_status),
  INDEX idx_payment_date (payment_date),
  INDEX idx_amount_expected (amount_expected)
);

-- Reconciliation linking table
CREATE TABLE IF NOT EXISTS payment_reconciliations (
  id INT PRIMARY KEY AUTO_INCREMENT,
  bank_transaction_id INT NOT NULL,
  rental_payment_id INT NOT NULL,
  match_confidence DECIMAL(3, 2),
  match_method ENUM('auto', 'manual') DEFAULT 'auto',
  reconciled_by INT,
  reconciled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  FOREIGN KEY (bank_transaction_id) REFERENCES imported_transactions(id) ON DELETE CASCADE,
  FOREIGN KEY (rental_payment_id) REFERENCES rental_payments(id) ON DELETE CASCADE,
  UNIQUE KEY unique_transaction_match (bank_transaction_id, rental_payment_id),
  INDEX idx_rental_payment (rental_payment_id),
  INDEX idx_reconciled_at (reconciled_at)
);
