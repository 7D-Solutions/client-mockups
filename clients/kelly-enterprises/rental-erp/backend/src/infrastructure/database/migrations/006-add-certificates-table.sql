-- Migration: Add certificates table for tracking calibration certificates
-- This allows custom naming and proper management of multiple certificates per gauge

CREATE TABLE IF NOT EXISTS certificates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  gauge_id INT NOT NULL,
  dropbox_path VARCHAR(500) NOT NULL,
  custom_name VARCHAR(255) NULL,
  file_size INT NOT NULL,
  file_extension VARCHAR(10) NOT NULL,
  uploaded_by INT NOT NULL,
  uploaded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Indexes for performance
  INDEX idx_gauge_id (gauge_id),
  INDEX idx_uploaded_at (uploaded_at),

  -- Foreign keys
  FOREIGN KEY (gauge_id) REFERENCES gauges(id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by) REFERENCES core_users(id) ON DELETE RESTRICT,

  -- Ensure unique Dropbox paths
  UNIQUE KEY unique_dropbox_path (dropbox_path)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add comment for documentation
ALTER TABLE certificates COMMENT = 'Tracks calibration certificates with custom names and metadata';
