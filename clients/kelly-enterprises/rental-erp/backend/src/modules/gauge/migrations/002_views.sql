-- Compatibility view: exposes calibration_due_date and synonyms expected by services
CREATE OR REPLACE VIEW v_gauge_calibrations AS
SELECT
  id,
  gauge_id,
  calibration_date,
  due_date AS calibration_due_date,
  certificate_number,
  calibrated_by,
  calibration_company,
  passed AS calibration_result,
  notes AS calibration_notes,
  document_path,
  created_at,
  created_by
FROM gauge_calibrations;