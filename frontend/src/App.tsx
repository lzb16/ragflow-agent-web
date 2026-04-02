import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import AgentDetail from './pages/AgentDetail'
import Submit from './pages/Submit'
import Login from './pages/Login'
import Register from './pages/Register'
import Admin from './pages/Admin'
import AdminUsers from './pages/AdminUsers'
import ProtectedRoute from './components/ProtectedRoute'

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/agents/:id" element={<AgentDetail />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/submit" element={<ProtectedRoute><Submit /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute adminOnly><Admin /></ProtectedRoute>} />
        <Route path="/admin/users" element={<ProtectedRoute adminOnly><AdminUsers /></ProtectedRoute>} />
      </Routes>
    </div>
  )
}
