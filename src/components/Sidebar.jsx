import React from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  Flag,
  CalendarDays,
  Trophy,
  BarChart2,
  TrendingUp,
  ClipboardList,
  Settings,
  LogOut,
} from 'lucide-react'
import AppLogo from './AppLogo.jsx'
import { useSettings } from '../SettingsContext.jsx'
import { useAuth } from '../AuthContext.jsx'

const NAV_ITEMS = [
  { to: '/',           icon: LayoutDashboard, label: 'Dashboard',  exact: true },
  { to: '/roster',     icon: Users,           label: 'Teams' },
  { to: '/meets',      icon: Flag,            label: 'Meets' },
  { to: '/calendar',   icon: CalendarDays,    label: 'Calendar' },
  { to: '/results',    icon: Trophy,          label: 'Results' },
  { to: '/records',    icon: BarChart2,       label: 'Records' },
  { to: '/scores',     icon: TrendingUp,      label: 'Scores' },
  { to: '/attendance', icon: ClipboardList,   label: 'Attendance' },
]

export default function Sidebar() {
  const { homeTeam } = useSettings()
  const { user, logout } = useAuth()
  const [org, sub] = homeTeam.includes(' ')
    ? [homeTeam.split(' ').slice(0, -1).join(' '), homeTeam.split(' ').slice(-1)[0]]
    : [homeTeam, '']

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <AppLogo size={22} />
        </div>
        <div>
          <div className="sidebar-logo-name">{org.toUpperCase()}</div>
          {sub && <div className="sidebar-logo-sub">{sub.toUpperCase()}</div>}
        </div>
      </div>

      <div className="sidebar-divider" />

      {/* Primary Navigation */}
      <nav className="sidebar-nav">
        <div className="sidebar-nav-label">Navigation</div>
        {NAV_ITEMS.map(({ to, icon: Icon, label, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
          >
            <Icon size={16} strokeWidth={1.75} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Bottom */}
      <div className="sidebar-bottom">
        <div className="sidebar-divider" />
        <NavLink
          to="/settings"
          className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
        >
          <Settings size={16} strokeWidth={1.75} />
          <span>Settings</span>
        </NavLink>
        {user && (
          <div style={{ padding: '4px 12px 2px', fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user.display_name || user.username}
            </span>
            <button className="btn btn-ghost btn-icon" style={{ padding: 3, flexShrink: 0 }}
              title="Sign out" onClick={logout}>
              <LogOut size={13} />
            </button>
          </div>
        )}
        <div className="sidebar-version">v0.4.0</div>
      </div>
    </aside>
  )
}
