// Inventory module routing configuration
import { Routes, Route } from 'react-router-dom';
import { InventoryDashboard } from './pages/InventoryDashboard';
import { LocationDetailPage } from './pages/LocationDetailPage';
import { MovementHistoryPage } from './pages/MovementHistoryPage';
import { StorageLocationsPage } from './pages/StorageLocationsPage';
import { OrganizationManagementPage } from './pages/OrganizationManagementPage';

// Inventory module routes
export function InventoryRoutes() {
  return (
    <Routes>
      <Route path="/" element={<InventoryDashboard />} />
      <Route path="/organization" element={<OrganizationManagementPage />} />
      <Route path="/locations" element={<StorageLocationsPage />} />
      <Route path="/location/:locationCode" element={<LocationDetailPage />} />
      <Route path="/movements" element={<MovementHistoryPage />} />
      {/* Additional inventory routes can be added here */}
    </Routes>
  );
}

// Export route configuration for module registration
export const inventoryRouteConfig = {
  path: '/inventory/*',
  element: <InventoryRoutes />
};
