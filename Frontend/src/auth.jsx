import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { api } from './api.js'

const AuthContext = createContext(null)

export const homeFor = (user) => (user.role === 'doctor' ? '/doctor' : '/patient')

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.me()
      .then((d) => setUser(d.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  const logout = useCallback(async () => {
    try {
      await api.logout()
    } finally {
      setUser(null)
    }
  }, [])

  return <AuthContext.Provider value={{ user, setUser, loading, logout }}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)

// Route guard: only lets the given role in, otherwise sends people to the right place.
export function RequireRole({ role, children }) {
  const { user, loading } = useAuth()
  if (loading) return <p style={{ padding: 48, textAlign: 'center', color: 'var(--text-2)' }}>Loading…</p>
  if (!user) return <Navigate to={`/login?role=${role}`} replace />
  if (user.role !== role) return <Navigate to={homeFor(user)} replace />
  return children
}
