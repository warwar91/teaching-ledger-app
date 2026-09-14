import React from 'react';
import { Route, Routes } from 'react-router-dom';

import Layout from './components/Layout';
import NotFound from './pages/NotFound/NotFound';
import HomePage from './pages/Home/HomePage';
import LoginPage from './pages/Login/LoginPage';
import LedgerListPage from './pages/LedgerList/LedgerListPage';
import LedgerDetailPage from './pages/LedgerDetail/LedgerDetailPage';
import RecycleBinPage from './pages/RecycleBin/RecycleBinPage';
import AdminPage from './pages/Admin/AdminPage';
import HelpPage from './pages/Help/HelpPage';
import { AuthProvider } from './contexts/AuthContext';

const RoutesComponent = () => {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="weekly" element={<LedgerListPage ledgerType="weekly" />} />
          <Route path="semester" element={<LedgerListPage ledgerType="semester" />} />
          <Route path="recycle" element={<RecycleBinPage />} />
          <Route path="ledger/:id" element={<LedgerDetailPage />} />
          <Route path="admin" element={<AdminPage />} />
          <Route path="help" element={<HelpPage />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AuthProvider>
  );
};

export default RoutesComponent;
