import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import AdminLayout from '@/components/AdminLayout';
import { Toaster } from '@/components/ui/sonner';
import { registerServiceWorker } from '@/lib/pwa';

// Admin Pages
import AdminLogin from '@/pages/AdminLogin';
import AdminDashboard from '@/dashboards/AdminDashboard';
import UserManagement from '@/pages/admin/UserManagement';
import SystemAnalytics from '@/pages/admin/SystemAnalytics';
import ContentModeration from '@/pages/admin/ContentModeration';
import GlobalMonitoring from '@/pages/admin/GlobalMonitoring';

import './App.css';

function AdminProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, userRole, initialLoadComplete } = useAuth();

  // Only show loading during initial auth check
  if (!initialLoadComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  // Only platform_admin role can access admin routes
  if (userRole !== 'platform_admin') {
    return <Navigate to="/admin/login" replace />;
  }

  return <>{children}</>;
}

function AdminLoginRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, userRole, initialLoadComplete } = useAuth();

  if (!initialLoadComplete) {
    return <>{children}</>;
  }

  // If already authenticated as platform_admin, redirect to dashboard
  if (isAuthenticated && userRole === 'platform_admin') {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Admin Login */}
      <Route path="/admin/login" element={
        <AdminLoginRoute><AdminLogin /></AdminLoginRoute>
      } />

      {/* Admin Dashboard & Routes */}
      <Route path="/admin/dashboard" element={
        <AdminProtectedRoute>
          <AdminLayout><AdminDashboard /></AdminLayout>
        </AdminProtectedRoute>
      } />

      <Route path="/admin/users" element={
        <AdminProtectedRoute>
          <AdminLayout><UserManagement /></AdminLayout>
        </AdminProtectedRoute>
      } />

      <Route path="/admin/analytics" element={
        <AdminProtectedRoute>
          <AdminLayout><SystemAnalytics /></AdminLayout>
        </AdminProtectedRoute>
      } />

      <Route path="/admin/moderation" element={
        <AdminProtectedRoute>
          <AdminLayout><ContentModeration /></AdminLayout>
        </AdminProtectedRoute>
      } />

      <Route path="/admin/monitoring" element={
        <AdminProtectedRoute>
          <AdminLayout><GlobalMonitoring /></AdminLayout>
        </AdminProtectedRoute>
      } />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/admin/login" replace />} />
    </Routes>
  );
}

function App() {
  useEffect(() => {
    // Register service worker on app load
    registerServiceWorker();
  }, []);

  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <AppRoutes />
          <Toaster position="top-right" />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
