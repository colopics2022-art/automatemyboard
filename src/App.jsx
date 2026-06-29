import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Layout from './components/layout/Layout'
import LoginPage from './pages/auth/LoginPage'
import DashboardPage from './pages/dashboard/DashboardPage'
import UnitsPage from './pages/units/UnitsPage'
import DocumentsPage from './pages/documents/DocumentsPage'
import RecordRequestsPage from './pages/documents/RecordRequestsPage'

function ProtectedRoute({ children, roles }) {
  const { user, loading, hasAnyRole } = useAuth()
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  // If specific roles required, check using hasAnyRole()
  if (roles && !hasAnyRole(roles)) return <Navigate to="/dashboard" replace />
  return children
}

export default function App() {
  const { user } = useAuth()

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />} />

      <Route path="/" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="units" element={
          <ProtectedRoute roles={['admin', 'board']}>
            <UnitsPage />
          </ProtectedRoute>
        } />
        <Route path="documents" element={<DocumentsPage />} />
        <Route path="documents/requests" element={<RecordRequestsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
