import { parseAuthJson, type AuthSession } from '../../domain/user'
import type { AuthRepository } from '../ports/AuthRepository'
import type { AuthSessionStore } from '../ports/AuthSessionStore'

export function createLogin(deps: {
  authRepo: AuthRepository
  sessionStore: AuthSessionStore
}) {
  return async (username: string, signal?: AbortSignal): Promise<AuthSession> => {
    const authJson = await deps.authRepo.login(username, signal)
    const session = parseAuthJson(authJson)
    if (!session) {
      throw new Error('Invalid authJson from auth repository')
    }
    deps.sessionStore.save(authJson)
    return session
  }
}

export type Login = ReturnType<typeof createLogin>
