import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from '../auth/AuthContext'

export function RequireAuth() {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'booting') {
    return <p className="page">加载中…</p>
  }

  if (status === 'anon') {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <Outlet />
}
