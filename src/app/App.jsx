import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import AppHeader from '../shared/components/AppHeader'
import DashboardPage from '../features/dashboard/pages/DashboardPage'
import MissionPage from '../features/missions/pages/MissionPage'
import ActiveMissionPage from '../features/missions/pages/ActiveMissionPage'
import HistoryPage from '../features/history/pages/HistoryPage'
import AboutPage from '../features/settings/pages/AboutPage'
import UserManagementPage from '../features/settings/pages/UserManagementPage'
import LoginPage from '../features/auth/pages/LoginPage'
import appBackground from '../assets/images/image_background_about.png'

function AdminRoute({ children }) {
  const authRole = (localStorage.getItem('authRole') || '').toLowerCase();
  const isAdmin = authRole === 'admin';

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function App() {
  const location = useLocation();
  const isLoginPage = location.pathname === '/' || location.pathname === '/login';

  return (
    <div
      className={`min-h-screen flex flex-col font-sans ${isLoginPage ? '' : 'bg-cover bg-center bg-no-repeat'}`}
      style={isLoginPage ? undefined : { backgroundImage: `url(${appBackground})` }}
    >
      {!isLoginPage && <AppHeader />}
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/missions" element={<MissionPage />} />
        <Route path="/missions/active" element={<ActiveMissionPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route
          path="/user-management"
          element={
            <AdminRoute>
              <UserManagementPage />
            </AdminRoute>
          }
        />
      </Routes>
    </div>
  )
}

export default App
