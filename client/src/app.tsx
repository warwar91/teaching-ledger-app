import React from 'react';
import { Route, Routes } from 'react-router-dom';

import Layout from './components/Layout';
import NotFound from './pages/NotFound/NotFound';
import HomePage from './pages/Home/HomePage';
import LoginPage from './pages/Login/LoginPage';
import RegisterPage from './pages/Register/RegisterPage';
import LedgerListPage from './pages/LedgerList/LedgerListPage';
import LedgerDetailPage from './pages/LedgerDetail/LedgerDetailPage';
import RecycleBinPage from './pages/RecycleBin/RecycleBinPage';
import AdminPage from './pages/Admin/AdminPage';
import HelpPage from './pages/Help/HelpPage';
import AnnouncementListPage from './pages/Announcement/AnnouncementListPage';
import AnnouncementDetailPage from './pages/Announcement/AnnouncementDetailPage';
import AdminAnnouncementPage from './pages/Announcement/AdminAnnouncementPage';
import { AuthProvider } from './contexts/AuthContext';

const RoutesComponent = () => {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="weekly" element={<LedgerListPage ledgerType="weekly" />} />
          <Route path="semester" element={<LedgerListPage ledgerType="semester" />} />
          <Route path="recycle" element={<RecycleBinPage />} />
          <Route path="ledger/:id" element={<LedgerDetailPage />} />
          <Route path="admin" element={<AdminPage />} />
          <Route path="help" element={<HelpPage />} />
          <Route path="announcements" element={<AnnouncementListPage />} />
          <Route path="announcements/:id" element={<AnnouncementDetailPage />} />
          <Route path="admin/announcements" element={<AdminAnnouncementPage />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AuthProvider>
  );
};

export default RoutesComponent;
