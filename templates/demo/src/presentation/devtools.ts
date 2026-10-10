type DevtoolsConnection = {
  init: (state: unknown) => void
  send: (action: { type: string }, state: unknown) => void
}

type DevtoolsExtension = {
  connect: (options: { name: string }) => DevtoolsConnection
}

declare global {
  interface Window {
    __REDUX_DEVTOOLS_EXTENSION__?: DevtoolsExtension
  }
}

/** Connect a custom store to the Redux DevTools browser extension (DEV only). */
export function connectDevtools(name: string): DevtoolsConnection | null {
  if (!import.meta.env.DEV) return null
  return window.__REDUX_DEVTOOLS_EXTENSION__?.connect({ name }) ?? null
}
