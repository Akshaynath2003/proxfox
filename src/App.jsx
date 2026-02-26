import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DashboardLayout } from './layout/DashboardLayout';
import { Dashboard } from './pages/Dashboard';
import { AIAdvisor } from './pages/AIAdvisor';
import { Transactions } from './pages/Transactions';
import { Analytics } from './pages/Analytics';
import { Investments } from './pages/Investments';
import { Settings } from './pages/Settings';
import { Admin } from './pages/Admin';
import { Auth } from './pages/Auth';

// Protected Route Component to restrict access
const ProtectedRoute = ({ children, requireAdmin }) => {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'white' }}>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" />;
  }

  if (requireAdmin && user?.role !== 'admin') {
    return <Navigate to="/" />;
  }

  return children;
};

// Redirect to dashboard if already logged in
const AuthRoute = ({ children }) => {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) return null;

  if (isAuthenticated) {
    return <Navigate to={user?.role === 'admin' ? '/admin' : '/'} />;
  }

  return children;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Auth Route */}
          <Route path="/auth" element={
            <AuthRoute>
              <Auth />
            </AuthRoute>
          } />

          {/* Protected Main Layout Routes */}
          <Route path="/" element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Dashboard />} />
            <Route path="transactions" element={<Transactions />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="investments" element={<Investments />} />
            <Route path="ai-advisor" element={<AIAdvisor />} />
            <Route path="settings" element={<Settings />} />

            {/* Admin Only Route */}
            <Route path="admin" element={
              <ProtectedRoute requireAdmin={true}>
                <Admin />
              </ProtectedRoute>
            } />

            <Route path="*" element={<Dashboard />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
