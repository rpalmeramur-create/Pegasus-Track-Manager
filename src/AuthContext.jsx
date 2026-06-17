import React, { createContext, useContext, useEffect, useState } from 'react'
import { webGetSession, webLogin, webLogout } from './lib/portalApi.js'

const AuthCtx = createContext({ user: null, login: async () => {}, logout: async () => {} })

const isElectron = () => !!window.electronAPI?.authGetSession

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(undefined) // undefined = loading
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    if (isElectron()) {
      window.electronAPI.authGetSession()
        .then(s => setUser(s || null))
        .catch(() => setUser(null))
        .finally(() => setChecked(true))
    } else {
      webGetSession()
        .then(s => setUser(s))
        .catch(() => setUser(null))
        .finally(() => setChecked(true))
    }
  }, [])

  const login = async (credentials) => {
    if (isElectron()) {
      const res = await window.electronAPI.authLogin({ username: credentials.username, password: credentials.password })
      if (res?.error) return res
      setUser(res)
      return res
    } else {
      const res = await webLogin(credentials.email, credentials.password)
      if (res?.error) return res
      setUser(res)
      return res
    }
  }

  const logout = async () => {
    if (isElectron()) {
      await window.electronAPI.authLogout?.()
    } else {
      await webLogout()
    }
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
