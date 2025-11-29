import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useAdmin } from '../context';
import { adminService } from '../services/adminService';
import { useAuth } from '../../../infrastructure/auth';
import { LoadingSpinner, Button, Modal, FormInput, Badge, Pagination, DataTable, Icon } from '../../../infrastructure/components';
import type { DataTableColumn } from '../../../infrastructure/components';
import { useColumnManager } from '../../../infrastructure/hooks';
import { useLogger } from '../../../infrastructure/utils/logger';
import { usePagination } from '../../../infrastructure/hooks/usePagination';
import { User, CreateUserData } from '../types';
import { AddUserModal, UserDetailsModal, ResetPasswordModal, PermissionManagementModal } from '../components';
import styles from './UserManagement.module.css';

export const UserManagement: React.FC = () => {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user: currentUser } = useAuth();
  const { createUser, updateUser, deleteUser } = useAdmin();
  const logger = useLogger('UserManagement');
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [totalUsers, setTotalUsers] = useState(0);
  const [sortBy, setSortBy] = useState<'name' | 'last_login'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Use centralized pagination hook
  const pagination = usePagination({
    moduleDefault: 'USER_MANAGEMENT',
    preserveInUrl: true
  });

  const loadRoles = useCallback(async () => {
    try {
      const rolesData = await adminService.getRoles();
      setRoles(rolesData.map(role => ({ id: role.id, name: role.name })));
    } catch (error) {
      logger.errorWithStack('Failed to load roles', error instanceof Error ? error : new Error(String(error)));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await adminService.getUsers(
        pagination.page,
        pagination.limit,
        pagination.search,
        sortBy,
        sortDirection
      );
      setUsers(response.users);
      setTotalUsers(response.total);
    } catch (error) {
      logger.errorWithStack('Failed to load users', error instanceof Error ? error : new Error(String(error)));
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, pagination.search, sortBy, sortDirection]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    window.scrollTo(0, 0);
    loadRoles();
  }, [loadRoles]);

  // Handle URL action parameter for direct modal opening
  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'create') {
      setShowCreateModal(true);
      // Remove the action parameter from URL
      searchParams.delete('action');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleCreateUser = async (userData: CreateUserData) => {
    try {
      await createUser(userData);
      pagination.setPage(1);
      if (pagination.page === 1) {
        await loadUsers();
      }
      setShowCreateModal(false);
    } catch (error) {
      logger.errorWithStack('Failed to create user', error instanceof Error ? error : new Error(String(error)));
    }
  };

  const handleEditUser = async (userId: string, userData: Partial<User>) => {
    try {
      await updateUser(userId, userData);
      await loadUsers();
      setShowEditModal(false);
      setSelectedUser(null);
    } catch (error) {
      logger.errorWithStack('Failed to update user', error instanceof Error ? error : new Error(String(error)));
    }
  };

  const [userToDelete, setUserToDelete] = useState<{ id: string; name: string } | null>(null);

  const handleDeleteUser = useCallback((userId: string, userName: string) => {
    setUserToDelete({ id: userId, name: userName });
  }, []);

  const confirmDeleteUser = async () => {
    if (userToDelete) {
      try {
        await deleteUser(userToDelete.id, userToDelete.name);
        await loadUsers();
      } catch (error) {
        logger.errorWithStack('Failed to delete user', error instanceof Error ? error : new Error(String(error)));
      }
    }
    setUserToDelete(null);
  };

  const handleResetPassword = async (userId: string, password?: string) => {
    return adminService.resetUserPassword(userId, password);
  };

  const handlePageChange = (newPage: number) => {
    pagination.setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const totalPages = Math.ceil(totalUsers / pagination.limit);

  // Column definitions (memoized to prevent re-creation on every render)
  const columns: DataTableColumn[] = useMemo(() => {
    return [
    {
      id: 'user',
      label: 'USER',
      visible: true,
      locked: true,
      align: 'left',
      render: (_, user: User) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: 'var(--color-primary-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: '600', color: 'var(--color-primary)' }}>
              {user.firstName[0]}{user.lastName[0]}
            </span>
          </div>
          <div>
            <div style={{ fontWeight: '600', marginBottom: 'var(--space-1)' }}>
              {user.firstName} {user.lastName}
            </div>
            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)' }}>
              {user.email}
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'roles',
      label: 'ROLE',
      visible: true,
      align: 'center',
      render: (value: string[]) => (
        <div style={{ color: 'var(--color-text-primary)' }}>
          {value && value.length > 0 ? value[0] : 'No role'}
        </div>
      )
    },
    {
      id: 'isActive',
      label: 'STATUS',
      visible: true,
      align: 'center',
      render: (value: boolean) => (
        <Badge size="sm" variant={value ? 'success' : 'secondary'}>
          {value ? 'Active' : 'Inactive'}
        </Badge>
      )
    },
    {
      id: 'lastLogin',
      label: 'LAST LOGIN',
      visible: true,
      align: 'center',
      filterType: 'date',
      render: (value) => (
        <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)' }}>
          {value ? new Date(value).toLocaleString() : 'Never'}
        </div>
      ),
      dateFilterFn: (value, range) => {
        if (!value) return false;
        const date = new Date(value);
        if (isNaN(date.getTime())) return false;
        if (range.start && date < range.start) return false;
        if (range.end && date > range.end) return false;
        return true;
      }
    },
    {
      id: 'actions',
      filterable: false,
      label: 'ACTIONS',
      visible: true,
      align: 'center',
      sortable: false,
      render: (_, user: User) => {
        const canEditUser = currentUser?.permissions?.includes('user.manage.full') ?? false;

        return (
          <div
            style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'center', alignItems: 'center', whiteSpace: 'nowrap' }}
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedUser(user);
                setShowPermissionModal(true);
              }}
              size="sm"
              variant="primary"
              disabled={!canEditUser}
              title={!canEditUser ? 'Only Super Admin can manage Super Admin permissions' : 'Manage user permissions'}
            >
              Permissions
            </Button>
            <Button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedUser(user);
                setShowResetPasswordModal(true);
              }}
              size="sm"
              variant="secondary"
              disabled={!canEditUser}
              title={!canEditUser ? 'Only Super Admin can reset Super Admin passwords' : ''}
            >
              Reset Password
            </Button>
            <Button
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteUser(user.id, `${user.firstName} ${user.lastName}`);
              }}
              size="sm"
              variant="danger"
              disabled={!canEditUser}
              title={!canEditUser ? 'Only Super Admin can delete Super Admin users' : ''}
            >
              Delete
            </Button>
            {!canEditUser && (
              <span style={{
                fontSize: 'var(--font-size-xs)',
                color: 'var(--color-text-primary)',
                marginLeft: 'var(--space-2)'
              }}>
                (Super Admin only)
              </span>
            )}
          </div>
        );
      }
    }
  ];
  }, [currentUser, handleDeleteUser]);

  // Column manager for table customization
  const columnManager = useColumnManager('user-management', columns);

  // Reference to DataTable's reset function (passed up from DataTable)
  const dataTableResetRef = useRef<(() => void) | null>(null);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div style={{ padding: 'var(--space-4)', maxWidth: '100%', margin: '0' }}>
      <div style={{
        background: 'white',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border)',
        overflow: 'hidden'
      }}>
        {/* Page Title */}
        <div style={{
          padding: 'var(--space-2) var(--space-4)',
          borderBottom: '1px solid var(--color-border)'
        }}>
          <h2 style={{
            margin: 0,
            fontSize: 'var(--font-size-xl)',
            fontWeight: '600'
          }}>
            All Users
          </h2>
        </div>

        {/* Action Buttons Row */}
        <div style={{
          padding: 'var(--space-2) var(--space-4) 0 var(--space-4)',
          backgroundColor: 'var(--color-gray-50)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
            <Button
              onClick={() => setShowCreateModal(true)}
              variant="primary"
              icon={<Icon name="plus" />}
              size="sm"
            >
              Add New User
            </Button>
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
            {!columnManager.isEditMode ? (
              <Button
                onClick={() => columnManager.toggleEditMode()}
                variant="secondary"
                icon={<Icon name="cog" />}
                size="sm"
                preventDoubleClick={false}
              >
                Columns
              </Button>
            ) : (
              <>
                <Button
                  onClick={() => columnManager.toggleEditMode()}
                  variant="primary"
                  icon={<Icon name="check" />}
                  size="sm"
                  preventDoubleClick={false}
                >
                  Done
                </Button>
                <Button
                  onClick={() => {
                    if (dataTableResetRef.current) {
                      dataTableResetRef.current();
                    }
                  }}
                  variant="secondary"
                  size="sm"
                  preventDoubleClick={false}
                >
                  Reset Columns
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Pagination - Top */}
        {totalPages > 1 && (
          <div style={{ borderBottom: '1px solid var(--color-border)' }}>
            <Pagination
              currentPage={pagination.page}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              totalItems={totalUsers}
              itemsPerPage={pagination.limit}
            />
          </div>
        )}

        {/* DataTable */}
        <DataTable
          tableId="user-management"
          columns={columns}
          data={users}
          columnManager={columnManager}
          onRowClick={(user: User) => {
            const canEditUser = currentUser?.permissions?.includes('user.manage.full') ?? false;
            if (canEditUser) {
              setSelectedUser(user);
              setShowEditModal(true);
            }
          }}
          itemsPerPage={pagination.limit}
          disablePagination={true}
          disableColumnControls={true}
          externalEditMode={columnManager.isEditMode}
          onResetColumns={(resetFn) => {
            dataTableResetRef.current = resetFn;
          }}
          leftControls={
            <>
              <FormInput
                type="text"
                placeholder="Search users by name, email, or username..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    pagination.setSearch(searchInput);
                  }
                }}
                icon={<Icon name="search" />}
                size="sm"
                style={{ width: '400px', marginBottom: 0, marginTop: 0 }}
              />

              {(searchInput || pagination.search) && (
                <Button
                  onClick={() => {
                    setSearchInput('');
                    pagination.setSearch('');
                  }}
                  variant="secondary"
                  size="sm"
                >
                  Clear Search
                </Button>
              )}
            </>
          }
          emptyMessage="No users found"
          resetKey={location.pathname}
        />

        {/* Pagination - Bottom */}
        {totalPages > 1 && (
          <div style={{ borderTop: '1px solid var(--color-border)' }}>
            <Pagination
              currentPage={pagination.page}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              totalItems={totalUsers}
              itemsPerPage={pagination.limit}
            />
          </div>
        )}
      </div>

      {/* Modals */}
      <AddUserModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateUser}
        availableRoles={roles}
      />

      {selectedUser && (
        <UserDetailsModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedUser(null);
          }}
          user={selectedUser}
          onUpdate={handleEditUser}
          availableRoles={roles}
          currentUserId={currentUser?.id}
        />
      )}

      {selectedUser && (
        <ResetPasswordModal
          isOpen={showResetPasswordModal}
          onClose={() => {
            setShowResetPasswordModal(false);
            setSelectedUser(null);
          }}
          user={selectedUser}
          onReset={handleResetPassword}
        />
      )}

      {selectedUser && (
        <PermissionManagementModal
          isOpen={showPermissionModal}
          onClose={() => {
            setShowPermissionModal(false);
            setSelectedUser(null);
          }}
          userId={selectedUser.id}
          userName={`${selectedUser.firstName} ${selectedUser.lastName}`}
        />
      )}

      <Modal
        isOpen={!!userToDelete}
        onClose={() => setUserToDelete(null)}
        title="Delete User"
        size="sm"
      >
        <div style={{ padding: 'var(--space-4)' }}>
          <p style={{ marginBottom: 'var(--space-6)' }}>
            Are you sure you want to delete this user? This action cannot be undone.
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
            <Button
              onClick={() => setUserToDelete(null)}
              variant="secondary"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmDeleteUser}
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
