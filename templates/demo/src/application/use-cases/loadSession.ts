import { parseAuthJson, type AuthSession } from '../../domain/user'
import type { AuthSessionStore } from '../ports/AuthSessionStore'

export function createLoadSession(deps: { sessionStore: AuthSessionStore }) {
  return (): AuthSession | null => {
    const authJson = deps.sessionStore.load()
    if (!authJson) return null
    return parseAuthJson(authJson)
  }
}

export type LoadSession = ReturnType<typeof createLoadSession>
