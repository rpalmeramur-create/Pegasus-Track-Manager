import React from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  Flag,
  CalendarDays,
  Trophy,
  BarChart2,
  Settings,
} from 'lucide-react'
import AppLogo from './AppLogo.jsx'

const NAV_ITEMS = [
  { to: '/',         icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { to: '/roster',   icon: Users,           label: 'Teams' },
  { to: '/meets',    icon: Flag,            label: 'Meets' },
  { to: '/calendar', icon: CalendarDays,    label: 'Calendar' },
  { to: '/results',  icon: Trophy,          label: 'Results' },
  { to: '/records',  icon: BarChart2,       label: 'Records' },
]

export default function Sidebar() {
  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <AppLogo size={22} />
        </div>
        <div>
          <div className="sidebar-logo-name">PEGASUS</div>
          <div className="sidebar-logo-sub">TRACK</div>
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
        <div className="sidebar-version">Pegasus Track v0.1.0</div>
      </div>
    </aside>
  )
}
