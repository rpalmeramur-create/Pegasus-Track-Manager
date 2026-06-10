import React, { useEffect, useState, useCallback } from 'react'
import { ClipboardList, RefreshCw, Check, X, Users, ChevronDown, AlertTriangle, CheckCircle } from 'lucide-react'
import { useSettings } from '../SettingsContext.jsx'

const api = window.electronAPI

function getAgeGroup(age) {
  if (!age) return '—'
  if (age <= 6)  return '5-6'
  if (age <= 8)  return '7-8'
  if (age <= 10) return '9-10'
  if (age <= 12) return '11-12'
  if (age <= 14) return '13-14'
  if (age <= 16) return '15-16'
  return '17-18'
}

// ─── Season Summary View ──────────────────────────────────────
function SeasonSummary({ seasonId, threshold }) {
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(false)
  const [sortKey, setSortKey] = useState('name')

  const load = useCallback(async () => {
    if (!seasonId || !api) return
    setLoading(true)
    try {
      const res = await api.attendanceGetSeasonSummary(seasonId)
      setData(res)
    } finally {
      setLoading(false)
    }
  }, [seasonId])

  useEffect(() => { load() }, [load])

  if (!seasonId) return null
  if (loading) return <div className="empty-state" style={{ padding: 40 }}>Loading summary…</div>
  if (!data) return null

  const meets = data.meets ?? []
  const athletes = data.athletes ?? []

  const sorted = [...athletes].sort((a, b) => {
    if (sortKey === 'name')    return `${a.last_name}${a.first_name}`.localeCompare(`${b.last_name}${b.first_name}`)
    if (sortKey === 'attended') return b.meets_attended - a.meets_attended
    if (sortKey === 'status') {
      const s = x => x.meets_attended >= threshold ? 0 : x.meets_attended >= threshold - 1 ? 1 : 2
      return s(a) - s(b)
    }
    return 0
  })

  const confirmed = athletes.filter(a => a.meets_attended >= threshold).length
  const atRisk    = athletes.filter(a => a.meets_attended >= threshold - 1 && a.meets_attended < threshold).length
  const missing   = athletes.filter(a => a.meets_attended < threshold - 1).length

  return (
    <div>
      {/* Summary cards */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div className="stat-card" style={{ flex: 1, minWidth: 140 }}>
          <div className="stat-value" style={{ color: 'var(--accent)' }}>{meets.length}</div>
          <div className="stat-label">Meets in Season</div>
        </div>
        <div className="stat-card" style={{ flex: 1, minWidth: 140 }}>
          <div className="stat-value" style={{ color: '#22c55e' }}>{confirmed}</div>
          <div className="stat-label">Confirmed</div>
        </div>
        <div className="stat-card" style={{ flex: 1, minWidth: 140 }}>
          <div className="stat-value" style={{ color: '#f59e0b' }}>{atRisk}</div>
          <div className="stat-label">At Risk</div>
        </div>
        <div className="stat-card" style={{ flex: 1, minWidth: 140 }}>
          <div className="stat-value" style={{ color: 'var(--red)' }}>{missing}</div>
          <div className="stat-label">Missing</div>
        </div>
      </div>

      {/* Sort controls */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Sort:</span>
        {[['name','Name'],['attended','Meets'],['status','Status']].map(([k,l]) => (
          <button key={k} className={`btn btn-ghost${sortKey === k ? ' active' : ''}`}
            style={{ fontSize: 11, padding: '3px 10px' }}
            onClick={() => setSortKey(k)}>{l}</button>
        ))}
        <div style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)' }}>
          Threshold: {threshold} meet{threshold !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Athlete table */}
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Athlete</th>
              <th style={{ textAlign: 'center', width: 90 }}>Attended</th>
              <th style={{ textAlign: 'center', width: 100 }}>Status</th>
              {meets.map(m => (
                <th key={m.id} style={{ textAlign: 'center', width: 48, fontSize: 10, whiteSpace: 'nowrap',
                  maxWidth: 48, overflow: 'hidden', textOverflow: 'ellipsis' }}
                  title={m.name}>
                  {m.name.length > 6 ? m.name.slice(0, 6) + '…' : m.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 && (
              <tr><td colSpan={3 + meets.length} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>No athletes</td></tr>
            )}
            {sorted.map(a => {
              const isConfirmed = a.meets_attended >= threshold
              const isAtRisk    = !isConfirmed && a.meets_attended >= threshold - 1
              return (
                <tr key={a.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{a.last_name}, {a.first_name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{a.team || '—'}</div>
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: 700, fontSize: 15 }}>
                    {a.meets_attended}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {isConfirmed
                      ? <span className="badge badge-green" style={{ fontSize: 10 }}><CheckCircle size={10} style={{ marginRight: 3 }} />Confirmed</span>
                      : isAtRisk
                        ? <span className="badge badge-gold" style={{ fontSize: 10 }}><AlertTriangle size={10} style={{ marginRight: 3 }} />At Risk</span>
                        : <span className="badge" style={{ fontSize: 10, background: 'rgba(239,68,68,.12)', color: 'var(--red)', border: '1px solid rgba(239,68,68,.2)' }}>
                            <X size={10} style={{ marginRight: 3 }} />Missing
                          </span>
                    }
                  </td>
                  {meets.map(m => {
                    const attended = (a.attended_meet_ids ?? []).includes(m.id)
                    return (
                      <td key={m.id} style={{ textAlign: 'center' }}>
                        {attended
                          ? <Check size={13} style={{ color: '#22c55e' }} />
                          : <span style={{ color: 'var(--border)', fontSize: 11 }}>—</span>
                        }
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Meet Attendance View ─────────────────────────────────────
function MeetAttendanceView({ meet }) {
  const [athletes, setAthletes] = useState([])
  const [loading, setLoading]   = useState(false)
  const [syncing, setSyncing]   = useState(false)
  const [search, setSearch]     = useState('')

  const load = useCallback(async () => {
    if (!meet?.id || !api) return
    setLoading(true)
    try {
      const res = await api.attendanceGetForMeet(meet.id)
      setAthletes(res ?? [])
    } finally {
      setLoading(false)
    }
  }, [meet?.id])

  useEffect(() => { load() }, [load])

  const handleSync = async () => {
    if (!meet?.id || !api) return
    setSyncing(true)
    try {
      await api.attendanceSyncFromEntries(meet.id)
      await load()
    } finally {
      setSyncing(false)
    }
  }

  const handleToggle = async (athleteId, present) => {
    if (!api) return
    const newPresent = present ? 0 : 1
    await api.attendanceSet({ athleteId, meetId: meet.id, present: newPresent, notes: '' })
    setAthletes(prev => prev.map(a =>
      a.id === athleteId
        ? { ...a, present: newPresent, is_override: 1 }
        : a
    ))
  }

  const handleClearOverride = async (athleteId) => {
    if (!api) return
    await api.attendanceClearOverride({ athleteId, meetId: meet.id })
    await load()
  }

  const filtered = athletes.filter(a => {
    const q = search.toLowerCase()
    return !q || `${a.first_name} ${a.last_name}`.toLowerCase().includes(q)
  })

  const presentCount = athletes.filter(a => a.present).length

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <input className="input" placeholder="Search athletes…" value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: 220, fontSize: 13 }} />
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {presentCount} / {athletes.length} present
          </span>
          <button className="btn btn-ghost" style={{ fontSize: 12, gap: 5 }}
            onClick={handleSync} disabled={syncing}>
            <RefreshCw size={13} className={syncing ? 'spin' : ''} />
            {syncing ? 'Syncing…' : 'Sync from Entries'}
          </button>
        </div>
      </div>

      {loading
        ? <div className="empty-state" style={{ padding: 40 }}>Loading…</div>
        : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Athlete</th>
                  <th style={{ width: 90 }}>Age Group</th>
                  <th style={{ textAlign: 'center', width: 90 }}>Present</th>
                  <th style={{ width: 80 }}>Source</th>
                  <th style={{ width: 80 }}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>
                    No athletes — click "Sync from Entries" to auto-populate from event entries
                  </td></tr>
                )}
                {filtered.map(a => (
                  <tr key={a.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{a.last_name}, {a.first_name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{a.team || '—'}</div>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{getAgeGroup(a.age)}</td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        className={`btn btn-icon${a.present ? '' : ' btn-ghost'}`}
                        style={{
                          width: 30, height: 30,
                          background: a.present ? 'rgba(34,197,94,.15)' : undefined,
                          border: a.present ? '1px solid rgba(34,197,94,.3)' : undefined,
                          color: a.present ? '#22c55e' : 'var(--text-muted)',
                        }}
                        onClick={() => handleToggle(a.id, !!a.present)}
                        title={a.present ? 'Mark absent' : 'Mark present'}
                      >
                        <Check size={14} />
                      </button>
                    </td>
                    <td style={{ fontSize: 11 }}>
                      {a.is_override
                        ? <span className="badge badge-gold" style={{ fontSize: 10 }}>Manual</span>
                        : a.present
                          ? <span className="badge badge-neutral" style={{ fontSize: 10 }}>Entry</span>
                          : <span style={{ color: 'var(--text-muted)' }}>—</span>
                      }
                    </td>
                    <td>
                      {a.is_override && (
                        <button className="btn btn-ghost" style={{ fontSize: 11, padding: '2px 8px' }}
                          onClick={() => handleClearOverride(a.id)}
                          title="Revert to entry-derived attendance">
                          Revert
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      }
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────
export default function AttendancePage() {
  const { attendanceThreshold } = useSettings()
  const threshold = attendanceThreshold ?? 3

  const [seasons, setSeasons]         = useState([])
  const [meets, setMeets]             = useState([])
  const [selectedSeason, setSeason]   = useState(null)
  const [selectedMeet, setMeet]       = useState(null)
  const [view, setView]               = useState('meet')  // 'meet' | 'summary'
  const [loadingSeasons, setLoadingSeasons] = useState(true)

  useEffect(() => {
    if (!api) { setLoadingSeasons(false); return }
    Promise.all([api.getSeasons(), api.getMeets()])
      .then(([s, m]) => {
        setSeasons(s ?? [])
        setMeets(m ?? [])
        const active = s?.find(x => x.active)
        if (active) setSeason(active)
      })
      .catch(() => {})
      .finally(() => setLoadingSeasons(false))
  }, [])

  const seasonMeets = selectedSeason
    ? meets.filter(m => m.season_id === selectedSeason.id && m.status !== 'cancelled')
    : []

  // Auto-select first meet when season changes
  useEffect(() => {
    if (seasonMeets.length > 0 && !selectedMeet) {
      setMeet(seasonMeets[0])
    }
    if (selectedSeason && seasonMeets.length === 0) setMeet(null)
  }, [selectedSeason?.id])

  if (loadingSeasons) {
    return <div className="page-container"><div className="empty-state" style={{ padding: 80 }}>Loading…</div></div>
  }

  if (!api) {
    return (
      <div className="page-container">
        <div className="empty-state" style={{ padding: 80 }}>
          <Users size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
          <div>Attendance tracking requires the desktop app.</div>
        </div>
      </div>
    )
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <ClipboardList size={22} style={{ marginRight: 8, verticalAlign: 'text-bottom', color: 'var(--accent)' }} />
            Attendance
          </h1>
          <p className="page-subtitle">
            Track which athletes attended each meet. {threshold} meet{threshold !== 1 ? 's' : ''} required to confirm a season.
          </p>
        </div>
      </div>

      {/* Season + view selector */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Season</label>
          <div style={{ position: 'relative' }}>
            <select
              className="input"
              style={{ paddingRight: 28, fontSize: 13, minWidth: 180 }}
              value={selectedSeason?.id ?? ''}
              onChange={e => {
                const s = seasons.find(x => x.id === Number(e.target.value))
                setSeason(s ?? null)
                setMeet(null)
              }}
            >
              <option value="">— Select season —</option>
              {seasons.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name}{s.active ? ' (Active)' : ''}
                </option>
              ))}
            </select>
            <ChevronDown size={13} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 4 }}>
          <button
            className={`btn ${view === 'meet' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ fontSize: 12 }}
            onClick={() => setView('meet')}
          >By Meet</button>
          <button
            className={`btn ${view === 'summary' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ fontSize: 12 }}
            onClick={() => setView('summary')}
          >Season Summary</button>
        </div>
      </div>

      {!selectedSeason && (
        <div className="empty-state" style={{ padding: 60 }}>
          <ClipboardList size={36} style={{ marginBottom: 12, opacity: 0.3 }} />
          <div>Select a season to view attendance.</div>
        </div>
      )}

      {selectedSeason && view === 'summary' && (
        <SeasonSummary seasonId={selectedSeason.id} threshold={threshold} />
      )}

      {selectedSeason && view === 'meet' && (
        <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 16, alignItems: 'start' }}>
          {/* Meet list */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)',
              fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Meets
            </div>
            {seasonMeets.length === 0 && (
              <div style={{ padding: 20, color: 'var(--text-muted)', fontSize: 12, textAlign: 'center' }}>
                No meets in this season
              </div>
            )}
            {seasonMeets.map(m => (
              <button
                key={m.id}
                onClick={() => setMeet(m)}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '10px 14px', border: 'none', cursor: 'pointer',
                  background: selectedMeet?.id === m.id ? 'var(--bg-tertiary)' : 'transparent',
                  borderLeft: selectedMeet?.id === m.id ? '3px solid var(--accent)' : '3px solid transparent',
                  color: 'var(--text-primary)',
                }}
              >
                <div style={{ fontWeight: 600, fontSize: 13 }}>{m.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                  {m.date ? new Date(m.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                </div>
              </button>
            ))}
          </div>

          {/* Attendance detail */}
          <div className="card" style={{ padding: 20 }}>
            {!selectedMeet
              ? <div className="empty-state" style={{ padding: 40 }}>Select a meet</div>
              : (
                <>
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700 }}>
                      {selectedMeet.name}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                      {selectedMeet.date
                        ? new Date(selectedMeet.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
                        : 'No date set'
                      }
                    </div>
                  </div>
                  <MeetAttendanceView meet={selectedMeet} />
                </>
              )
            }
          </div>
        </div>
      )}
    </div>
  )
}
