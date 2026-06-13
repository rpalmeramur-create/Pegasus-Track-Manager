import React, { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { getSavedTheme, applyTheme } from './theme.js'
import { SettingsProvider } from './SettingsContext.jsx'
import { AuthProvider, useAuth } from './AuthContext.jsx'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import Roster from './pages/Roster'
import Meets from './pages/Meets'
import CalendarPage from './pages/Calendar'
import Settings from './pages/Settings'
import Results  from './pages/Results'
import Records  from './pages/Records'
import Scores   from './pages/Scores'
import Attendance from './pages/Attendance'
import Login from './pages/Login'
import ParentPortal from './pages/ParentPortal'
import AgentPanel from './agents/AgentPanel'

function AdminApp() {
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        <Routes>
          <Route path="/"           element={<Dashboard />} />
          <Route path="/roster"     element={<Roster />} />
          <Route path="/meets"      element={<Meets />} />
          <Route path="/calendar"   element={<CalendarPage />} />
          <Route path="/results"    element={<Results />} />
          <Route path="/records"    element={<Records />} />
          <Route path="/scores"     element={<Scores />} />
          <Route path="/attendance" element={<Attendance />} />
          <Route path="/settings"   element={<Settings />} />
          <Route path="*"           element={<Navigate to="/" replace />} />
        </Routes>
        <AgentPanel />
      </main>
    </div>
  )
}

function AppContent() {
  const { user } = useAuth()
  if (!user) return <Login />
  if (user.role === 'parent') return <ParentPortal />
  return <AdminApp />
}

export default function App() {
  useEffect(() => { applyTheme(getSavedTheme()) }, [])

  return (
    <AuthProvider>
      <SettingsProvider>
        <AppContent />
      </SettingsProvider>
    </AuthProvider>
  )
}
