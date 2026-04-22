import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import AuthPage from '@/pages/AuthPage'
import TripsPage from '@/pages/TripsPage'
import TripPage from '@/pages/TripPage'
import JoinPage from '@/pages/JoinPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="min-h-screen bg-slate-950" />
  if (!user) return <Navigate to="/auth" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/join/:token" element={<ProtectedRoute><JoinPage /></ProtectedRoute>} />
        <Route path="/trip/:id" element={<ProtectedRoute><TripPage /></ProtectedRoute>} />
        <Route path="/" element={<ProtectedRoute><TripsPage /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  )
}
