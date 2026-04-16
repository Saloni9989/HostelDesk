// frontend/src/App.jsx
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

import LoginPage          from './pages/LoginPage';
import DashboardPage      from './pages/DashboardPage';
import ComplaintsPage     from './pages/ComplaintsPage';
import ComplaintDetailPage from './pages/ComplaintDetailPage';
import NewComplaintPage   from './pages/NewComplaintPage';
import ProfilePage        from './pages/ProfilePage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import AdminUsersPage     from './pages/AdminUsersPage';
import AdminComplaintsPage from './pages/AdminComplaintsPage';
import Layout             from './components/shared/Layout';
import Spinner            from './components/shared/Spinner';

const ProtectedRoute = ({ children, adminOnly = false, staffOnly = false }) => {
  const { user, loading, isAdmin, isStaff } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><Spinner size="lg" /></div>;
  if (!user)   return <Navigate to="/login" replace />;
  if (adminOnly && !isAdmin) return <Navigate to="/dashboard" replace />;
  if (staffOnly && !isStaff) return <Navigate to="/dashboard" replace />;
  return children;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><Spinner size="lg" /></div>;
  if (user)    return <Navigate to="/dashboard" replace />;
  return children;
};

const AppRoutes = () => (
  <Routes>
    <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />

    <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
      <Route index element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard"           element={<DashboardPage />} />
      <Route path="/complaints"          element={<ComplaintsPage />} />
      <Route path="/complaints/new"      element={<NewComplaintPage />} />
      <Route path="/complaints/:id"      element={<ComplaintDetailPage />} />
      <Route path="/profile"             element={<ProfilePage />} />
      <Route path="/admin"               element={<ProtectedRoute staffOnly><AdminDashboardPage /></ProtectedRoute>} />
      <Route path="/admin/complaints"    element={<ProtectedRoute staffOnly><AdminComplaintsPage /></ProtectedRoute>} />
      <Route path="/admin/users"         element={<ProtectedRoute adminOnly><AdminUsersPage /></ProtectedRoute>} />
    </Route>

    <Route path="*" element={<Navigate to="/dashboard" replace />} />
  </Routes>
);

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
