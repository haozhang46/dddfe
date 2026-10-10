import type { AuthSessionStore } from '../../application/ports/AuthSessionStore'

export const AUTH_JSON_STORAGE_KEY = 'dddfe.authJson'

export function createSessionStorageAuthStore(
  storage: Storage = sessionStorage,
): AuthSessionStore {
  return {
    load(): string | null {
      return storage.getItem(AUTH_JSON_STORAGE_KEY)
    },
    save(authJson: string): void {
      storage.setItem(AUTH_JSON_STORAGE_KEY, authJson)
    },
    clear(): void {
      storage.removeItem(AUTH_JSON_STORAGE_KEY)
    },
  }
}
