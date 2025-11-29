// Centralized modal configuration
// This file controls modal behavior across the entire application

import type { ModalCloseStrategy } from '../hooks/useModalOperations';

/**
 * Standard modal sizes (enforced across application)
 * These are the ONLY allowed modal sizes - no custom widths permitted
 */
export const MODAL_SIZES = {
  sm: { maxWidth: '384px', description: 'Small - Simple confirmations, alerts' },
  md: { maxWidth: '448px', description: 'Medium - Standard forms, simple content (DEFAULT)' },
  lg: { maxWidth: '672px', description: 'Large - Complex forms, detailed content' },
  xl: { maxWidth: '896px', description: 'Extra Large - Multi-column layouts, rich content' },
} as const;

/**
 * Type for valid modal sizes
 * This enforces that only standard sizes can be used
 */
export type ModalSize = keyof typeof MODAL_SIZES;

/**
 * Get the maxWidth value for a specific modal size
 */
export const getModalSize = (size: ModalSize = 'md'): string => {
  return MODAL_SIZES[size].maxWidth;
};

/**
 * Global modal configuration
 * Change these settings to affect all modals in the application
 */
export const MODAL_CONFIG = {
  /**
   * Default close strategy for all modals
   * - 'immediate': Close immediately (prevents double-clicks, best for data operations)
   * - 'delayed': Close after delay (shows success feedback)
   * - 'manual': Manual control (caller handles closing)
   */
  defaultCloseStrategy: 'immediate' as ModalCloseStrategy,
  
  /**
   * Default delay for 'delayed' strategy (in milliseconds)
   */
  defaultDelayMs: 1500,
  
  /**
   * Double-click protection settings
   */
  doubleClickProtection: {
    enabled: true,
    delayMs: 1000, // 1 second protection window
  },
  
  /**
   * Modal-specific overrides
   * Use this to customize behavior for specific modal types
   */
  overrides: {
    // Example: QC approvals might want to show success feedback
    // qcApprovals: { strategy: 'delayed', delayMs: 2000 },
    
    // Example: Critical operations might need manual control
    // criticalOperations: { strategy: 'manual' },
    
    // Example: Simple confirmations can close immediately
    // confirmations: { strategy: 'immediate' },
  }
} as const;

/**
 * Get modal configuration for a specific modal type
 * @param modalType - The type of modal (optional)
 * @returns Modal configuration
 */
export const getModalConfig = (modalType?: keyof typeof MODAL_CONFIG.overrides) => {
  const override = modalType ? MODAL_CONFIG.overrides[modalType] : undefined;
  
  return {
    strategy: override?.strategy || MODAL_CONFIG.defaultCloseStrategy,
    delayMs: override?.delayMs || MODAL_CONFIG.defaultDelayMs,
    doubleClickProtection: MODAL_CONFIG.doubleClickProtection,
  };
};

/**
 * Utility function to create modal operation hooks with consistent configuration
 */
export const createModalHook = (modalType?: keyof typeof MODAL_CONFIG.overrides) => {
  const config = getModalConfig(modalType);
  return {
    strategy: config.strategy,
    delayMs: config.delayMs,
  };
};