import { describe, expect, it } from 'vitest'
import { parseAuthJson, type AuthSession } from './model'
import { canAccessRoute, hasPermission } from './permissions'

const editor: AuthSession = {
  userId: 'u-editor',
  displayName: 'Editor',
  roles: ['editor'],
  permissions: ['order:view', 'order:edit', 'order:submit'],
  issuedAt: 1,
}

describe('parseAuthJson', () => {
  it('parses valid authJson', () => {
    const s = parseAuthJson(JSON.stringify(editor))
    expect(s?.userId).toBe('u-editor')
    expect(s?.permissions).toContain('order:view')
  })
  it('returns null for invalid json', () => {
    expect(parseAuthJson('{')).toBeNull()
  })
  it('returns null when permissions missing', () => {
    expect(parseAuthJson(JSON.stringify({ userId: 'x' }))).toBeNull()
  })
})

describe('hasPermission / canAccessRoute', () => {
  it('allows when permission present', () => {
    expect(hasPermission(editor, 'order:submit')).toBe(true)
  })
  it('denies when missing', () => {
    expect(hasPermission(editor, 'admin:panel')).toBe(false)
  })
  it('canAccessRoute requires all listed perms', () => {
    expect(canAccessRoute(editor, 'order:view')).toBe(true)
    expect(canAccessRoute(editor, ['order:view', 'admin:panel'])).toBe(false)
  })
})
