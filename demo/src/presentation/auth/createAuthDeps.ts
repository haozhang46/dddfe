import { createLoadSession } from '../../application/use-cases/loadSession'
import { createLogin } from '../../application/use-cases/login'
import { createLogout } from '../../application/use-cases/logout'
import { createMockAuthRepository } from '../../infrastructure/auth/MockAuthRepository'
import { createSessionStorageAuthStore } from '../../infrastructure/auth/SessionStorageAuthStore'

export function createAuthDeps() {
  const authRepo = createMockAuthRepository()
  const sessionStore = createSessionStorageAuthStore()

  return {
    login: createLogin({ authRepo, sessionStore }),
    logout: createLogout({ sessionStore }),
    loadSession: createLoadSession({ sessionStore }),
  }
}

export type AuthDeps = ReturnType<typeof createAuthDeps>
