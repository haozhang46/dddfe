import { createLoadSession } from '../../application/use-cases/loadSession'
import { createLogin } from '../../application/use-cases/login'
import { createLogout } from '../../application/use-cases/logout'
import { createMockAuthRepository } from '../../infrastructure/auth/MockAuthRepository'
import { createSessionStorageAuthStore } from '../../infrastructure/auth/SessionStorageAuthStore'
import type { RequestQueue } from '../../infrastructure/queue/RequestQueue'

export function createAuthDeps(queue: RequestQueue) {
  const authRepo = createMockAuthRepository(queue)
  const sessionStore = createSessionStorageAuthStore()

  return {
    login: createLogin({ authRepo, sessionStore }),
    logout: createLogout({ sessionStore }),
    loadSession: createLoadSession({ sessionStore }),
  }
}

export type AuthDeps = ReturnType<typeof createAuthDeps>
