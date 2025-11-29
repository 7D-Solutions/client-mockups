import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAdmin } from '../context';
import { adminService } from '../services/adminService';
import { LoadingSpinner, Button, Modal, Badge, FormInput, FormCheckbox, FormTextarea, Icon, DataTable } from '../../../infrastructure/components';
import type { DataTableColumn } from '../../../infrastructure/components';
import { useColumnManager } from '../../../infrastructure/hooks';
import { Role, Permission, CreateRoleData } from '../types';
import { logger } from '../../../infrastructure/utils/logger';

export const RoleManagement: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { createRole, updateRole, deleteRole } = useAdmin();
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    window.scrollTo(0, 0);
    loadRolesAndPermissions();
  }, []);

  const loadRolesAndPermissions = async () => {
    try {
      setLoading(true);
      const [rolesData, permissionsData] = await Promise.all([
        adminService.getRoles(),
        adminService.getPermissions()
      ]);
      setRoles(rolesData);
      setPermissions(permissionsData);
    } catch (error) {
      logger.error('Failed to load roles and permissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRole = async (roleData: CreateRoleData) => {
    try {
      await createRole(roleData);
      await loadRolesAndPermissions();
      setShowCreateModal(false);
    } catch (error) {
      logger.error('Failed to create role:', error);
    }
  };

  const handleEditRole = async (roleId: string, roleData: Partial<Role>) => {
    try {
      await updateRole(roleId, roleData);
      await loadRolesAndPermissions();
      setShowEditModal(false);
      setSelectedRole(null);
    } catch (error) {
      logger.error('Failed to update role:', error);
    }
  };

  const [roleToDelete, setRoleToDelete] = useState<string | null>(null);

  const handleDeleteRole = async (roleId: string) => {
    setRoleToDelete(roleId);
  };

  const confirmDeleteRole = async () => {
    if (roleToDelete) {
      try {
        await deleteRole(roleToDelete);
        await loadRolesAndPermissions();
      } catch (error) {
        logger.error('Failed to delete role:', error);
      }
    }
    setRoleToDelete(null);
  };

  const filteredRoles = roles.filter(role =>
    role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    role.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Column definitions
  const columns: DataTableColumn[] = [
    {
      id: 'name',
      label: 'NAME',
      visible: true,
      locked: true,
      align: 'left',
      render: (_, role: Role) => (
        <div>
          <div style={{ fontWeight: '600', marginBottom: 'var(--space-1)' }}>
            {role.name}
          </div>
          <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-600)' }}>
            {role.description}
          </div>
        </div>
      )
    },
    {
      id: 'isActive',
      label: 'STATUS',
      visible: true,
      align: 'center',
      render: (value: boolean) => (
        <Badge variant={value ? 'success' : 'secondary'} size="sm">
          {value ? 'Active' : 'Inactive'}
        </Badge>
      )
    },
    {
      id: 'permissions',
      label: 'PERMISSIONS',
      visible: true,
      align: 'left',
      sortable: false,
      render: (value: string[], role: Role) => (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
          {role.permissions.length > 0 ? (
            role.permissions.slice(0, 3).map((permissionId) => {
              const permission = permissions.find(p => p.id === permissionId);
              return (
                <div
                  key={permissionId}
                  style={{
                    padding: 'var(--space-1) var(--space-2)',
                    backgroundColor: 'var(--color-primary-light)',
                    color: 'var(--color-primary-dark)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: 'var(--font-size-xs)'
                  }}
                >
                  {permission ? `${permission.module}:${permission.action}` : permissionId}
                </div>
              );
            })
          ) : (
            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-500)' }}>
              No permissions assigned
            </div>
          )}
          {role.permissions.length > 3 && (
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-500)' }}>
              +{role.permissions.length - 3} more
            </div>
          )}
        </div>
      )
    },
    {
      id: 'actions',
      filterable: false,
      label: 'ACTIONS',
      visible: true,
      align: 'center',
      sortable: false,
      render: (_, role: Role) => (
        <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'center' }}
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            onClick={() => {
              setSelectedRole(role);
              setShowEditModal(true);
            }}
            size="sm"
            variant="secondary"
          >
            Edit
          </Button>
          <Button
            onClick={() => handleDeleteRole(role.id)}
            size="sm"
            variant="danger"
          >
            Delete
          </Button>
        </div>
      )
    }
  ];

  // Column manager for table customization
  const columnManager = useColumnManager('role-management', columns);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div style={{ padding: 'var(--space-6)', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{
        background: 'white',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: 'var(--space-6)',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <Button
              onClick={() => navigate(-1)}
              variant="secondary"
              size="sm"
              style={{ padding: 'var(--space-2)' }}
            >
              <Icon name="arrow-left" />
            </Button>
            <h2 style={{ margin: 0, fontSize: 'var(--font-size-xl)', fontWeight: '600' }}>
              Role Management
            </h2>
          </div>
          <Button onClick={() => setShowCreateModal(true)} variant="primary">
            Add New Role
          </Button>
        </div>

        {/* Search */}
        <div style={{ padding: 'var(--space-4)', borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-gray-50)' }}>
          <FormInput
            type="text"
            placeholder="Search roles..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ maxWidth: '300px' }}
          />
        </div>

        {/* DataTable */}
        <DataTable
          tableId="role-management"
          columns={columns}
          data={filteredRoles}
          columnManager={columnManager}
          itemsPerPage={50}
          emptyMessage={searchTerm ? 'No roles match your search criteria.' : 'No roles found.'}
          resetKey={location.pathname}
        />
      </div>

      {/* Create Role Modal */}
      {showCreateModal && (
        <CreateRoleModal
          permissions={permissions}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateRole}
        />
      )}

      {/* Edit Role Modal */}
      {showEditModal && selectedRole && (
        <EditRoleModal
          role={selectedRole}
          permissions={permissions}
          onClose={() => {
            setShowEditModal(false);
            setSelectedRole(null);
          }}
          onSubmit={(roleData) => handleEditRole(selectedRole.id, roleData)}
        />
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!roleToDelete}
        onClose={() => setRoleToDelete(null)}
        title="Delete Role"
        size="sm"
      >
        <div style={{ padding: 'var(--space-4)' }}>
          <p style={{ marginBottom: 'var(--space-6)' }}>
            Are you sure you want to delete this role? This action cannot be undone.
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
            <Button
              onClick={() => setRoleToDelete(null)}
              variant="secondary"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmDeleteRole}
              variant="danger"
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

// Create Role Modal Component
const CreateRoleModal: React.FC<{
  permissions: Permission[];
  onClose: () => void;
  onSubmit: (roleData: CreateRoleData) => void;
}> = ({ permissions, onClose, onSubmit }) => {
  const [formData, setFormData] = useState<CreateRoleData>({
    name: '',
    description: '',
    permissions: []
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handlePermissionToggle = (permissionId: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permissionId)
        ? prev.permissions.filter(id => id !== permissionId)
        : [...prev.permissions, permissionId]
    }));
  };

  // Group permissions by module
  const groupedPermissions = permissions.reduce((acc, permission) => {
    if (!acc[permission.module]) {
      acc[permission.module] = [];
    }
    acc[permission.module].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>);

  return (
    <Modal isOpen onClose={onClose} title="Create New Role" size="lg">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <div>
          <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: 'var(--font-size-sm)', fontWeight: '600' }}>
            Role Name
          </label>
          <FormInput
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
        </div>

        <FormTextarea
          label="Description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={3}
          required
        />

        <div>
          <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: 'var(--font-size-sm)', fontWeight: '600' }}>
            Permissions
          </label>
          <div style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3)' }}>
            {Object.entries(groupedPermissions).map(([module, modulePermissions]) => (
              <div key={module} style={{ marginBottom: 'var(--space-4)' }}>
                <h4 style={{ margin: '0 0 var(--space-2) 0', fontSize: 'var(--font-size-md)', fontWeight: '600', color: 'var(--color-primary)' }}>
                  {module}
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  {modulePermissions.map((permission) => (
                    <FormCheckbox
                      key={permission.id}
                      checked={formData.permissions.includes(permission.id)}
                      onChange={() => handlePermissionToggle(permission.id)}
                      label={`${permission.action} - ${permission.description}`}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', marginTop: 'var(--space-4)' }}>
          <Button type="button" onClick={onClose} variant="secondary">
            Cancel
          </Button>
          <Button type="submit">
            Create Role
          </Button>
        </div>
      </form>
    </Modal>
  );
};

// Edit Role Modal Component
const EditRoleModal: React.FC<{
  role: Role;
  permissions: Permission[];
  onClose: () => void;
  onSubmit: (roleData: Partial<Role>) => void;
}> = ({ role, permissions, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    name: role.name,
    description: role.description,
    permissions: [...role.permissions],
    isActive: role.isActive
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handlePermissionToggle = (permissionId: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permissionId)
        ? prev.permissions.filter(id => id !== permissionId)
        : [...prev.permissions, permissionId]
    }));
  };

  // Group permissions by module
  const groupedPermissions = permissions.reduce((acc, permission) => {
    if (!acc[permission.module]) {
      acc[permission.module] = [];
    }
    acc[permission.module].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>);

  return (
    <Modal isOpen onClose={onClose} title="Edit Role" size="lg">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <div>
          <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: 'var(--font-size-sm)', fontWeight: '600' }}>
            Role Name
          </label>
          <FormInput
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
        </div>

        <FormTextarea
          label="Description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={3}
          required
        />

        <FormCheckbox
          checked={formData.isActive}
          onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
          label="Active"
        />

        <div>
          <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: 'var(--font-size-sm)', fontWeight: '600' }}>
            Permissions
          </label>
          <div style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3)' }}>
            {Object.entries(groupedPermissions).map(([module, modulePermissions]) => (
              <div key={module} style={{ marginBottom: 'var(--space-4)' }}>
                <h4 style={{ margin: '0 0 var(--space-2) 0', fontSize: 'var(--font-size-md)', fontWeight: '600', color: 'var(--color-primary)' }}>
                  {module}
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  {modulePermissions.map((permission) => (
                    <FormCheckbox
                      key={permission.id}
                      checked={formData.permissions.includes(permission.id)}
                      onChange={() => handlePermissionToggle(permission.id)}
                      label={`${permission.action} - ${permission.description}`}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', marginTop: 'var(--space-4)' }}>
          <Button type="button" onClick={onClose} variant="secondary">
            Cancel
          </Button>
          <Button type="submit">
            Save Changes
          </Button>
        </div>
      </form>
    </Modal>
  );
};
