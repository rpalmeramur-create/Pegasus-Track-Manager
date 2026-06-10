import React, { createContext, useContext, useEffect, useState } from 'react'

const defaults = {
  homeTeam:           'Pegasus Track',
  attendanceThreshold: 3,
  labelPrinter:       '',
  sheetPrinter:       '',
}

const SettingsCtx = createContext(defaults)

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(defaults)

  useEffect(() => {
    window.electronAPI?.getSettings?.()
      .then(s => { if (s) setSettings(prev => ({ ...prev, ...s })) })
      .catch(() => {})
  }, [])

  return <SettingsCtx.Provider value={settings}>{children}</SettingsCtx.Provider>
}

export const useSettings = () => useContext(SettingsCtx)
