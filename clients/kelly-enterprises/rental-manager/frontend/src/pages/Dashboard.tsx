import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { handleApiError } from '../lib/api';
import { Icon } from '../infrastructure/components/Icon';
import { Button } from '../infrastructure/components/Button';
import { Badge } from '../infrastructure/components/Badge';
import { LoadingSpinner } from '../infrastructure/components/LoadingSpinner';
import { Card, CardHeader, CardTitle, CardContent } from '../infrastructure/components/ui/Card';
import type { Stats } from '../types';
import styles from './Dashboard.module.css';

const Dashboard = () => {
  const [stats, setStats] = useState<Stats>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [propertiesRes, tenantsRes, paymentsRes] = await Promise.all([
        api.get('/rental/properties/stats'),
        api.get('/rental/tenants'),
        api.get('/rental/payments/monthly-totals'),
      ]);

      setStats({
        total_properties: propertiesRes.data.data.total_properties || 0,
        active_properties: propertiesRes.data.data.active_properties || 0,
        total_tenants: tenantsRes.data.count || 0,
        monthly_revenue: paymentsRes.data.data[0]?.total || 0,
      });
    } catch (error) {
      console.error('Error loading stats:', handleApiError(error));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <LoadingSpinner />
      </div>
    );
  }

  const occupancyRate = ((stats.active_properties || 0) / (stats.total_properties || 1) * 100).toFixed(0);

  return (
    <div className={styles.dashboard}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Dashboard</h1>
        <p className={styles.pageDescription}>Overview of your rental business</p>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statCardHeader}>
            <div>
              <div className={styles.statValue}>{stats.total_properties || 0}</div>
              <div className={styles.statLabel}>Total Properties</div>
            </div>
            <div className={`${styles.statIcon} ${styles.statIconPrimary}`}>
              <Icon name="home" size="lg" />
            </div>
          </div>
          <Link to="/properties" className={styles.statCardLink}>
            <Button variant="secondary" size="sm" style={{ width: '100%' }}>
              View Properties
            </Button>
          </Link>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statCardHeader}>
            <div>
              <div className={styles.statValue}>{stats.total_tenants || 0}</div>
              <div className={styles.statLabel}>Active Tenants</div>
            </div>
            <div className={`${styles.statIcon} ${styles.statIconSuccess}`}>
              <Icon name="users" size="lg" />
            </div>
          </div>
          <Link to="/tenants" className={styles.statCardLink}>
            <Button variant="secondary" size="sm" style={{ width: '100%' }}>
              View Tenants
            </Button>
          </Link>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statCardHeader}>
            <div>
              <div className={styles.statValue}>${(stats.monthly_revenue || 0).toLocaleString()}</div>
              <div className={styles.statLabel}>This Month Revenue</div>
            </div>
            <div className={`${styles.statIcon} ${styles.statIconWarning}`}>
              <Icon name="dollar-sign" size="lg" />
            </div>
          </div>
          <Link to="/payments" className={styles.statCardLink}>
            <Button variant="secondary" size="sm" style={{ width: '100%' }}>
              View Payments
            </Button>
          </Link>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statCardHeader}>
            <div>
              <div className={styles.statValue}>{stats.active_properties || 0}</div>
              <div className={styles.statLabel}>Occupied Properties</div>
            </div>
            <div className={`${styles.statIcon} ${styles.statIconPrimary}`}>
              <Icon name="trending-up" size="lg" />
            </div>
          </div>
          <div className={styles.occupancyRate}>
            {occupancyRate}% occupancy
          </div>
        </div>
      </div>

      <div className={styles.cardsGrid}>
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={styles.quickActions}>
              <Link to="/properties" className={styles.actionLink}>
                <Button variant="secondary" style={{ width: '100%' }} icon={<Icon name="home" />}>
                  Add New Property
                </Button>
              </Link>
              <Link to="/tenants" className={styles.actionLink}>
                <Button variant="secondary" style={{ width: '100%' }} icon={<Icon name="users" />}>
                  Add New Tenant
                </Button>
              </Link>
              <Link to="/payments" className={styles.actionLink}>
                <Button variant="secondary" style={{ width: '100%' }} icon={<Icon name="dollar-sign" />}>
                  Record Payment
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={styles.systemStatus}>
              <div className={styles.statusItem}>
                <span className={styles.statusLabel}>Backend API</span>
                <Badge variant="success">Connected</Badge>
              </div>
              <div className={styles.statusItem}>
                <span className={styles.statusLabel}>Database</span>
                <Badge variant="success">Operational</Badge>
              </div>
              <div className={styles.statusItem}>
                <span className={styles.statusLabel}>Last Backup</span>
                <span className={styles.statusValue}>Today</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
