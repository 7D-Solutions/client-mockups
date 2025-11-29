import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AdminDashboard } from './pages/AdminDashboard';
import { UserManagement } from './pages/UserManagement';
import { RoleManagement } from './pages/RoleManagement';
import { SystemSettings } from './pages/SystemSettings';
import { AuditLogs } from './pages/AuditLogs';
import { GaugeManagement } from './pages/GaugeManagement';
import { FacilityManagementPage } from './pages/FacilityManagementPage';
import { BuildingManagementPage } from './pages/BuildingManagementPage';
import { ZoneManagementPage } from './pages/ZoneManagementPage';
import { SiteIndex } from './pages/SiteIndex';

export const AdminRoutes: React.FC = () => {
  return (
    <Routes>
      <Route index element={<AdminDashboard />} />
      <Route path="dashboard" element={<AdminDashboard />} />
      <Route path="users" element={<UserManagement />} />
      <Route path="roles" element={<RoleManagement />} />
      <Route path="settings" element={<SystemSettings />} />
      <Route path="audit" element={<AuditLogs />} />
      <Route path="gauges" element={<GaugeManagement />} />
      <Route path="facilities" element={<FacilityManagementPage />} />
      <Route path="buildings" element={<BuildingManagementPage />} />
      <Route path="zones" element={<ZoneManagementPage />} />
      <Route path="site-index" element={<SiteIndex />} />
    </Routes>
  );
};

export default AdminRoutes;