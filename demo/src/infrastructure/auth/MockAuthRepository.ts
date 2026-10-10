import type { AuthRepository } from '../../application/ports/AuthRepository'
import { delay } from '../mock/delay'
import { authJsonForUsername } from './mockUsers'

export function createMockAuthRepository(): AuthRepository {
  return {
    async login(username: string, signal?: AbortSignal): Promise<string> {
      await delay(200, signal)
      const authJson = authJsonForUsername(username)
      if (!authJson) {
        throw new Error(`Unknown user: ${username}`)
      }
      return authJson
    },
  }
}
