// Phase 4: Returned Customer Gauges Page
// Admin/QC only page for viewing returned customer gauges
import React, { useState, useEffect, useCallback } from 'react';
import { gaugeService } from '../services/gaugeService';
import { usePermissions } from '../../../infrastructure/auth/usePermissions';
import type { Gauge } from '../types';
import {
  Button,
  LoadingSpinner,
  Alert,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  GaugeStatusBadge,
  FormInput,
  Breadcrumb
} from '../../../infrastructure/components';
import { Pagination } from '../../../infrastructure/components';
import { EquipmentRules } from '../../../infrastructure/business/equipmentRules';
import styles from './ReturnedCustomerGaugesPage.module.css';

export const ReturnedCustomerGaugesPage: React.FC = () => {
  const { canViewReturnedCustomer } = usePermissions();
  const [gauges, setGauges] = useState<Gauge[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const limit = 20;

  const fetchReturnedGauges = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await gaugeService.getReturnedCustomerGauges({
        search,
        page,
        limit
      });

      setGauges(response.data || []);
      setTotal(response.pagination?.total || 0);
      setTotalPages(response.pagination?.totalPages || 1);
    } catch (err: unknown) {
      // Error logged for development - failed to fetch returned customer gauges
      setError(err instanceof Error ? err.message : 'Failed to load returned gauges');
    } finally {
      setIsLoading(false);
    }
  }, [search, page, limit]);

  useEffect(() => {
    if (!canViewReturnedCustomer) {
      setIsLoading(false);
      return;
    }

    fetchReturnedGauges();
  }, [canViewReturnedCustomer, fetchReturnedGauges]);

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1); // Reset to first page on search
  };

  // Permission check
  if (!canViewReturnedCustomer) {
    return (
      <div className={styles.accessDenied}>
        <Alert variant="danger">
          <h2>Access Denied</h2>
          <p>This page is only accessible to Admin and QC users.</p>
        </Alert>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={styles.returnedCustomerGaugesPage}>
        <h1>Returned Customer Gauges</h1>
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className={styles.returnedCustomerGaugesPage}>
      {/* ➕ Phase 7: Breadcrumb navigation */}
      <Breadcrumb
        items={[
          { label: 'Gauge Inventory', to: '/gauges' },
          { label: 'Returned Customer Gauges' }
        ]}
      />

      <div className={styles.header}>
        <h1>Returned Customer Gauges</h1>
        <div className={styles.headerInfo}>
          <span className={styles.totalCount}>{total} total returned gauges</span>
        </div>
      </div>

      {/* Search Filter */}
      <Card className={styles.filtersCard}>
        <CardContent>
          <div className={styles.filters}>
            <FormInput
              type="text"
              placeholder="Search by Gauge ID, Customer, Thread Size..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className={styles.searchInput}
            />
            {search && (
              <Button
                onClick={() => handleSearch('')}
                variant="secondary"
                size="sm"
              >
                Clear Search
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="danger">
          {error}
          <Button onClick={fetchReturnedGauges} variant="link">Retry</Button>
        </Alert>
      )}

      {/* Gauge List */}
      <Card>
        <CardHeader>
          <CardTitle>Returned Gauges (Read-Only)</CardTitle>
        </CardHeader>
        <CardContent>
          {gauges.length === 0 ? (
            <div className={styles.emptyState}>
              <p>No returned customer gauges found</p>
              {search && <p>Try adjusting your search criteria</p>}
            </div>
          ) : (
            <div className={styles.gaugeList}>
              <div className={styles.tableHeader}>
                <div className={styles.col}>Gauge ID</div>
                <div className={styles.col}>Description</div>
                <div className={styles.col}>Customer</div>
                <div className={styles.col}>Status</div>
                <div className={styles.col}>Location</div>
              </div>

              {gauges.map((gauge) => (
                <div key={gauge.id} className={styles.gaugeRow}>
                  <div className={styles.col}>
                    <strong>{gauge.gaugeId}</strong>
                    {gauge.set_id && (
                      <span className={styles.setPair}>🔗 Paired</span>
                    )}
                  </div>
                  <div className={styles.col}>
                    <div className={styles.gaugeName}>{gauge.name || 'N/A'}</div>
                    {gauge.thread_size && (
                      <div className={styles.gaugeSpecs}>
                        {gauge.thread_size} {gauge.thread_class || ''}
                      </div>
                    )}
                  </div>
                  <div className={styles.col}>
                    {EquipmentRules.isEmployeeOwned(gauge) ? gauge.owner_employee_name : '-'}
                  </div>
                  <div className={styles.col}>
                    <GaugeStatusBadge status={gauge.status} />
                  </div>
                  <div className={styles.col}>
                    {gauge.storage_location || 'N/A'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className={styles.paginationContainer}>
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  );
};
