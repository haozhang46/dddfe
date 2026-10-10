import { createContext, useContext, type ReactNode } from 'react'
import type { AppDeps } from './createAppDeps'

const AppDepsContext = createContext<AppDeps | null>(null)

export function AppDepsProvider({
  deps,
  children,
}: {
  deps: AppDeps
  children: ReactNode
}) {
  return (
    <AppDepsContext.Provider value={deps}>{children}</AppDepsContext.Provider>
  )
}

export function useAppDeps(): AppDeps {
  const deps = useContext(AppDepsContext)
  if (!deps) {
    throw new Error('useAppDeps must be used within AppDepsProvider')
  }
  return deps
}
