import { requestQueue } from '../infrastructure/queue/RequestQueue'
import { createAuthDeps } from './auth/createAuthDeps'
import { createDeps as createOrderDeps } from './pages/order/createDeps'

export function createAppDeps() {
  return {
    auth: createAuthDeps(requestQueue),
    order: createOrderDeps(requestQueue),
    dispose() {
      requestQueue.dispose()
    },
  }
}

export type AppDeps = ReturnType<typeof createAppDeps>
