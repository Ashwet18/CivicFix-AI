/**
 * Main App component with routing
 */
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Header } from './components/Header';
import { ProtectedRoute } from './components/ProtectedRoute';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import ReportIssuePage from './pages/ReportIssuePage';
import MyIssuesPage from './pages/MyIssuesPage';
import IssueDetailPage from './pages/IssueDetailPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import AdminIssuesPage from './pages/AdminIssuesPage';
import AdminIssueDetailPage from './pages/AdminIssueDetailPage';
import AdminMapPage from './pages/AdminMapPage';
import MapTest from './pages/MapTest';
import DiagnosticPage from './pages/DiagnosticPage';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="min-h-screen bg-gray-50">
          <Header />
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/map-test" element={<MapTest />} />
            <Route path="/diagnostic" element={<DiagnosticPage />} />

            {/* Citizen routes - Phase 2 Implementation */}
            <Route
              path="/report"
              element={
                <ProtectedRoute requireRole="citizen">
                  <ReportIssuePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-issues"
              element={
                <ProtectedRoute requireRole="citizen">
                  <MyIssuesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/issues/:id"
              element={
                <ProtectedRoute requireRole="citizen">
                  <IssueDetailPage />
                </ProtectedRoute>
              }
            />

            {/* Legacy citizen routes - redirect to new structure */}
            <Route
              path="/citizen/*"
              element={
                <ProtectedRoute requireRole="citizen">
                  <Routes>
                    <Route path="/" element={<Navigate to="/report" replace />} />
                    <Route path="/report" element={<Navigate to="/report" replace />} />
                    <Route path="/my-issues" element={<Navigate to="/my-issues" replace />} />
                  </Routes>
                </ProtectedRoute>
              }
            />

            {/* Admin routes */}
            <Route
              path="/admin/*"
              element={
                <ProtectedRoute requireRole="admin">
                  <Routes>
                    <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
                    <Route path="/dashboard" element={<AdminDashboardPage />} />
                    <Route path="/issues" element={<AdminIssuesPage />} />
                    <Route path="/issues/:id" element={<AdminIssueDetailPage />} />
                    <Route path="/map" element={<AdminMapPage />} />
                  </Routes>
                </ProtectedRoute>
              }
            />

            {/* Catch-all redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
