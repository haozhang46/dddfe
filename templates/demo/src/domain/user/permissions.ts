import type { AuthSession, Permission } from './model'

export function hasPermission(session: AuthSession, code: Permission): boolean {
  return session.permissions.includes(code)
}

export function hasAllPermissions(
  session: AuthSession,
  codes: Permission[],
): boolean {
  return codes.every((code) => hasPermission(session, code))
}

export function canAccessRoute(
  session: AuthSession,
  required: Permission | Permission[],
): boolean {
  const codes = Array.isArray(required) ? required : [required]
  return hasAllPermissions(session, codes)
}
