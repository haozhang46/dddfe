import { Navigate, Outlet } from 'react-router'
import { canAccessRoute, type Permission } from '../../domain/user'
import { useAuth } from '../auth/AuthContext'

export function RequirePermission({
  permission,
}: {
  permission: Permission | Permission[]
}) {
  const { session, status } = useAuth()

  if (status === 'booting') {
    return <p className="page">加载中…</p>
  }

  if (!session || !canAccessRoute(session, permission)) {
    return <Navigate to="/forbidden" replace />
  }

  return <Outlet />
}
