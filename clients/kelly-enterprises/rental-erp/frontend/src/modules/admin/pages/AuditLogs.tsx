import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { adminService } from '../services/adminService';
import { LoadingSpinner, Button, FormInput, FormSelect, Badge, Icon, Modal, DataTable } from '../../../infrastructure/components';
import type { DataTableColumn } from '../../../infrastructure/components';
import { useColumnManager } from '../../../infrastructure/hooks';
import { AuditLog } from '../types';
import { logger } from '../../../infrastructure/utils/logger';

export const AuditLogs: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [totalLogs, setTotalLogs] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [filters, setFilters] = useState({
    userId: '',
    action: '',
    resource: '',
    gaugeId: '',
    startDate: '',
    endDate: '',
    limit: 50,
    offset: 0
  });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const loadAuditLogs = useCallback(async () => {
    try {
      setLoading(true);
      const response = await adminService.getAuditLogs(filters);
      setLogs(response.logs);
      setTotalLogs(response.total);
    } catch (error) {
      logger.error('Failed to load audit logs:', error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadAuditLogs();
  }, [loadAuditLogs]);

  const handleFilterChange = (key: string, value: string | number) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      offset: key !== 'offset' ? 0 : (typeof value === 'number' ? value : 0) // Reset offset when other filters change
    }));
  };

  const handleClearFilters = () => {
    setFilters({
      userId: '',
      action: '',
      resource: '',
      gaugeId: '',
      startDate: '',
      endDate: '',
      limit: 50,
      offset: 0
    });
  };

  const handlePrevPage = () => {
    if (filters.offset > 0) {
      handleFilterChange('offset', Math.max(0, filters.offset - filters.limit));
    }
  };

  const handleNextPage = () => {
    if (filters.offset + filters.limit < totalLogs) {
      handleFilterChange('offset', filters.offset + filters.limit);
    }
  };

  const getActionBadgeVariant = (action: string): 'success' | 'warning' | 'danger' | 'info' | 'secondary' => {
    switch (action.toLowerCase()) {
      case 'create':
      case 'certificate_upload':
        return 'success';
      case 'update':
      case 'certificate_rename':
        return 'warning';
      case 'delete':
      case 'certificate_delete':
        return 'danger';
      case 'login':
      case 'logout':
        return 'info';
      default:
        return 'secondary';
    }
  };

  // Column definitions
  const columns: DataTableColumn[] = [
    {
      id: 'timestamp',
      label: 'TIMESTAMP',
      visible: true,
      locked: true,
      align: 'left',
      filterType: 'date',
      render: (value: string) => new Date(value).toLocaleString(),
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
      id: 'username',
      label: 'USER',
      visible: true,
      align: 'left'
    },
    {
      id: 'action',
      label: 'ACTION',
      visible: true,
      align: 'left',
      render: (value: string) => (
        <Badge variant={getActionBadgeVariant(value)} size="sm">
          {value}
        </Badge>
      )
    },
    {
      id: 'resource',
      label: 'RESOURCE',
      visible: true,
      align: 'left',
      render: (value: string, log: AuditLog) => (
        <div>
          {value}
          {log.resourceId && (
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-500)', marginTop: 'var(--space-1)' }}>
              ID: {log.resourceId}
            </div>
          )}
        </div>
      )
    },
    {
      id: 'details',
      label: 'DETAILS',
      visible: true,
      align: 'left',
      sortable: false,
      render: (value: any, log: AuditLog) => (
        <div style={{ maxWidth: '300px' }}>
          {log.details && ('oldValues' in log.details || 'newValues' in log.details) ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {'oldValues' in log.details && (
                <pre style={{
                  margin: 0,
                  padding: 'var(--space-2)',
                  fontSize: 'var(--font-size-xs)',
                  backgroundColor: 'var(--color-gray-100)',
                  borderRadius: 'var(--radius-sm)',
                  overflowX: 'auto',
                  whiteSpace: 'pre-wrap',
                  borderLeft: '3px solid var(--color-danger)',
                  color: 'var(--color-danger)'
                }}>
                  {JSON.stringify(log.details.oldValues, null, 2)}
                </pre>
              )}
              {'newValues' in log.details && (
                <pre style={{
                  margin: 0,
                  padding: 'var(--space-2)',
                  fontSize: 'var(--font-size-xs)',
                  backgroundColor: 'var(--color-gray-100)',
                  borderRadius: 'var(--radius-sm)',
                  overflowX: 'auto',
                  whiteSpace: 'pre-wrap',
                  borderLeft: '3px solid var(--color-success)',
                  color: 'var(--color-success)'
                }}>
                  {JSON.stringify(log.details.newValues, null, 2)}
                </pre>
              )}
            </div>
          ) : (
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-400)' }}>No details</span>
          )}
        </div>
      )
    },
    {
      id: 'ipAddress',
      label: 'IP ADDRESS',
      visible: true,
      align: 'left',
      render: (value: string) => (
        <span style={{ color: 'var(--color-gray-500)' }}>{value}</span>
      )
    }
  ];

  const columnManager = useColumnManager('audit-logs', columns);

  return (
    <div style={{ padding: 'var(--space-6)', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{
        background: 'white',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border)',
        overflow: 'hidden',
        marginBottom: 'var(--space-4)'
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
              Audit Logs
            </h2>
          </div>
        </div>

        {/* Filters */}
        <div style={{ padding: 'var(--space-6)', borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-gray-50)' }}>
          <h3 style={{ margin: '0 0 var(--space-4) 0', fontSize: 'var(--font-size-lg)', fontWeight: '600' }}>Filters</h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
            <div>
              <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: 'var(--font-size-sm)', fontWeight: '600' }}>
                User ID
              </label>
              <FormInput
                type="text"
                value={filters.userId}
                onChange={(e) => handleFilterChange('userId', e.target.value)}
                placeholder="User ID..."
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: 'var(--font-size-sm)', fontWeight: '600' }}>
                Action
              </label>
              <FormSelect
                value={filters.action}
                onChange={(e) => handleFilterChange('action', e.target.value)}
                options={[
                  { value: '', label: 'All Actions' },
                  { value: 'create', label: 'Create' },
                  { value: 'update', label: 'Update' },
                  { value: 'delete', label: 'Delete' },
                  { value: 'certificate_upload', label: 'Certificate Upload' },
                  { value: 'certificate_rename', label: 'Certificate Rename' },
                  { value: 'certificate_delete', label: 'Certificate Delete' },
                  { value: 'login', label: 'Login' },
                  { value: 'logout', label: 'Logout' }
                ]}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: 'var(--font-size-sm)', fontWeight: '600' }}>
                Resource
              </label>
              <FormInput
                type="text"
                value={filters.resource}
                onChange={(e) => handleFilterChange('resource', e.target.value)}
                placeholder="Resource..."
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: 'var(--font-size-sm)', fontWeight: '600' }}>
                Gauge ID
              </label>
              <FormInput
                type="text"
                value={filters.gaugeId}
                onChange={(e) => handleFilterChange('gaugeId', e.target.value)}
                placeholder="Gauge ID..."
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: 'var(--font-size-sm)', fontWeight: '600' }}>
                Start Date
              </label>
              <FormInput
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: 'var(--font-size-sm)', fontWeight: '600' }}>
                End Date
              </label>
              <FormInput
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: '600' }}>Show:</label>
              <FormSelect
                value={filters.limit.toString()}
                onChange={(e) => handleFilterChange('limit', parseInt(e.target.value))}
                options={[
                  { value: '25', label: '25' },
                  { value: '50', label: '50' },
                  { value: '100', label: '100' }
                ]}
              />
              <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-600)' }}>entries</span>
            </div>

            <Button
              onClick={handleClearFilters}
              variant="secondary"
              size="sm"
            >
              Clear Filters
            </Button>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div style={{
        background: 'white',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border)',
        overflow: 'hidden'
      }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
            <LoadingSpinner />
          </div>
        ) : (
          <>
            {/* DataTable */}
            <DataTable
              tableId="audit-logs"
              columns={columns}
              data={logs}
              columnManager={columnManager}
              onRowClick={(log: AuditLog) => setSelectedLog(log)}
              itemsPerPage={50}
              disablePagination={true}
              emptyMessage="No audit logs found matching your criteria."
              resetKey={location.pathname}
            />

            {/* Pagination */}
            <div style={{ padding: 'var(--space-4)', borderTop: '1px solid var(--color-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
                <div>
                  <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-600)' }}>
                    Showing{' '}
                    <span style={{ fontWeight: '600', color: 'var(--color-gray-900)' }}>{filters.offset + 1}</span>
                    {' '}to{' '}
                    <span style={{ fontWeight: '600', color: 'var(--color-gray-900)' }}>
                      {Math.min(filters.offset + filters.limit, totalLogs)}
                    </span>
                    {' '}of{' '}
                    <span style={{ fontWeight: '600', color: 'var(--color-gray-900)' }}>{totalLogs}</span>
                    {' '}results
                  </p>
                </div>

                <div>
                  <nav style={{ display: 'flex', gap: 'var(--space-2)' }} aria-label="Pagination">
                    <Button
                      onClick={handlePrevPage}
                      disabled={filters.offset === 0}
                      variant="secondary"
                      size="sm"
                    >
                      Previous
                    </Button>
                    <Button
                      onClick={handleNextPage}
                      disabled={filters.offset + filters.limit >= totalLogs}
                      variant="secondary"
                      size="sm"
                    >
                      Next
                    </Button>
                  </nav>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Audit Log Details Modal */}
      {selectedLog && (
        <Modal
          isOpen={!!selectedLog}
          onClose={() => setSelectedLog(null)}
          title="Audit Log Details"
          size="lg"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {/* Header Info */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-3)', padding: 'var(--space-4)', backgroundColor: 'var(--color-gray-50)', borderRadius: 'var(--radius-md)' }}>
              <div>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-500)', marginBottom: 'var(--space-1)' }}>Timestamp</div>
                <div style={{ fontWeight: '600' }}>{new Date(selectedLog.timestamp).toLocaleString()}</div>
              </div>
              <div>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-500)', marginBottom: 'var(--space-1)' }}>User</div>
                <div style={{ fontWeight: '600' }}>{selectedLog.username}</div>
              </div>
              <div>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-500)', marginBottom: 'var(--space-1)' }}>Action</div>
                <div><Badge variant={getActionBadgeVariant(selectedLog.action)} size="sm">{selectedLog.action}</Badge></div>
              </div>
              <div>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-500)', marginBottom: 'var(--space-1)' }}>Resource</div>
                <div style={{ fontWeight: '600' }}>{selectedLog.resource} {selectedLog.resourceId && `(ID: ${selectedLog.resourceId})`}</div>
              </div>
              <div>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-500)', marginBottom: 'var(--space-1)' }}>IP Address</div>
                <div style={{ fontFamily: 'monospace', fontSize: 'var(--font-size-sm)' }}>{selectedLog.ipAddress}</div>
              </div>
              <div>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-500)', marginBottom: 'var(--space-1)' }}>User Agent</div>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-600)', wordBreak: 'break-all' }}>{selectedLog.userAgent}</div>
              </div>
            </div>

            {/* Details Section */}
            {selectedLog.details && ('oldValues' in selectedLog.details || 'newValues' in selectedLog.details) && (
              <div>
                <h3 style={{ margin: '0 0 var(--space-3) 0', fontSize: 'var(--font-size-lg)', fontWeight: '600' }}>Change Details</h3>

                {'oldValues' in selectedLog.details && (
                  <div style={{ marginBottom: 'var(--space-3)' }}>
                    <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: '600', marginBottom: 'var(--space-2)', color: 'var(--color-danger)' }}>
                      <Icon name="arrow-left" style={{ marginRight: 'var(--space-1)' }} /> Old Values
                    </div>
                    <pre style={{
                      margin: 0,
                      padding: 'var(--space-3)',
                      fontSize: 'var(--font-size-sm)',
                      backgroundColor: 'var(--color-gray-100)',
                      borderRadius: 'var(--radius-sm)',
                      overflowX: 'auto',
                      border: '1px solid var(--color-gray-300)'
                    }}>
                      {JSON.stringify(selectedLog.details.oldValues, null, 2)}
                    </pre>
                  </div>
                )}

                {'newValues' in selectedLog.details && (
                  <div>
                    <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: '600', marginBottom: 'var(--space-2)', color: 'var(--color-success)' }}>
                      <Icon name="arrow-right" style={{ marginRight: 'var(--space-1)' }} /> New Values
                    </div>
                    <pre style={{
                      margin: 0,
                      padding: 'var(--space-3)',
                      fontSize: 'var(--font-size-sm)',
                      backgroundColor: 'var(--color-gray-100)',
                      borderRadius: 'var(--radius-sm)',
                      overflowX: 'auto',
                      border: '1px solid var(--color-gray-300)'
                    }}>
                      {JSON.stringify(selectedLog.details.newValues, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};
