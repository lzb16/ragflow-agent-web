import { Navigate, useLocation } from 'react-router-dom'

interface Props {
  children: React.ReactNode
  adminOnly?: boolean
}

export default function ProtectedRoute({ children, adminOnly = false }: Props) {
  const token = localStorage.getItem('token')
  const isAdmin = localStorage.getItem('is_admin') === 'true'
  const location = useLocation()

  if (!token) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />
  }
  if (adminOnly && !isAdmin) {
    return <Navigate to="/" replace />
  }
  return <>{children}</>
}
