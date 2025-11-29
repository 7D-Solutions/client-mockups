import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { UserProfile } from './pages/UserProfile';
import { UserSettings } from './pages/UserSettings';

export const UserRoutes: React.FC = () => {
  return (
    <Routes>
      <Route index element={<UserProfile />} />
      <Route path="profile" element={<UserProfile />} />
      <Route path="settings" element={<UserSettings />} />
    </Routes>
  );
};

export default UserRoutes;