// For Claude: Shared component for permission selection UI
// Used by both AddUserModal (Step 2) and PermissionManagementModal
import React, { useState, useEffect, useCallback } from 'react';
import { adminService } from '../services/adminService';
import { useLogger } from '../../../infrastructure/utils/logger';
import { Tooltip } from '../../../infrastructure';
import styles from './PermissionSelector.module.css';

interface Permission {
  id: number;
  module_id: string;
  resource: string;
  action: string;
  description: string;
}

interface PermissionSelectorProps {
  selectedPermissions: Set<number>;
  onPermissionsChange: (permissions: Set<number>) => void;
  disabled?: boolean;
  showPendingChanges?: boolean;
  initialPermissions?: Set<number>;
}

// Permission dependencies: key requires all values to be checked
const PERMISSION_DEPENDENCIES: Record<string, string[]> = {
  'gauge.operate.execute': ['gauge.view.access'],
  'gauge.manage.full': ['gauge.view.access'],
  'calibration.manage.full': ['gauge.manage.full'],
  'inventory.manage.full': ['inventory.view.access'],
  'system.admin.full': ['user.manage.full']
};

// Role templates for quick setup
const ROLE_TEMPLATES: Record<string, string[]> = {
  operator: ['gauge.view.access', 'gauge.operate.execute', 'inventory.view.access'],
  qc: ['gauge.view.access', 'gauge.operate.execute', 'gauge.manage.full', 'calibration.manage.full', 'data.export.execute', 'audit.view.access', 'inventory.view.access', 'inventory.manage.full'],
  admin: ['gauge.view.access', 'gauge.operate.execute', 'gauge.manage.full', 'calibration.manage.full', 'user.manage.full', 'audit.view.access', 'data.export.execute', 'inventory.view.access', 'inventory.manage.full'],
  itadmin: ['user.manage.full', 'system.admin.full'],
  superadmin: ['gauge.view.access', 'gauge.operate.execute', 'gauge.manage.full', 'calibration.manage.full', 'user.manage.full', 'system.admin.full', 'audit.view.access', 'data.export.execute', 'inventory.view.access', 'inventory.manage.full']
};

// Role template descriptions for tooltips
const ROLE_TEMPLATE_TOOLTIPS: Record<string, string> = {
  operator: 'Basic production user: View gauges, operate gauges in production, view inventory',
  qc: 'Quality Control: All operator permissions plus manage gauges, manage calibrations, export data, view audit logs, and manage inventory',
  admin: 'Administrator: All QC permissions plus manage users (create accounts, assign permissions)',
  itadmin: 'IT Administrator: Manage users and full system administration',
  superadmin: 'Super Administrator: All system permissions including full administrative access'
};

// Define functional grouping (matching current PermissionManagementModal)
const FUNCTIONAL_GROUPS = {
  'basic': {
    title: 'Basic Access',
    icon: '👀',
    description: 'Essential permissions for all users to view and operate gauges',
    permissions: ['gauge.view.access', 'gauge.operate.execute', 'audit.view.access']
  },
  'management': {
    title: 'Management',
    icon: '🔧',
    description: 'Create, edit, and manage gauges and calibration records',
    permissions: ['gauge.manage.full', 'calibration.manage.full', 'data.export.execute']
  },
  'inventory': {
    title: 'Inventory',
    icon: '📦',
    description: 'View and manage inventory locations, movements, and tracking',
    permissions: ['inventory.view.access', 'inventory.manage.full']
  },
  'administration': {
    title: 'Administration',
    icon: '⚙️',
    description: 'System configuration, user management, and full system access',
    permissions: ['user.manage.full', 'system.admin.full']
  }
};

export const PermissionSelector: React.FC<PermissionSelectorProps> = ({
  selectedPermissions,
  onPermissionsChange,
  disabled = false,
  showPendingChanges = false,
  initialPermissions = new Set()
}) => {
  const logger = useLogger('PermissionSelector');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dependencyWarning, setDependencyWarning] = useState('');
  const [warningGroupKey, setWarningGroupKey] = useState<string | null>(null);
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);

  // Helper to get permission key from permission object
  const getPermissionKey = (perm: Permission): string => {
    return `${perm.module_id}.${perm.resource}.${perm.action}`;
  };

  // Helper to find permission ID by key
  const findPermissionIdByKey = (key: string): number | undefined => {
    const perm = allPermissions.find(p => getPermissionKey(p) === key);
    return perm?.id;
  };

  // Helper to find which group a permission belongs to
  const findGroupKeyForPermission = (permKey: string): string | null => {
    for (const [key, group] of Object.entries(FUNCTIONAL_GROUPS)) {
      if (group.permissions.includes(permKey)) {
        return key;
      }
    }
    return null;
  };

  // Helper to get permission label with hint
  const getPermissionLabel = (perm: Permission): { name: string; hint: string; tooltip: string } => {
    const permKey = getPermissionKey(perm);

    const labels: Record<string, { name: string; hint: string; tooltip: string }> = {
      'gauge.view.access': {
        name: 'View Gauges',
        hint: 'See gauge list and details',
        tooltip: 'Allows user to view the gauge inventory, search for gauges, and see gauge details including calibration history'
      },
      'gauge.operate.execute': {
        name: 'Operate Gauges',
        hint: 'Use gauges in production',
        tooltip: 'Allows user to mark gauges as in-use, return them, and log gauge usage in production work orders'
      },
      'gauge.manage.full': {
        name: 'Manage Gauges',
        hint: 'Create, edit, retire gauges',
        tooltip: 'Allows user to add new gauges, edit gauge details, change gauge status, and retire gauges from inventory'
      },
      'calibration.manage.full': {
        name: 'Manage Calibrations',
        hint: 'Record calibration data',
        tooltip: 'Allows user to create calibration records, upload certificates, and manage calibration schedules'
      },
      'user.manage.full': {
        name: 'Manage Users',
        hint: 'Create and edit user accounts',
        tooltip: 'Allows user to create new accounts, edit user details, assign permissions, and manage user access'
      },
      'system.admin.full': {
        name: 'System Admin',
        hint: 'Full system control',
        tooltip: 'Grants full administrative access to all system settings, configurations, and maintenance tools'
      },
      'audit.view.access': {
        name: 'View Audit Logs',
        hint: 'See system activity history',
        tooltip: 'Allows user to view audit logs and track changes made to gauges, calibrations, and system settings'
      },
      'data.export.execute': {
        name: 'Export Data',
        hint: 'Download reports and data',
        tooltip: 'Allows user to export gauge data, calibration reports, and audit logs to Excel or PDF format'
      },
      'inventory.view.access': {
        name: 'View Inventory',
        hint: 'See inventory locations and items',
        tooltip: 'Allows user to view inventory dashboard, storage locations, item movements, and tracking history'
      },
      'inventory.manage.full': {
        name: 'Manage Inventory',
        hint: 'Move and manage inventory items',
        tooltip: 'Allows user to move items between locations, create/delete inventory records, and manage storage locations'
      }
    };

    return labels[permKey] || { name: `${perm.resource} ${perm.action}`, hint: perm.description, tooltip: perm.description };
  };

  const loadPermissions = useCallback(async (retryCount = 0) => {
    setLoading(true);
    setError('');
    try {
      const allPerms = await adminService.getPermissions();
      setAllPermissions(allPerms);
    } catch (err: unknown) {
      // Retry on 503 (database not ready) up to 3 times
      const error = err as { response?: { status?: number; data?: { message?: string; error?: string } } };
      if (error.response?.status === 503 && retryCount < 3) {
        logger.warn(`Database not ready, retrying... (attempt ${retryCount + 1}/3)`);
        await new Promise(resolve => setTimeout(resolve, 1500));
        return loadPermissions(retryCount + 1);
      }

      logger.errorWithStack('Failed to load permissions', err);
      setError(error.response?.data?.message || error.response?.data?.error || 'Failed to load permissions');
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadPermissions();
  }, [loadPermissions]);

  // Apply a role template
  const applyRoleTemplate = (role: keyof typeof ROLE_TEMPLATES) => {
    const templateKeys = ROLE_TEMPLATES[role];
    const newPermissions = new Set<number>();

    templateKeys.forEach(key => {
      const permId = findPermissionIdByKey(key);
      if (permId !== undefined) {
        newPermissions.add(permId);
      }
    });

    onPermissionsChange(newPermissions);
    setDependencyWarning('');
    setWarningGroupKey(null);
  };

  // Clear all permissions
  const clearAllPermissions = () => {
    onPermissionsChange(new Set());
    setDependencyWarning('');
    setWarningGroupKey(null);
  };

  // Auto-check dependencies recursively
  const autoCheckDependencies = (permissionKey: string, currentPerms: Set<number>): Set<number> => {
    const newPerms = new Set(currentPerms);
    const deps = PERMISSION_DEPENDENCIES[permissionKey] || [];

    deps.forEach(depKey => {
      const depId = findPermissionIdByKey(depKey);
      if (depId !== undefined && !newPerms.has(depId)) {
        newPerms.add(depId);
        const nestedDeps = autoCheckDependencies(depKey, newPerms);
        nestedDeps.forEach(id => newPerms.add(id));
      }
    });

    return newPerms;
  };

  const handlePermissionToggle = (permissionId: number) => {
    const perm = allPermissions.find(p => p.id === permissionId);
    if (!perm) return;

    const permKey = getPermissionKey(perm);
    const hasPermission = selectedPermissions.has(permissionId);
    setDependencyWarning('');
    setWarningGroupKey(null);

    if (!hasPermission) {
      // Checking a permission - auto-check dependencies
      let newPermissions = new Set(selectedPermissions);
      newPermissions.add(permissionId);
      newPermissions = autoCheckDependencies(permKey, newPermissions);
      onPermissionsChange(newPermissions);
    } else {
      // Unchecking a permission - check if anything depends on it
      const dependentPerms = Object.entries(PERMISSION_DEPENDENCIES)
        .filter(([_, deps]) => deps.includes(permKey))
        .map(([key, _]) => key)
        .map(key => findPermissionIdByKey(key))
        .filter((id): id is number => id !== undefined && selectedPermissions.has(id));

      if (dependentPerms.length > 0) {
        const dependentLabels = dependentPerms
          .map(id => {
            const p = allPermissions.find(ap => ap.id === id);
            return p ? `"${getPermissionLabel(p).name}"` : '';
          })
          .filter(Boolean)
          .join(', ');

        setDependencyWarning(
          `Cannot remove "${getPermissionLabel(perm).name}" while ${dependentLabels} ${dependentPerms.length === 1 ? 'is' : 'are'} granted. Remove dependent permissions first.`
        );

        const groupKey = findGroupKeyForPermission(permKey);
        setWarningGroupKey(groupKey);
        return;
      }

      // Remove the permission
      const newPermissions = new Set(selectedPermissions);
      newPermissions.delete(permissionId);
      onPermissionsChange(newPermissions);
    }
  };

  const getPermissionStatus = (permissionId: number) => {
    const hasPermission = selectedPermissions.has(permissionId);
    const hadPermission = initialPermissions.has(permissionId);

    if (hasPermission && !hadPermission) return 'pending-add';
    if (!hasPermission && hadPermission) return 'pending-remove';
    if (hasPermission) return 'active';
    return 'inactive';
  };

  const closeDependencyWarning = () => {
    setDependencyWarning('');
    setWarningGroupKey(null);
  };

  // Group permissions by function
  const groupedPermissions = Object.entries(FUNCTIONAL_GROUPS).map(([key, group]) => {
    const perms = group.permissions
      .map(permKey => allPermissions.find(perm => getPermissionKey(perm) === permKey))
      .filter((perm): perm is Permission => perm !== undefined);
    return { key, ...group, permissions: perms };
  });

  // Calculate pending changes
  const pendingChanges = {
    toAdd: new Set(Array.from(selectedPermissions).filter(id => !initialPermissions.has(id))),
    toRemove: new Set(Array.from(initialPermissions).filter(id => !selectedPermissions.has(id)))
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.loadingText}>Loading permissions...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.error}>
        {error}
      </div>
    );
  }

  return (
    <>
      <div className={styles.infoBox}>
        <strong className={styles.infoBoxTitle}>Quick Setup:</strong>
        <p className={styles.infoBoxText}>
          Use role templates below for common permission sets, or manually select individual permissions.
        </p>
      </div>

      <div className={styles.templateSection}>
        <h3 className={styles.templateHeader}>
          Role Templates
        </h3>
        <div className={styles.templateButtons}>
          {[
            { key: 'operator', icon: '👤', label: 'Operator' },
            { key: 'qc', icon: '📋', label: 'QC' },
            { key: 'admin', icon: '👔', label: 'Admin' },
            { key: 'itadmin', icon: '💻', label: 'IT Admin' },
            { key: 'superadmin', icon: '⭐', label: 'Super Admin' }
          ].map(template => (
            <Tooltip
              key={template.key}
              content={ROLE_TEMPLATE_TOOLTIPS[template.key] || ''}
              position="top"
            >
              <button
                onClick={() => applyRoleTemplate(template.key as keyof typeof ROLE_TEMPLATES)}
                disabled={disabled}
                className={styles.templateButton}
              >
                <span className={styles.templateIcon}>{template.icon}</span> {template.label}
              </button>
            </Tooltip>
          ))}
          <Tooltip
            content="Remove all selected permissions"
            position="top"
          >
            <button
              onClick={clearAllPermissions}
              disabled={disabled}
              className={styles.templateButton}
            >
              <span className={styles.templateIcon}>🗑️</span> Clear All
            </button>
          </Tooltip>
        </div>
      </div>

      <div className={styles.container}>
        {groupedPermissions.map((group) => {
          const showWarningForThisGroup = dependencyWarning && warningGroupKey === group.key;

          return (
            <React.Fragment key={group.key}>
              {showWarningForThisGroup && (
                <div className={styles.warningBox}>
                  <span className={styles.warningIcon}>⚠️</span>
                  <div className={styles.warningContent}>
                    <strong className={styles.warningTitle}>Cannot Remove Permission</strong>
                    <span>{dependencyWarning}</span>
                  </div>
                  <button
                    onClick={closeDependencyWarning}
                    className={styles.warningClose}
                  >
                    ✕
                  </button>
                </div>
              )}

              <div className={styles.groupCard}>
                <div className={styles.groupHeader}>
                  <div className={styles.groupIconBox}>
                    {group.icon}
                  </div>
                  <div className={styles.groupInfo}>
                    <div className={styles.groupTitle}>
                      {group.title}
                    </div>
                    <div className={styles.groupDescription}>
                      {group.description}
                    </div>
                  </div>
                </div>
                <div className={styles.permissionGrid}>
                  {group.permissions.map((perm) => {
                    const status = getPermissionStatus(perm.id);
                    const label = getPermissionLabel(perm);
                    const isAddPending = status === 'pending-add';
                    const isRemovePending = status === 'pending-remove';

                    return (
                      <Tooltip
                        key={perm.id}
                        content={label.tooltip}
                        position="top"
                      >
                        <div
                          className={`${styles.permissionItem} ${isAddPending ? styles.pendingAdd : ''} ${isRemovePending ? styles.pendingRemove : ''}`}
                        >
                          <input
                            type="checkbox"
                            id={`perm-${perm.id}`}
                            checked={status === 'active' || status === 'pending-add'}
                            onChange={() => handlePermissionToggle(perm.id)}
                            disabled={disabled}
                            className={styles.permissionCheckbox}
                          />
                          <label
                            htmlFor={`perm-${perm.id}`}
                            className={`${styles.permissionLabel} ${disabled ? styles.disabled : ''}`}
                          >
                            <div className={styles.permissionName}>
                              {label.name}
                            </div>
                            <div className={styles.permissionHint}>
                              {label.hint}
                            </div>
                          </label>
                          {isAddPending && showPendingChanges && (
                            <span className={`${styles.permissionBadge} ${styles.new}`}>
                              NEW
                            </span>
                          )}
                          {isRemovePending && showPendingChanges && (
                            <span className={`${styles.permissionBadge} ${styles.remove}`}>
                              REMOVE
                            </span>
                          )}
                        </div>
                      </Tooltip>
                    );
                  })}
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </div>

      {showPendingChanges && (pendingChanges.toAdd.size > 0 || pendingChanges.toRemove.size > 0) && (
        <div className={styles.pendingChanges}>
          <h4 className={styles.pendingChangesTitle}>
            📋 Pending Changes
          </h4>
          <div className={styles.pendingChangesContent}>
            <div className={`${styles.pendingItem} ${styles.add}`}>
              <span>✅</span>
              <span>Granting <strong>{pendingChanges.toAdd.size}</strong> {pendingChanges.toAdd.size === 1 ? 'permission' : 'permissions'}</span>
            </div>
            <div className={`${styles.pendingItem} ${styles.remove}`}>
              <span>❌</span>
              <span>Revoking <strong>{pendingChanges.toRemove.size}</strong> {pendingChanges.toRemove.size === 1 ? 'permission' : 'permissions'}</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
