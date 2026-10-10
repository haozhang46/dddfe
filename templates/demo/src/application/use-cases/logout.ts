import type { AuthSessionStore } from '../ports/AuthSessionStore'

export function createLogout(deps: { sessionStore: AuthSessionStore }) {
  return (): void => {
    deps.sessionStore.clear()
  }
}

export type Logout = ReturnType<typeof createLogout>
