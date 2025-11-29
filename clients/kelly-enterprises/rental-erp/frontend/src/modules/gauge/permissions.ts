// Gauge module permissions (8-permission system)
export const GAUGE_PERMISSIONS = {
  // Basic viewing (baseline access)
  VIEW: 'gauge.view.access',

  // Operations (baseline access - checkout, return, transfer)
  OPERATE: 'gauge.operate.execute',
  CHECKOUT: 'gauge.operate.execute',
  CHECKIN: 'gauge.operate.execute',
  TRANSFER: 'gauge.operate.execute',

  // Management (create, edit, retire gauges)
  MANAGE: 'gauge.manage.full',
  EDIT: 'gauge.manage.full',
  DELETE: 'gauge.manage.full',

  // Quality Control & Calibration
  CALIBRATION_MANAGE: 'calibration.manage.full',
  QC_VIEW: 'calibration.manage.full',
  QC_APPROVE: 'calibration.manage.full',

  // Special equipment visibility (requires admin)
  VIEW_LARGE_EQUIPMENT: 'system.admin.full',
  VIEW_CALIBRATION_STANDARDS: 'system.admin.full',

  // Administrative requests (part of operate or manage)
  UNSEAL_REQUEST: 'gauge.operate.execute',
  UNSEAL_APPROVE: 'calibration.manage.full',
} as const;

// Type for gauge permissions
export type GaugePermission = typeof GAUGE_PERMISSIONS[keyof typeof GAUGE_PERMISSIONS];