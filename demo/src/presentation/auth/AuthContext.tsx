import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { AuthSession } from '../../domain/user'
import { createAuthDeps, type AuthDeps } from './createAuthDeps'

export type AuthStatus = 'booting' | 'anon' | 'authed'

type AuthContextValue = {
  session: AuthSession | null
  status: AuthStatus
  login: (username: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({
  children,
  deps,
}: {
  children: ReactNode
  deps?: AuthDeps
}) {
  const authDeps = useMemo(() => deps ?? createAuthDeps(), [deps])
  const [session, setSession] = useState<AuthSession | null>(() =>
    authDeps.loadSession(),
  )

  const status: AuthStatus = session ? 'authed' : 'anon'

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      status,
      async login(username: string) {
        const next = await authDeps.login(username)
        setSession(next)
      },
      logout() {
        authDeps.logout()
        setSession(null)
      },
    }),
    [authDeps, session, status],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}
