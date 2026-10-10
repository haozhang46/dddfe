import type { ReactNode } from 'react'
import { hasPermission, type Permission } from '../../domain/user'
import { useAuth } from '../auth/AuthContext'

export function Can({
  permission,
  children,
  fallback = null,
}: {
  permission: Permission
  children: ReactNode
  fallback?: ReactNode
}) {
  const { session } = useAuth()
  if (!session || !hasPermission(session, permission)) {
    return <>{fallback}</>
  }
  return <>{children}</>
}
