import React, { useEffect, useState } from 'react'
import { Users, Calendar, TrendingUp, UserPlus, Clock, Plus, X, Trash2 } from 'lucide-react'
import { athletes as _mockAthletes, practiceApi } from '../mockStore.js'

// ─── API shim ─────────────────────────────────────────────
const scheduleApi = window.electronAPI
  ? {
      getUpcomingSchedule: () => window.electronAPI.getUpcomingSchedule(),
      createPractice:      (d) => window.electronAPI.createPractice(d),
      deletePractice:      (id) => window.electronAPI.deletePractice(id),
    }
  : practiceApi

// ─── Stat Card ────────────────────────────────────────────
function StatCard({ value, label, color = 'blue', icon: Icon }) {
  return (
    <div className={`stat-card ${color}`}>
      {Icon && (
        <Icon size={22} style={{ position: 'absolute', top: 16, right: 16, opacity: 0.1 }} />
      )}
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  )
}

// ─── Age Distribution Bar ─────────────────────────────────
function AgeBar({ label, count, max }) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0
  return (
    <div className="age-bar-row">
      <span className="age-bar-label">{label}</span>
      <div className="age-bar-track">
        <div className="age-bar-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="age-bar-count">{count}</span>
    </div>
  )
}

// ─── Add Practice Modal ───────────────────────────────────
function AddPracticeModal({ onSave, onClose }) {
  const [form, setForm] = useState({ title: '', date: '', start_time: '', end_time: '', location: '', notes: '' })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    const e = {}
    if (!form.title.trim()) e.title = 'Title is required'
    if (!form.date) e.date = 'Date is required'
    setErrors(e)
    if (Object.keys(e).length) return
    setSaving(true)
    await onSave(form)
    setSaving(false)
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 460 }}>
        <div className="modal-header">
          <div className="modal-title">Add Practice</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={15} /></button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label className="form-label">Title <span style={{ color: 'var(--red)' }}>*</span></label>
            <input className="input" value={form.title} autoFocus
              onChange={e => set('title', e.target.value)} placeholder="Track Practice" />
            {errors.title && <span className="form-error">{errors.title}</span>}
          </div>
          <div className="form-group">
            <label className="form-label">Date <span style={{ color: 'var(--red)' }}>*</span></label>
            <input className="input" type="date" value={form.date} onChange={e => set('date', e.target.value)} />
            {errors.date && <span className="form-error">{errors.date}</span>}
          </div>
          <div className="form-group">
            <label className="form-label">Location</label>
            <input className="input" value={form.location} onChange={e => set('location', e.target.value)}
              placeholder="Track, field name…" />
          </div>
          <div className="form-group">
            <label className="form-label">Start Time</label>
            <input className="input" type="time" value={form.start_time} onChange={e => set('start_time', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">End Time</label>
            <input className="input" type="time" value={form.end_time} onChange={e => set('end_time', e.target.value)} />
          </div>
          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label className="form-label">Notes</label>
            <textarea className="input" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)}
              placeholder="Sprint focus, optional…" />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Add Practice'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────
export default function Dashboard() {
  const [stats,    setStats]    = useState(null)
  const [schedule, setSchedule] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [showAdd,  setShowAdd]  = useState(false)

  const calcAge = dob =>
    Math.floor((Date.now() - new Date(dob + 'T00:00:00')) / (365.25 * 24 * 3600 * 1000))

  const getAgeGroup = age => {
    if (age <= 6)  return '5-6'
    if (age <= 8)  return '7-8'
    if (age <= 10) return '9-10'
    if (age <= 12) return '11-12'
    if (age <= 14) return '13-14'
    if (age <= 16) return '15-16'
    return '17-18'
  }

  const loadSchedule = () =>
    scheduleApi.getUpcomingSchedule().then(setSchedule).catch(() => {})

  useEffect(() => {
    if (window.electronAPI) {
      Promise.all([
        window.electronAPI.getDashboardStats(),
        scheduleApi.getUpcomingSchedule(),
      ]).then(([s, sched]) => {
        setStats(s)
        setSchedule(sched)
        setLoading(false)
      }).catch(() => setLoading(false))
    } else {
      // Browser preview — compute from shared mock store
      const active = _mockAthletes.filter(a => a.active)
      const ageCounts = {}
      active.forEach(a => {
        const grp = getAgeGroup(calcAge(a.date_of_birth))
        ageCounts[grp] = (ageCounts[grp] ?? 0) + 1
      })
      const ageDistribution = Object.entries(ageCounts)
        .map(([age_group, count]) => ({ age_group, count }))
        .sort((a, b) => a.age_group.localeCompare(b.age_group))
      const recentAthletes = [...active]
        .sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))
        .slice(0, 5)
        .map(a => ({ ...a, age: calcAge(a.date_of_birth) }))
      setStats({
        totalAthletes:  active.length,
        maleAthletes:   active.filter(a => a.gender === 'M').length,
        femaleAthletes: active.filter(a => a.gender === 'F').length,
        upcomingMeets:  0,
        activeSeason:   null,
        ageDistribution,
        recentAthletes,
      })
      loadSchedule()
      setLoading(false)
    }
  }, [])

  const handleAddPractice = async (form) => {
    await scheduleApi.createPractice(form)
    setShowAdd(false)
    loadSchedule()
  }

  const handleDeleteItem = async (item) => {
    if (item.item_type !== 'practice') return
    await scheduleApi.deletePractice(item.id)
    loadSchedule()
  }

  if (loading) {
    return <div className="loading-container"><div className="loading-spinner" /></div>
  }

  const maxAge = stats
    ? Math.max(...(stats.ageDistribution?.map(a => a.count) ?? []), 1)
    : 1

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  const fmtTime = (t) => {
    if (!t) return null
    const [h, m] = t.split(':').map(Number)
    const ampm = h >= 12 ? 'PM' : 'AM'
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`
  }

  return (
    <div className="dashboard-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="page-title">DASHBOARD</div>
          <div className="page-subtitle">
            {stats?.activeSeason
              ? `Active season: ${stats.activeSeason.name} · ${stats.activeSeason.type}`
              : 'No active season — add one in Settings'}
          </div>
        </div>
        <span className="badge badge-blue" style={{ fontSize: 12, padding: '5px 12px' }}>
          {today}
        </span>
      </div>

      {/* Stat Cards */}
      <div className="stats-row">
        <StatCard value={stats?.totalAthletes  ?? 0} label="Total Athletes"  color="blue"   icon={Users}    />
        <StatCard value={stats?.maleAthletes   ?? 0} label="Male Athletes"   color="gold"   icon={Users}    />
        <StatCard value={stats?.femaleAthletes ?? 0} label="Female Athletes" color="purple" icon={Users}    />
        <StatCard value={schedule.filter(s => s.item_type === 'meet').length} label="Upcoming Meets" color="green" icon={Calendar} />
      </div>

      {/* Grid */}
      <div className="dashboard-grid">

        {/* Age Distribution */}
        <div className="card">
          <div className="card-header">
            <TrendingUp size={14} /> Age Group Distribution
          </div>
          {stats?.ageDistribution?.length > 0 ? (
            <div className="age-bars">
              {stats.ageDistribution.map(({ age_group, count }) => (
                <AgeBar key={age_group} label={age_group} count={count} max={maxAge} />
              ))}
            </div>
          ) : (
            <div className="empty-state" style={{ padding: '28px 0' }}>
              <p>No athletes added yet</p>
            </div>
          )}
        </div>

        {/* Recently Added */}
        <div className="card">
          <div className="card-header">
            <UserPlus size={14} /> Recently Added Athletes
          </div>
          {stats?.recentAthletes?.length > 0 ? (
            <div className="recent-list">
              {stats.recentAthletes.map((a, i) => (
                <div key={i} className="recent-item">
                  <div className={`avatar avatar-${a.gender === 'M' ? 'male' : 'female'}`}>
                    {a.first_name[0]}{a.last_name[0]}
                  </div>
                  <div>
                    <div className="recent-name">{a.first_name} {a.last_name}</div>
                    <div className="recent-meta">Age {a.age} · {a.gender === 'M' ? 'Male' : 'Female'}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state" style={{ padding: '28px 0' }}>
              <p>No athletes added yet</p>
            </div>
          )}
        </div>

        {/* Schedule */}
        <div className="card">
          <div className="card-header" style={{ justifyContent: 'space-between' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Clock size={14} /> Upcoming Schedule
            </span>
            <button className="btn btn-ghost" style={{ fontSize: 11, padding: '3px 8px' }}
              onClick={() => setShowAdd(true)}>
              <Plus size={12} /> Practice
            </button>
          </div>

          {schedule.length === 0 ? (
            <div className="empty-state" style={{ padding: '28px 0' }}>
              <p>Nothing scheduled yet</p>
            </div>
          ) : (
            <div className="recent-list">
              {schedule.map((item, i) => {
                const d = new Date(item.date + 'T00:00:00')
                const isPractice = item.item_type === 'practice'
                const timeStr = item.start_time
                  ? fmtTime(item.start_time) + (item.end_time ? ` – ${fmtTime(item.end_time)}` : '')
                  : null
                return (
                  <div key={i} className="recent-item" style={{ alignItems: 'flex-start' }}>
                    {/* Date box */}
                    <div className="meet-date-box" style={{
                      background: isPractice ? 'var(--bg-tertiary)' : 'var(--accent-dim)',
                      flexShrink: 0,
                    }}>
                      <span>{d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}</span>
                      <span>{d.getDate()}</span>
                    </div>

                    {/* Details */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span className="recent-name" style={{ flex: 1 }}>{item.title}</span>
                        <span className={`badge ${isPractice ? 'badge-neutral' : 'badge-blue'}`}
                          style={{ fontSize: 9, flexShrink: 0 }}>
                          {isPractice ? 'Practice' : 'Meet'}
                        </span>
                      </div>
                      <div className="recent-meta" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {timeStr && <span>{timeStr}</span>}
                        {item.location && <span>{item.location}</span>}
                      </div>
                    </div>

                    {/* Delete (practices only) */}
                    {isPractice && (
                      <button className="btn btn-ghost btn-icon" style={{ padding: 4, flexShrink: 0, opacity: 0.5 }}
                        onClick={() => handleDeleteItem(item)} title="Remove practice">
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

      </div>

      {showAdd && (
        <AddPracticeModal onSave={handleAddPractice} onClose={() => setShowAdd(false)} />
      )}
    </div>
  )
}
