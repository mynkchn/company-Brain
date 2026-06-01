import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { ToastProvider } from '@/components/ui/toast';
import AppLayout from '@/layouts/AppLayout';
import LandingPage from '@/pages/LandingPage';
import AuthCallbackPage from '@/pages/AuthCallbackPage';
import DashboardPage from '@/pages/DashboardPage';
import NewPlaygroundPage from '@/pages/NewPlaygroundPage';
import PlaygroundPage from '@/pages/PlaygroundPage';
import TetrisLoading from '@/components/TetrisLoading';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <TetrisLoading size="md" speed="fast" loadingText="Initialising QueryMind..." />
      </div>
    );
  }

  if (!user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const { user, loading, logout } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <TetrisLoading size="md" speed="fast" loadingText="Initialising QueryMind..." />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <LandingPage />} />
      <Route path="/auth" element={<AuthCallbackPage />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <AppLayout user={user!} onLogout={logout}>
              <DashboardPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/new"
        element={
          <ProtectedRoute>
            <AppLayout user={user!} onLogout={logout}>
              <NewPlaygroundPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/playground/:id"
        element={
          <ProtectedRoute>
            <AppLayout user={user!} onLogout={logout}>
              <PlaygroundPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AppRoutes />
      </ToastProvider>
    </BrowserRouter>
  );
}
