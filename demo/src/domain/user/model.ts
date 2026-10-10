export type Permission = string

export type AuthSession = {
  userId: string
  displayName: string
  roles: string[]
  permissions: Permission[]
  issuedAt: number
}

export function createAuthSession(partial: AuthSession): AuthSession {
  return {
    userId: partial.userId,
    displayName: partial.displayName,
    roles: [...partial.roles],
    permissions: [...partial.permissions],
    issuedAt: partial.issuedAt,
  }
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

export function parseAuthJson(json: string): AuthSession | null {
  let raw: unknown
  try {
    raw = JSON.parse(json)
  } catch {
    return null
  }
  if (!raw || typeof raw !== 'object') return null

  const obj = raw as Record<string, unknown>
  if (typeof obj.userId !== 'string' || obj.userId.length === 0) return null
  if (typeof obj.displayName !== 'string') return null
  if (!isStringArray(obj.permissions)) return null

  const roles = isStringArray(obj.roles) ? obj.roles : []
  const issuedAt = typeof obj.issuedAt === 'number' ? obj.issuedAt : 0

  return createAuthSession({
    userId: obj.userId,
    displayName: obj.displayName,
    roles,
    permissions: obj.permissions,
    issuedAt,
  })
}
