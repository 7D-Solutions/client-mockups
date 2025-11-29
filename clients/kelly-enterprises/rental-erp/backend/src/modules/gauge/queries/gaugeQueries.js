const GAUGE_WITH_RELATIONS = `
  SELECT g.*,
    gac.checked_out_to,
    gac.checkout_date,
    gac.expected_return,
    u.name as assigned_to_user_name,
    gt.id as pending_transfer_id,
    gt.to_user_id as transfer_to_user_id,
    gt.from_user_id as transfer_from_user_id,
    CASE WHEN gt.id IS NOT NULL THEN 1 ELSE 0 END as has_pending_transfer,
    tu.name as transfer_to_user_name,
    fu.name as transfer_from_user_name,
    gur.id as pending_unseal_request_id,
    CASE WHEN gur.id IS NOT NULL THEN 1 ELSE 0 END as has_pending_unseal_request,
    gcs.next_due_date as calibration_due_date,
    gcs.frequency_days as calibration_frequency_days,
    CASE
      WHEN gcs.next_due_date IS NULL THEN NULL
      WHEN gcs.next_due_date < CURDATE() THEN 'Expired'
      WHEN gcs.next_due_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY) THEN 'Due Soon'
      ELSE 'Current'
    END as calibration_status,
    gc_latest.calibration_date as last_calibration_date,
    ts.thread_size,
    ts.thread_type,
    ts.thread_form,
    ts.thread_class,
    ts.gauge_type,
    ts.thread_hand,
    ts.acme_starts,
    ts.is_go_gauge,
    JSON_UNQUOTE(JSON_EXTRACT(qc_latest.findings, '$.notes')) as qc_notes,
    icl.current_location as storage_location,
    b.building_name,
    f.facility_name,
    z.zone_name
  FROM gauges g
  LEFT JOIN gauge_active_checkouts gac ON g.id = gac.gauge_id
  LEFT JOIN core_users u ON gac.checked_out_to = u.id
  LEFT JOIN gauge_transfers gt ON g.id = gt.gauge_id AND gt.status = 'pending'
  LEFT JOIN core_users tu ON gt.to_user_id = tu.id
  LEFT JOIN core_users fu ON gt.from_user_id = fu.id
  LEFT JOIN gauge_unseal_requests gur ON g.id = gur.gauge_id AND gur.status = 'pending'
  LEFT JOIN gauge_calibration_schedule gcs ON g.id = gcs.gauge_id AND gcs.is_active = 1
  LEFT JOIN (
    SELECT gauge_id, MAX(calibration_date) as calibration_date
    FROM gauge_calibrations
    GROUP BY gauge_id
  ) gc_latest ON g.id = gc_latest.gauge_id
  LEFT JOIN gauge_thread_specifications ts ON g.id = ts.gauge_id
  LEFT JOIN (
    SELECT gauge_id, findings, check_date
    FROM gauge_qc_checks
    WHERE (gauge_id, check_date) IN (
      SELECT gauge_id, MAX(check_date)
      FROM gauge_qc_checks
      GROUP BY gauge_id
    )
  ) qc_latest ON g.id = qc_latest.gauge_id
  LEFT JOIN inventory_current_locations icl ON icl.item_type = 'gauge' AND icl.item_identifier COLLATE utf8mb4_unicode_ci = g.gauge_id COLLATE utf8mb4_unicode_ci
  LEFT JOIN storage_locations sl ON icl.current_location = sl.location_code
  LEFT JOIN buildings b ON sl.building_id = b.id
  LEFT JOIN facilities f ON b.facility_id = f.id
  LEFT JOIN zones z ON sl.zone_id = z.id`;

module.exports = {
  GAUGE_WITH_RELATIONS,
  
  buildGaugeQuery: (whereClause = '', params = []) => ({
    sql: `${GAUGE_WITH_RELATIONS} ${whereClause}`,
    params
  })
};