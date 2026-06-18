import React, { createContext, useContext, useEffect, useState } from 'react'

const AuthCtx = createContext({ user: null, login: async () => {}, logout: async () => {} })

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(undefined) // undefined = loading
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    if (!window.electronAPI?.authGetSession) { setChecked(true); return }
    window.electronAPI.authGetSession()
      .then(s => { setUser(s || null) })
      .catch(() => { setUser(null) })
      .finally(() => setChecked(true))
  }, [])

  const login = async ({ username, password }) => {
    const res = await window.electronAPI.authLogin({ username, password })
    if (res?.error) return res
    setUser(res)
    return res
  }

  const logout = async () => {
    await window.electronAPI?.authLogout?.()
    setUser(null)
  }

  if (!checked) return null

  return (
    <AuthCtx.Provider value={{ user, setUser, login, logout }}>
      {children}
    </AuthCtx.Provider>
  )
}

export const useAuth = () => useContext(AuthCtx)
