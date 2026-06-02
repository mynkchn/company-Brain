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

function AppRoutes() {
  const { user, loading, logout } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <TetrisLoading size="md" speed="fast" loadingText="Initialising CompanyBrain..." />
      </div>
    );
  }

  const layout = (children: React.ReactNode) =>
    user ? <AppLayout user={user} onLogout={logout}>{children}</AppLayout> : <Navigate to="/" replace />;

  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <LandingPage />} />
      <Route path="/auth" element={<AuthCallbackPage />} />
      <Route path="/dashboard" element={layout(<DashboardPage />)} />
      <Route path="/new" element={layout(<NewPlaygroundPage />)} />
      <Route path="/playground/:id" element={layout(<PlaygroundPage />)} />
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