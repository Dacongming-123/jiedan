import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import useAuthStore from './store/authStore'
import { connectSocket } from './services/socket'
import usePageTracking from './hooks/usePageTracking'

// Pages
import Home from './pages/Home'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import DemandSquare from './pages/demand/DemandSquare'
import DemandDetail from './pages/demand/DemandDetail'
import PostDemand from './pages/demand/PostDemand'
import Applicants from './pages/demand/Applicants'
import MyApplications from './pages/demand/MyApplications'
import CreatorSquare from './pages/creator/CreatorSquare'
import CreatorProfile from './pages/creator/CreatorProfile'
import OrderCenter from './pages/order/OrderCenter'
import OrderDetail from './pages/order/OrderDetail'
import ProjectProgress from './pages/order/ProjectProgress'
import Review from './pages/order/Review'
import Appeal from './pages/order/Appeal'
import Chat from './pages/chat/Chat'
import Wallet from './pages/finance/Wallet'
import Notifications from './pages/notifications/Notifications'
import Settings from './pages/user/Settings'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminLogin from './pages/admin/AdminLogin'

function RequireAuth({ children }) {
  const { isLoggedIn } = useAuthStore()
  return isLoggedIn ? children : <Navigate to="/login" replace />
}

function RequireAdmin({ children }) {
  const token = localStorage.getItem('zc-admin-token')
  return token ? children : <Navigate to="/admin/login" replace />
}

function AppInner() {
  const { isLoggedIn, token } = useAuthStore()
  usePageTracking()
  useEffect(() => {
    if (isLoggedIn && token) connectSocket(token)
  }, [isLoggedIn, token])
  return null
}

export default function App() {
  return (
    <BrowserRouter>
      <AppInner />
      <Routes>
        {/* Public */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/demand" element={<DemandSquare />} />
        <Route path="/demand/:id" element={<DemandDetail />} />
        <Route path="/creators" element={<CreatorSquare />} />
        <Route path="/profile/:id" element={<CreatorProfile />} />

        {/* Auth required */}
        <Route path="/post" element={<RequireAuth><PostDemand /></RequireAuth>} />
        <Route path="/demand/:id/applicants" element={<RequireAuth><Applicants /></RequireAuth>} />
        <Route path="/applications" element={<RequireAuth><MyApplications /></RequireAuth>} />
        <Route path="/orders" element={<RequireAuth><OrderCenter /></RequireAuth>} />
        <Route path="/orders/:id" element={<RequireAuth><OrderDetail /></RequireAuth>} />
        <Route path="/orders/:id/progress" element={<RequireAuth><ProjectProgress /></RequireAuth>} />
        <Route path="/orders/:id/review" element={<RequireAuth><Review /></RequireAuth>} />
        <Route path="/orders/:id/appeal" element={<RequireAuth><Appeal /></RequireAuth>} />
        <Route path="/chat" element={<RequireAuth><Chat /></RequireAuth>} />
        <Route path="/chat/:convId" element={<RequireAuth><Chat /></RequireAuth>} />
        <Route path="/wallet" element={<RequireAuth><Wallet /></RequireAuth>} />
        <Route path="/notifications" element={<RequireAuth><Notifications /></RequireAuth>} />
        <Route path="/settings" element={<RequireAuth><Settings /></RequireAuth>} />

        {/* Admin */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/*" element={<RequireAdmin><AdminDashboard /></RequireAdmin>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
