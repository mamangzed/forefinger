import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/hooks/useAuth'
import Layout from '@/components/Layout'
import Overview from '@/pages/Overview'
import Visitors from '@/pages/Visitors'
import VisitorDetail from '@/pages/VisitorDetail'
import Events from '@/pages/Events'
import Settings from '@/pages/Settings'
import Login from '@/pages/Login'

function ProtectedLayout() {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div className="dark min-h-screen flex items-center justify-center bg-background text-muted-foreground">
        Loading...
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  return (
    <Layout>
      <Outlet />
    </Layout>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedLayout />}>
          <Route path="/" element={<Overview />} />
          <Route path="/visitors" element={<Visitors />} />
          <Route path="/visitors/:id" element={<VisitorDetail />} />
          <Route path="/events" element={<Events />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}
