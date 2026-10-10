import type { AuthSession } from '../../domain/user'

type MockUser = AuthSession & { username: string }

const users: MockUser[] = [
  {
    username: 'viewer',
    userId: 'u-viewer',
    displayName: 'Viewer',
    roles: ['viewer'],
    permissions: ['order:view'],
    issuedAt: 1,
  },
  {
    username: 'editor',
    userId: 'u-editor',
    displayName: 'Editor',
    roles: ['editor'],
    permissions: ['order:view', 'order:edit', 'order:submit'],
    issuedAt: 1,
  },
  {
    username: 'admin',
    userId: 'u-admin',
    displayName: 'Admin',
    roles: ['admin'],
    permissions: [
      'order:view',
      'order:edit',
      'order:submit',
      'order:field:payType',
      'admin:panel',
    ],
    issuedAt: 1,
  },
]

export function listMockUsernames(): string[] {
  return users.map((u) => u.username)
}

export function authJsonForUsername(username: string): string | null {
  const user = users.find((u) => u.username === username)
  if (!user) return null
  const { username: _username, ...session } = user
  return JSON.stringify({
    ...session,
    issuedAt: Date.now(),
  })
}
