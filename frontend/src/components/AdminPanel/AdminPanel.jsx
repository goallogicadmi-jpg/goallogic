import { Navigate, Route, Routes } from 'react-router-dom';
import AdminRoute from './AdminRoute';
import AdminPanelLayout from './AdminPanelLayout';
import AdminDashboard from './AdminDashboard';
import UsersModule from './modules/UsersModule';
import StripeAnalyticsModule from './modules/StripeAnalyticsModule';
import CmsModule from './modules/CmsModule';
import LeaguesDataModule from './modules/LeaguesDataModule';
import ModerationModule from './modules/ModerationModule';
import AuditLogsModule from './modules/AuditLogsModule';
import CouponsModule from './modules/CouponsModule';
import SettingsModule from './modules/SettingsModule';
import MessagesBulkModule from './modules/MessagesBulkModule';
import MessagesSendModule from './modules/MessagesSendModule';
import MessagesSentModule from './modules/MessagesSentModule';
import MainAdminRoute from './MainAdminRoute';
import FamiliaModule from './modules/FamiliaModule';

/**
 * Admin Panel PRO — rutas anidadas bajo /admin/*
 */
export default function AdminPanel() {
  return (
    <AdminRoute>
      <Routes>
        <Route element={<AdminPanelLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="users" element={<UsersModule />} />
          <Route path="users/:userId" element={<UsersModule />} />
          <Route
            path="familia"
            element={
              <MainAdminRoute>
                <FamiliaModule />
              </MainAdminRoute>
            }
          />
          <Route path="stripe" element={<StripeAnalyticsModule />} />
          <Route path="cms" element={<CmsModule />} />
          <Route path="leagues" element={<LeaguesDataModule />} />
          <Route path="moderation" element={<ModerationModule />} />
          <Route path="logs" element={<AuditLogsModule />} />
          <Route
            path="coupons"
            element={
              <MainAdminRoute>
                <CouponsModule />
              </MainAdminRoute>
            }
          />
          <Route
            path="settings"
            element={
              <MainAdminRoute>
                <SettingsModule />
              </MainAdminRoute>
            }
          />
          <Route
            path="messages/bulk"
            element={
              <MainAdminRoute>
                <MessagesBulkModule />
              </MainAdminRoute>
            }
          />
          <Route path="messages/send" element={<MessagesSendModule />} />
          <Route path="messages/sent" element={<MessagesSentModule />} />
          <Route path="*" element={<Navigate to="dashboard" replace />} />
        </Route>
      </Routes>
    </AdminRoute>
  );
}
