/**
 * Status Badge Rules Engine
 * 
 * Centralized location for all status-related badge logic.
 * Changes to status badge rules should ONLY be made here.
 * 
 * USAGE EXAMPLES:
 * 
 * Equipment Status Badge:
 * ```typescript
 * // ❌ DON'T DO THIS
 * <Badge variant={gauge.status === 'available' ? 'success' : gauge.status === 'out_of_service' ? 'error' : 'warning'}>
 *   {gauge.status?.replace(/_/g, ' ')}
 * </Badge>
 * 
 * // ✅ DO THIS INSTEAD
 * import { StatusRules } from '../infrastructure/business/statusRules';
 * <Badge variant={StatusRules.getStatusBadgeVariant(gauge)}>
 *   {StatusRules.getStatusDisplayText(gauge)}
 * </Badge>
 * ```
 * 
 * Transfer Status Badge:
 * ```typescript
 * // ❌ DON'T DO THIS
 * const variant = transfer.status?.toLowerCase() === 'pending' ? 'warning' : 'success';
 * 
 * // ✅ DO THIS INSTEAD
 * import { StatusRules } from '../infrastructure/business/statusRules';
 * const variant = StatusRules.getTransferStatusVariant(transfer.status);
 * ```
 * 
 * ESLINT ENFORCEMENT:
 * ESLint rules prevent direct status badge logic in components:
 * - status === comparisons for badge variants → Use StatusRules.getStatusBadgeVariant()
 * - status.toLowerCase() === comparisons → Use StatusRules methods
 * - Hardcoded badge variant assignments → Use appropriate StatusRules method
 */

export interface StatusItem {
  status?: string;
  calibration_status?: string;
  calibration_due_date?: string;
  [key: string]: any;
}

export interface TransferItem {
  status?: string;
  [key: string]: any;
}

/**
 * Status badge rule constants
 */
const CRITICAL_STATUSES = ['calibration_due', 'out_of_service', 'out_for_calibration', 'pending_certificate', 'returned'] as const;
const WARNING_STATUSES = ['due_soon', 'pending_qc', 'pending_release', 'pending_unseal', 'pending_transfer'] as const;
const INFO_STATUSES = ['checked_out'] as const;

/**
 * Transfer status mappings
 */
const TRANSFER_STATUS_MAPPING = {
  pending: 'warning',
  accepted: 'success', 
  rejected: 'danger',
  cancelled: 'secondary'
} as const;

/**
 * Status Rules Engine
 */
export const StatusRules = {
  /**
   * Gets badge variant for equipment/gauge status
   * Priority: Sealed > Calibration issues > Operational status > Default
   * @param item - Equipment object with status information
   * @returns Badge variant string
   */
  getStatusBadgeVariant(item: StatusItem): 'success' | 'warning' | 'danger' | 'info' | 'primary' | 'secondary' {
    if (!item) return 'secondary';

    // Check sealed status first (highest priority for display)
    if (this.isSealed(item)) return 'info';

    // Check calibration status (second priority)
    if (this.isCalibrationOverdue(item)) return 'danger';
    if (item.calibration_status === 'Due Soon') return 'warning';

    // Check operational status
    const status = item.status || 'available';

    if (CRITICAL_STATUSES.includes(status as any)) return 'danger';
    if (WARNING_STATUSES.includes(status as any)) return 'warning';
    if (INFO_STATUSES.includes(status as any)) return 'info';

    return 'success'; // Default for available and other statuses
  },

  /**
   * Gets display text for equipment/gauge status
   * @param item - Equipment object with status information
   * @returns Human-readable status text
   */
  getStatusDisplayText(item: StatusItem): string {
    if (!item) return 'Unknown';

    // Check sealed status first (highest priority for display)
    if (this.isSealed(item)) return 'Sealed';

    // Check calibration status (second priority)
    if (this.isCalibrationOverdue(item)) return 'CALIBRATION DUE';
    if (item.calibration_status === 'Due Soon') return 'DUE SOON';

    // Check operational status
    const status = item.status || 'available';

    switch (status) {
      case 'out_of_service':
        return 'OUT OF SERVICE';
      case 'calibration_due':
        return 'CALIBRATION DUE';
      case 'checked_out':
        return 'CHECKED OUT';
      case 'pending_qc':
        return 'PENDING QC';
      case 'due_soon':
        return 'DUE SOON';
      case 'maintenance':
        return 'MAINTENANCE';
      case 'out_for_calibration':
        return 'OUT FOR CALIBRATION';
      case 'pending_certificate':
        return 'PENDING CERTIFICATE';
      case 'pending_release':
        return 'PENDING RELEASE';
      case 'pending_unseal':
        return 'PENDING UNSEAL';
      case 'pending_transfer':
        return 'TRANSFER PENDING';
      case 'returned':
        return 'RETURNED';
      case 'available':
      default:
        return 'AVAILABLE';
    }
  },

  /**
   * Gets badge variant for transfer status
   * @param status - Transfer status string
   * @returns Badge variant string
   */
  getTransferStatusVariant(status?: string): 'success' | 'warning' | 'danger' | 'secondary' {
    if (!status) return 'secondary';
    
    const normalizedStatus = status.toLowerCase() as keyof typeof TRANSFER_STATUS_MAPPING;
    return TRANSFER_STATUS_MAPPING[normalizedStatus] || 'secondary';
  },

  /**
   * Determines if transfer is pending
   * @param transfer - Transfer object with status
   * @returns true if transfer is pending
   */
  isTransferPending(transfer: TransferItem): boolean {
    return transfer?.status?.toLowerCase() === 'pending';
  },

  /**
   * Determines if transfer is accepted
   * @param transfer - Transfer object with status
   * @returns true if transfer is accepted
   */
  isTransferAccepted(transfer: TransferItem): boolean {
    return transfer?.status?.toLowerCase() === 'accepted';
  },

  /**
   * Determines if transfer is rejected
   * @param transfer - Transfer object with status
   * @returns true if transfer is rejected
   */
  isTransferRejected(transfer: TransferItem): boolean {
    return transfer?.status?.toLowerCase() === 'rejected';
  },

  /**
   * Determines if calibration is overdue
   * @param item - Equipment object with calibration information
   * @returns true if calibration is overdue
   */
  isCalibrationOverdue(item: StatusItem): boolean {
    if (!item.calibration_due_date) return false;
    
    // Create new date objects to avoid modifying originals
    const dueDate = new Date(item.calibration_due_date);
    const today = new Date();
    
    // Set both dates to start of day for accurate comparison
    const dueDateNormalized = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
    const todayNormalized = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    // Check if calibration date has passed
    return dueDateNormalized < todayNormalized;
  },

  /**
   * Determines if equipment is available for operations
   * @param item - Equipment object
   * @returns true if equipment is available
   */
  isAvailable(item: StatusItem): boolean {
    return item?.status === 'available' && !this.isCalibrationOverdue(item);
  },

  /**
   * Determines if equipment is checked out
   * @param item - Equipment object
   * @returns true if equipment is checked out
   */
  isCheckedOut(item: StatusItem): boolean {
    return item?.status === 'checked_out';
  },

  /**
   * Determines if equipment is out of service
   * @param item - Equipment object
   * @returns true if equipment is out of service
   */
  isOutOfService(item: StatusItem): boolean {
    return item?.status === 'out_of_service';
  },

  /**
   * Determines if equipment is pending QC
   * @param item - Equipment object
   * @returns true if equipment is pending QC
   */
  isPendingQC(item: StatusItem): boolean {
    return item?.status === 'pending_qc';
  },

  /**
   * Determines if equipment is in maintenance
   * @param item - Equipment object
   * @returns true if equipment is in maintenance
   */
  isInMaintenance(item: StatusItem): boolean {
    return item?.status === 'maintenance';
  },

  /**
   * Determines if equipment has calibration due status
   * @param item - Equipment object
   * @returns true if equipment has calibration_due status
   */
  isCalibrationDueStatus(item: StatusItem): boolean {
    return item?.status === 'calibration_due';
  },

  /**
   * Determines if equipment is out for calibration
   * @param item - Equipment object
   * @returns true if equipment is out_for_calibration
   */
  isOutForCalibration(item: StatusItem): boolean {
    return item?.status === 'out_for_calibration';
  },

  /**
   * Determines if equipment is pending certificate
   * @param item - Equipment object
   * @returns true if equipment is pending_certificate
   */
  isPendingCertificate(item: StatusItem): boolean {
    return item?.status === 'pending_certificate';
  },

  /**
   * Determines if equipment is pending release
   * @param item - Equipment object
   * @returns true if equipment is pending_release
   */
  isPendingRelease(item: StatusItem): boolean {
    return item?.status === 'pending_release';
  },

  /**
   * Determines if equipment is returned from customer
   * @param item - Equipment object
   * @returns true if equipment is returned
   */
  isReturned(item: StatusItem): boolean {
    return item?.status === 'returned';
  },

  /**
   * Determines if equipment is pending unseal
   * @param item - Equipment object
   * @returns true if equipment is pending_unseal
   */
  isPendingUnseal(item: StatusItem): boolean {
    return item?.status === 'pending_unseal';
  },

  /**
   * Gets appropriate button variant for status-based actions
   * @param item - Equipment object
   * @returns Button variant for actions
   */
  getActionButtonVariant(item: StatusItem): 'primary' | 'success' | 'warning' | 'danger' | 'info' {
    if (this.isCheckedOut(item)) return 'success'; // Return/Checkin buttons
    if (this.isPendingQC(item)) return 'warning';   // Pending QC buttons
    if (this.isOutOfService(item)) return 'danger'; // Out of service buttons
    if (this.isCalibrationOverdue(item)) return 'danger'; // Calibration due buttons
    
    return 'primary'; // Default for checkout and other actions
  },

  // ==========================================
  // CALIBRATION STATUS METHODS
  // ==========================================

  /**
   * Check if calibration is expired
   * Centralized replacement for: gauge.calibration_status === 'Expired'
   */
  isCalibrationExpired(item: StatusItem): boolean {
    return item?.calibration_status === 'Expired';
  },

  /**
   * Check if calibration is due soon
   * Centralized replacement for: gauge.calibration_status === 'Due Soon'
   */
  isCalibrationDueSoon(item: StatusItem): boolean {
    return item?.calibration_status === 'Due Soon';
  },

  /**
   * Get calibration status badge variant
   * Centralized replacement for hardcoded calibration badge logic
   */
  getCalibrationBadgeVariant(item: StatusItem): 'danger' | 'warning' | 'success' | 'secondary' {
    if (!item) return 'secondary';
    if (this.isCalibrationExpired(item)) return 'danger';
    if (this.isCalibrationDueSoon(item)) return 'warning';
    return 'success';
  },

  /**
   * Get calibration status display text
   * Centralized replacement for hardcoded calibration text
   */
  getCalibrationDisplayText(item: StatusItem): string {
    if (!item) return 'Unknown';
    if (this.isCalibrationExpired(item)) return 'Calibration Due';
    if (this.isCalibrationDueSoon(item)) return 'Due Soon';
    return 'Current';
  },

  // ==========================================
  // SEAL STATUS METHODS  
  // ==========================================

  /**
   * Check if gauge is sealed
   * Centralized replacement for: gauge.is_sealed === 1 || gauge.is_sealed === true
   */
  isSealed(item: StatusItem): boolean {
    return item?.is_sealed === 1 || item?.is_sealed === true;
  },

  /**
   * Check if gauge has pending unseal request
   * Centralized replacement for: gauge.has_pending_unseal_request === 1 || gauge.has_pending_unseal_request === true
   */
  hasPendingUnsealRequest(item: StatusItem): boolean {
    return item?.has_pending_unseal_request === 1 || item?.has_pending_unseal_request === true;
  },

  /**
   * Check if gauge is sealed with pending unseal request
   * Common pattern in conditional logic
   */
  isSealedWithPendingUnseal(item: StatusItem): boolean {
    return this.isSealed(item) && this.hasPendingUnsealRequest(item);
  },

  /**
   * Get seal status badge variant
   * Centralized replacement for hardcoded seal badge logic
   */
  getSealBadgeVariant(item: StatusItem): 'info' | 'warning' | 'secondary' {
    if (!item) return 'secondary';
    if (this.hasPendingUnsealRequest(item)) return 'warning';
    if (this.isSealed(item)) return 'info';
    return 'secondary';
  },

  /**
   * Get seal status display text
   * Centralized replacement for hardcoded seal text
   */
  getSealDisplayText(item: StatusItem): string {
    if (!item) return 'Unknown';
    if (this.hasPendingUnsealRequest(item)) return 'Pending Unseal';
    if (this.isSealed(item)) return 'Sealed';
    return 'Unsealed';
  }
} as const;