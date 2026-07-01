import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { auth } from '@/api'

interface AuthState {
  user: string | null
  loading: boolean
  login: (user: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    auth
      .me()
      .then((r) => setUser(r.authenticated ? r.user || null : null))
      .finally(() => setLoading(false))
  }, [])

  const login = async (user: string, password: string) => {
    const r = await auth.login(user, password)
    setUser(r.user)
  }

  const logout = async () => {
    await auth.logout()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
