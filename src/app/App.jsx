import { useCallback, useEffect, useState } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import AppHeader from '../shared/components/AppHeader'
import DashboardPage from '../features/dashboard/pages/DashboardPage'
import MissionPage from '../features/missions/pages/MissionPage'
import ActiveMissionPage from '../features/missions/pages/ActiveMissionPage'
import HistoryPage from '../features/history/pages/HistoryPage'
import HistoryDetailPage from '../features/history/pages/HistoryDetailPage'
import AboutPage from '../features/settings/pages/AboutPage'
import SettingsPage from '../features/settings/pages/SettingsPage'
import UserManagementPage from '../features/settings/pages/UserManagementPage'
import LoginPage from '../features/auth/pages/LoginPage'
import useTelemetry from '../shared/hooks/useTelemetry'
import { authService, clearAuthStorage, persistAuthProfile, uavService } from '../services/api'

const SIDEBAR_COLLAPSED_WIDTH = 92;
const SIDEBAR_EXPANDED_WIDTH = 236;

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
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => localStorage.getItem('sidebarCollapsed') === 'true');
  const [headerUavId, setHeaderUavId] = useState(null);
  const isBackgroundImagePage = location.pathname === '/about' || location.pathname === '/settings';
  const useDefaultPageBackground = !isLoginPage && !isBackgroundImagePage;
  const hasAuthToken = Boolean(localStorage.getItem('authToken'));
  const shouldShowAppChrome = !isLoginPage && hasAuthToken;
  const sidebarPadding = isSidebarCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_EXPANDED_WIDTH;
  const headerUavIds = headerUavId ? [headerUavId] : [];
  const { telemetry: headerTelemetry, telemetryStatus: headerTelemetryStatus } = useTelemetry(
    headerUavIds,
    ['battery', 'gps', 'gps2', 'link', 'vehicle_state', 'docking_status', 'uav_status']
  );

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

  useEffect(() => {
    let isCancelled = false;

    const fetchHeaderUav = async () => {
      if (!hasAuthToken) {
        setHeaderUavId(null);
        return;
      }

      try {
        const data = await uavService.getUav();
        if (!isCancelled) {
          setHeaderUavId(data?.id ?? null);
        }
      } catch {
        if (!isCancelled) {
          setHeaderUavId(null);
        }
      }
    };

    fetchHeaderUav();

    return () => {
      isCancelled = true;
    };
  }, [hasAuthToken]);

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  return (
    <div
      className="flex min-h-screen w-full flex-col overflow-x-hidden font-sans"
      style={
        useDefaultPageBackground
          ? { backgroundColor: '#F1F4F9' }
          : undefined
      }
    >
      {shouldShowAppChrome ? (
        <AppHeader
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebar={() => setIsSidebarCollapsed((prev) => !prev)}
          telemetry={headerUavId ? headerTelemetry[headerUavId] : null}
          telemetryStatus={headerUavId ? headerTelemetryStatus[headerUavId] : null}
        />
      ) : null}
      <div
        className={shouldShowAppChrome ? 'transition-[padding] duration-300 ease-in-out' : undefined}
        style={shouldShowAppChrome ? { paddingLeft: `${sidebarPadding}px` } : undefined}
      >
        <Routes>
          <Route path="/" element={<GuestRoute hasAuthToken={hasAuthToken}><LoginPage /></GuestRoute>} />
          <Route path="/login" element={<GuestRoute hasAuthToken={hasAuthToken}><LoginPage /></GuestRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute hasAuthToken={hasAuthToken}><DashboardPage /></ProtectedRoute>} />
          <Route path="/missions" element={<ProtectedRoute hasAuthToken={hasAuthToken}><MissionPage /></ProtectedRoute>} />
          <Route path="/missions/active" element={<ProtectedRoute hasAuthToken={hasAuthToken}><ActiveMissionPage /></ProtectedRoute>} />
          <Route path="/history" element={<ProtectedRoute hasAuthToken={hasAuthToken}><HistoryPage /></ProtectedRoute>} />
          <Route path="/history/:historyId" element={<ProtectedRoute hasAuthToken={hasAuthToken}><HistoryDetailPage /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute hasAuthToken={hasAuthToken}><SettingsPage /></ProtectedRoute>} />
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
    </div>
  )
}

export default App
