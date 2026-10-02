import { Navigate, Route, Routes } from 'react-router-dom';
import AdminRoute from './components/auth/AdminRoute.jsx';
import ProtectedRoute from './components/auth/ProtectedRoute.jsx';
import AppLayout from './layouts/AppLayout.jsx';
import AuthLayout from './layouts/AuthLayout.jsx';
import AdminPage from './pages/AdminPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import FeedbackPage from './pages/FeedbackPage.jsx';
import GoalsPage from './pages/GoalsPage.jsx';
import HabitsPage from './pages/HabitsPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import TransactionsPage from './pages/TransactionsPage.jsx';
import WealthPage from './pages/WealthPage.jsx';

export default function App() {
  return (
    <Routes>
      <Route index element={<Navigate to="/dashboard" replace />} />

      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/transactions" element={<TransactionsPage />} />
          <Route path="/habits" element={<HabitsPage />} />
          <Route path="/goals" element={<GoalsPage />} />
          <Route path="/wealth" element={<WealthPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/feedback" element={<FeedbackPage />} />

          <Route element={<AdminRoute />}>
            <Route path="/admin" element={<AdminPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
