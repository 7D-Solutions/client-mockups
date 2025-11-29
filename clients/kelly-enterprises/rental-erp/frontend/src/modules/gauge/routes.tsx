// Gauge module routing configuration
import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import { GaugeList, SetDetailsPage, CalibrationManagementPage, ReturnedCustomerGaugesPage, SpareInventoryPage } from './pages';
import { QCPage } from './pages/QCPage';
import { MyGauges } from './pages/MyGauges';
import { CreateGaugePage } from './pages/CreateGaugePage';
import { GaugeProvider } from './context';

// Redirect component for legacy gauge detail routes
function GaugeDetailRedirect() {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={`/gauges?open=${id}`} replace />;
}

// Gauge module routes - wrapped with GaugeProvider
export function GaugeRoutes() {
  return (
    <GaugeProvider>
      <Routes>
        <Route path="/" element={<GaugeList />} />
        <Route path="/my-gauges" element={<MyGauges />} />
        <Route path="/inventory" element={<GaugeList />} /> {/* Redirects to GaugeList - GaugeInventoryPage removed as legacy */}
        <Route path="/qc" element={<QCPage />} />
        <Route path="/list" element={<GaugeList />} />
        <Route path="/sets/:setId" element={<SetDetailsPage />} /> {/* ➕ Phase 1: Set details route */}
        <Route path="/calibration-management" element={<CalibrationManagementPage />} /> {/* ➕ Phase 3: Calibration workflow */}
        <Route path="/returned-customer-gauges" element={<ReturnedCustomerGaugesPage />} /> {/* ➕ Phase 4: Customer return workflow */}
        <Route path="/spare-inventory" element={<SpareInventoryPage />} /> {/* ➕ Phase 5: Spare pairing interface */}
        <Route path="/detail/:id" element={<GaugeDetailRedirect />} /> {/* Redirect to modal-based view */}
        <Route path="/create" element={<CreateGaugePage />} />
        {/* Additional gauge routes can be added here */}
      </Routes>
    </GaugeProvider>
  );
}

// Export route configuration for module registration
export const gaugeRouteConfig = {
  path: '/gauges/*',
  element: <GaugeRoutes />
};