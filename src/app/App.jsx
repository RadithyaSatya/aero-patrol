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

function GuestRoute({ children, hasAuthToken }) {
  if (hasAuthToken) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function ProtectedRoute({ children, hasAuthToken, requireAdmin = false }) {
  const authRole = (localStorage.getItem('authRole') || '').toLowerCase();
  const isAdmin = authRole === 'admin';

  if (!hasAuthToken) {
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
  const [isAuthenticated, setIsAuthenticated] = useState(() => Boolean(localStorage.getItem('authToken')));
  const [, setIsCheckingAuth] = useState(() => Boolean(localStorage.getItem('authToken')));
  const isAboutPage = location.pathname === '/about';
  const useDefaultPageBackground = !isLoginPage && !isAboutPage;
  const hasAuthToken = Boolean(localStorage.getItem('authToken'));

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
  }, [validateSession]);

  return (
    <div
      className="flex min-h-screen w-full flex-col overflow-x-hidden font-sans"
      style={
        useDefaultPageBackground
          ? { background: 'linear-gradient(to bottom, #DDDDDD 0%, #AEAEAE 100%)' }
          : undefined
      }
    >
      {!isLoginPage && hasAuthToken ? <AppHeader /> : null}
      <Routes>
        <Route path="/" element={<GuestRoute hasAuthToken={hasAuthToken}><LoginPage /></GuestRoute>} />
        <Route path="/login" element={<GuestRoute hasAuthToken={hasAuthToken}><LoginPage /></GuestRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute hasAuthToken={hasAuthToken}><DashboardPage /></ProtectedRoute>} />
        <Route path="/missions" element={<ProtectedRoute hasAuthToken={hasAuthToken}><MissionPage /></ProtectedRoute>} />
        <Route path="/missions/active" element={<ProtectedRoute hasAuthToken={hasAuthToken}><ActiveMissionPage /></ProtectedRoute>} />
        <Route path="/history" element={<ProtectedRoute hasAuthToken={hasAuthToken}><HistoryPage /></ProtectedRoute>} />
        <Route path="/about" element={<ProtectedRoute hasAuthToken={hasAuthToken}><AboutPage /></ProtectedRoute>} />
        <Route
          path="/user-management"
          element={
            <ProtectedRoute hasAuthToken={hasAuthToken} requireAdmin>
              <UserManagementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="*"
          element={
            <Navigate
              to={hasAuthToken ? '/dashboard' : '/login'}
              replace
            />
          }
        />
      </Routes>
    </div>
  )
}

export default App
