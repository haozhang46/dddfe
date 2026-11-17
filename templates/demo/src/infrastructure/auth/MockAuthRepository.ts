import type { AuthRepository } from '../../application/ports/AuthRepository'
import { delay } from '../mock/delay'
import { QueuePriority, type RequestQueue } from '../queue/RequestQueue'
import { authJsonForUsername } from './mockUsers'

export function createMockAuthRepository(queue: RequestQueue): AuthRepository {
  return {
    login(username, signal) {
      return queue.enqueue(
        async (qSignal) => {
          await delay(200, qSignal)
          const authJson = authJsonForUsername(username)
          if (!authJson) {
            throw new Error(`Unknown user: ${username}`)
          }
          return authJson
        },
        { key: `auth:login:${username}`, signal, priority: QueuePriority.userWaiting },
      )
    },
  }
}
