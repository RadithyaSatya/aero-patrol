import { useCallback, useEffect, useState } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import AppHeader from '../shared/components/AppHeader'
import DashboardPage from '../features/dashboard/pages/DashboardPage'
import MissionPage from '../features/missions/pages/MissionPage'
import ActiveMissionPage from '../features/missions/pages/ActiveMissionPage'
import HistoryPage from '../features/history/pages/HistoryPage'
import AboutPage from '../features/settings/pages/AboutPage'
import UserManagementPage from '../features/settings/pages/UserManagementPage'
import LoginPage from '../features/auth/pages/LoginPage'
import { authService, clearAuthStorage, persistAuthProfile } from '../services/api'

function FullPageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#111620] text-sm tracking-[0.12em] text-white">
      Validating session...
    </div>
  );
}

function GuestRoute({ children, isAuthenticated, isCheckingAuth }) {
  if (isCheckingAuth) {
    return <FullPageLoader />;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function ProtectedRoute({ children, isAuthenticated, isCheckingAuth, requireAdmin = false }) {
  const authRole = (localStorage.getItem('authRole') || '').toLowerCase();
  const isAdmin = authRole === 'admin';

  if (isCheckingAuth) {
    return <FullPageLoader />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function App() {
  const location = useLocation();
  const isLoginPage = location.pathname === '/' || location.pathname === '/login';
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const isAboutPage = location.pathname === '/about';
  const useDefaultPageBackground = !isLoginPage && !isAboutPage;

  const validateSession = useCallback(async () => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      clearAuthStorage();
      setIsAuthenticated(false);
      setIsCheckingAuth(false);
      return;
    }

    setIsCheckingAuth(true);

    try {
      const currentUser = await authService.getMe();
      persistAuthProfile(currentUser);
      setIsAuthenticated(true);
    } catch {
      clearAuthStorage();
      setIsAuthenticated(false);
    } finally {
      setIsCheckingAuth(false);
    }
  }, []);

  useEffect(() => {
    validateSession();
  }, [validateSession, location.pathname]);

  return (
    <div
      className="min-h-screen flex flex-col font-sans"
      style={
        useDefaultPageBackground
          ? { background: 'linear-gradient(to bottom, #DDDDDD 0%, #AEAEAE 100%)' }
          : undefined
      }
    >
      {!isLoginPage && isAuthenticated && !isCheckingAuth ? <AppHeader /> : null}
      <Routes>
        <Route path="/" element={<GuestRoute isAuthenticated={isAuthenticated} isCheckingAuth={isCheckingAuth}><LoginPage /></GuestRoute>} />
        <Route path="/login" element={<GuestRoute isAuthenticated={isAuthenticated} isCheckingAuth={isCheckingAuth}><LoginPage /></GuestRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute isAuthenticated={isAuthenticated} isCheckingAuth={isCheckingAuth}><DashboardPage /></ProtectedRoute>} />
        <Route path="/missions" element={<ProtectedRoute isAuthenticated={isAuthenticated} isCheckingAuth={isCheckingAuth}><MissionPage /></ProtectedRoute>} />
        <Route path="/missions/active" element={<ProtectedRoute isAuthenticated={isAuthenticated} isCheckingAuth={isCheckingAuth}><ActiveMissionPage /></ProtectedRoute>} />
        <Route path="/history" element={<ProtectedRoute isAuthenticated={isAuthenticated} isCheckingAuth={isCheckingAuth}><HistoryPage /></ProtectedRoute>} />
        <Route path="/about" element={<ProtectedRoute isAuthenticated={isAuthenticated} isCheckingAuth={isCheckingAuth}><AboutPage /></ProtectedRoute>} />
        <Route
          path="/user-management"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated} isCheckingAuth={isCheckingAuth} requireAdmin>
              <UserManagementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="*"
          element={
            <Navigate
              to={isAuthenticated ? '/dashboard' : '/login'}
              replace
            />
          }
        />
      </Routes>
    </div>
  )
}

export default App
