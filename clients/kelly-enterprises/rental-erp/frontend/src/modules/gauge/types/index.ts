import { EquipmentRules } from '../../../infrastructure/business/equipmentRules';

// Equipment type enum
export type EquipmentType = 'thread_gauge' | 'hand_tool' | 'large_equipment' | 'calibration_standard';

// Gauge category interface
export interface GaugeCategory {
  id: number;
  name: string;
  equipment_type: string;
  prefix: string;
  display_order: number;
}

// Gauge creation data interface
export interface GaugeCreationData {
  // Common fields
  serial_number: string; // REQUIRED - User must always provide serial number (becomes gauge_id in database)
  name?: string;
  displayName?: string; // Computed display name from backend
  category_id?: string;
  category_name?: string;
  equipment_type?: EquipmentType;
  storage_location?: string;
  manufacturer?: string;
  model_number?: string;
  ownership_type?: 'company' | 'employee' | 'customer';
  notes?: string;
  
  // Thread gauge specific
  thread_type?: string;  // The category: standard, metric, npt, etc.
  thread_form?: string;  // The specific form: UN, UNF, NPT, M, etc.
  thread_size?: string;
  thread_class?: string;
  create_option?: 'GO' | 'NO GO' | 'Both';
  go_serial_number?: string;
  nogo_serial_number?: string;
  is_sealed?: boolean;
  unsealed_date?: string;
  
  // Hand tool / Large equipment
  measurement_range_min?: number;
  measurement_range_max?: number;
  measurement_unit?: string;
  resolution_value?: number;
  accuracy_value?: string;
  calibration_frequency_days?: number;
  
  // Calibration standard
  certification_number?: string;
  traceability_info?: string;
}

// Gauge module type definitions
export interface Gauge {
  id: string;
  gauge_id: string; // Universal public identifier (serial number for thread gauges, system-generated for others)
  set_id?: string | null; // Thread gauge set grouping (e.g., "SP1001") - thread gauges only
  name: string;
  displayName?: string; // Computed display name from backend (replaces standardized_name)
  category_id: string;
  category_name?: string; // New field
  equipment_type: EquipmentType; // Backend provides this field
  gauge_suffix?: 'A' | 'B' | null;
  is_spare: boolean;
  status: GaugeStatus;
  is_sealed?: number | boolean; // Backend returns 1/0
  seal_status?: 'sealed' | 'unsealed'; // Legacy compatibility
  unsealed_at?: string;
  calibration_due_date?: string;
  calibration_status?: 'Expired' | 'Due Soon' | 'Current';
  storage_location: string;
  building_name?: string;
  facility_name?: string;
  zone_name?: string;
  notes?: string;
  qc_notes?: string; // Latest QC inspection notes (from gauge_qc_checks.findings)
  created_at: string;
  updated_at: string;
  
  // Additional fields for UI
  holder?: User;
  checked_out_to?: string;
  assigned_to_user_name?: string; // Name of user who has it checked out
  assigned_to_department?: string;
  returned_by_user_name?: string; // Name of user who returned it (for pending_qc status)
  checked_out_location?: string;
  checkout_date?: string;
  has_pending_transfer?: boolean;
  has_pending_unseal_request?: boolean | number;
  pending_transfer?: TransferData;
  pending_transfer_id?: string | number;
  transfer_to_user_id?: string | number;
  transfer_from_user_id?: string | number;
  transfer_to_user_name?: string;
  transfer_from_user_name?: string;
  ownership_type?: 'company' | 'employee' | 'customer';
  checkout_info?: CheckoutInfo;
  // Additional fields from backend
  owner_employee_name?: string;
  manufacturer?: string | null;
  model_number?: string | null;
  // Specification fields (from joined tables)
  measurement_range_min?: number | null;
  measurement_range_max?: number | null;
  measurement_unit?: string | null;
  resolution_value?: number | null;
  accuracy_value?: string | null;
  calibration_frequency_days?: number | null;
  last_calibration_date?: string | null;
  // Thread gauge specific fields
  thread_size?: string;
  thread_type?: string;  // The category: standard, metric, npt, etc.
  thread_form?: string;  // The specific form: UN, UNF, NPT, M, etc.
  thread_class?: string;
  is_go_gauge?: number | boolean; // 1 for GO, 0 for NO GO (from gauge_thread_specifications)
}

export type GaugeStatus =
  | 'available'
  | 'checked_out'
  | 'pending_qc'
  | 'pending_transfer'
  | 'calibration_due'
  | 'out_of_service'
  | 'pending_unseal'
  | 'retired'
  | 'out_for_calibration'
  | 'pending_certificate'
  | 'pending_release'
  | 'returned';

export interface CheckoutInfo {
  id: string;
  gauge_id: string;
  actor_user_id: string;
  target_user_id: string;
  notes?: string;
  status_at: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface CheckoutData {
  assigned_to_user_id?: number;
  assigned_to_department?: string;
  assignment_type?: 'checkout' | 'permanent' | 'temporary';
  expected_return?: string;
  // location field removed - not used in checkouts
  notes?: string;
}

export interface ReturnData {
  condition_at_return: 'excellent' | 'good' | 'fair' | 'poor' | 'damaged';
  return_notes?: string;
  usage_hours?: number;
  cross_user_acknowledged?: boolean;
}

export interface TransferData {
  to_user_id: string;
  reason: string;
  note?: string;
}

export interface UnsealRequest {
  id: string;
  gauge_id: string;
  requested_by: string;
  reason: string;
  status: 'pending' | 'approved' | 'denied' | 'cancelled';
  requested_at: string;
  created_at: string;
  status_changed_at?: string;
  status_changed_by?: string;
  // Fields from backend JOINs
  requester_name: string;
  requester_email: string;
  status_changed_by_name?: string;
  gauge_tag: string;
  gauge_name: string;
  equipment_type: string;
  is_sealed: number;
  set_id?: string; // Thread gauge set ID (e.g., "SP-0001")
}

export interface CalibrationRecord {
  id: string;
  gauge_id: string;
  method: 'external' | 'internal';
  passed: boolean;
  certificate_no?: string;
  performed_at: string;
  technician_id?: string;
  notes?: string;
  document_path?: string;
  created_at: string;
}

// Filter and sorting types
export interface GaugeFilters {
  status?: GaugeStatus;
  category?: string;
  storage_location?: string;
  search?: string;
  visibility?: 'all' | 'complete';
  ownershipType?: string;
  manufacturer?: string;
  calibrationStatus?: 'Current' | 'Due Soon' | 'Expired';
  calibrationStartDate?: string;
  calibrationEndDate?: string;
  sealedStatus?: 'sealed' | 'unsealed';
  equipment_type?: EquipmentType;
}

export interface GaugeSortOptions {
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

// API response types
export interface GaugeListResponse {
  data: Gauge[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  _links?: {
    self: string;
    first: string;
    last: string;
    next: string | null;
    prev: string | null;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errors?: string[];
}

// SERIAL NUMBER SYSTEM: Helper functions

/**
 * Get display name for a gauge
 * Returns gauge_id (which serves as the serial number/universal identifier)
 */
export function getGaugeDisplayName(gauge: Gauge): string {
  return gauge.gauge_id;
}

/**
 * Check if gauge is a spare thread gauge
 */
export function isSpareThreadGauge(gauge: Gauge): boolean {
  return EquipmentRules.isThreadGauge(gauge) && gauge.is_spare;
}

/**
 * Check if gauge is part of a thread gauge set
 */
export function isThreadGaugeSet(gauge: Gauge): boolean {
  return EquipmentRules.isThreadGauge(gauge)
    && gauge.gauge_id !== null
    && !!gauge.set_id;
}