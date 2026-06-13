import React, { useEffect, useState } from 'react'
import { LogOut, Calendar, Trophy, MapPin, Clock, ChevronDown, ChevronRight, Star } from 'lucide-react'
import AppLogo from '../components/AppLogo.jsx'
import { useAuth } from '../AuthContext.jsx'
import { useSettings } from '../SettingsContext.jsx'

const api = window.electronAPI

function ordinal(n) {
  if (!n) return '—'
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function formatDateShort(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatTime(t) {
  if (!t) return null
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`
}

const MEET_TYPE_LABELS = {
  home: 'Home',
  away: 'Away',
  invitational: 'Invitational',
  dual: 'Dual Meet',
  championship: 'Championship',
}

const STATUS_COLORS = {
  upcoming: '#38bdf8',
  active: '#22c55e',
  completed: '#a3a3a3',
}

const PLACE_COLORS = {
  1: '#f59e0b',
  2: '#94a3b8',
  3: '#b45309',
}

function PlaceBadge({ place }) {
  const color = PLACE_COLORS[place] || 'var(--text-muted)'
  return (
    <span style={{
      fontFamily: 'var(--font-display)', fontWeight: 700,
      fontSize: 11, letterSpacing: '0.06em',
      color, minWidth: 32, flexShrink: 0,
    }}>
      {ordinal(place)}
    </span>
  )
}

function ScheduleSection({ items, loading }) {
  if (loading) return <SectionSkeleton />
  if (!items.length) {
    return (
      <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)', fontSize: 13 }}>
        No upcoming events scheduled.
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {items.map((item, i) => (
        <ScheduleItem key={`${item.item_type}-${item.id}-${i}`} item={item} />
      ))}
    </div>
  )
}

function ScheduleItem({ item }) {
  const isMeet = item.item_type === 'meet'
  const startTime = formatTime(item.start_time)
  const endTime = formatTime(item.end_time)

  return (
    <div style={{
      display: 'flex', gap: 14, padding: '10px 12px',
      borderRadius: 8, background: 'rgba(255,255,255,0.03)',
      borderLeft: `3px solid ${isMeet ? 'var(--accent)' : 'rgba(255,255,255,0.15)'}`,
    }}>
      <div style={{
        flexShrink: 0, width: 48, textAlign: 'center',
        fontFamily: 'var(--font-display)', letterSpacing: '0.04em',
      }}>
        <div style={{ fontSize: 18, fontWeight: 700, lineHeight: 1 }}>
          {new Date(item.date + 'T00:00:00').getDate()}
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
          {new Date(item.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short' })}
        </div>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 14, lineHeight: 1.3 }}>{item.title}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 10px', marginTop: 4, alignItems: 'center' }}>
          {item.location && (
            <span style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 3 }}>
              <MapPin size={11} />
              {item.location}
            </span>
          )}
          {(startTime || endTime) && (
            <span style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 3 }}>
              <Clock size={11} />
              {startTime}{endTime ? ` – ${endTime}` : ''}
            </span>
          )}
          {isMeet && item.type && (
            <span style={{
              fontSize: 10, fontFamily: 'var(--font-display)', letterSpacing: '0.05em',
              padding: '1px 6px', borderRadius: 3,
              background: 'rgba(56,189,248,0.12)', color: 'var(--accent)',
              textTransform: 'uppercase',
            }}>
              {MEET_TYPE_LABELS[item.type] || item.type}
            </span>
          )}
          {!isMeet && (
            <span style={{
              fontSize: 10, fontFamily: 'var(--font-display)', letterSpacing: '0.05em',
              padding: '1px 6px', borderRadius: 3,
              background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)',
              textTransform: 'uppercase',
            }}>
              Practice
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

function ResultsSection({ meets, loading }) {
  const [expanded, setExpanded] = useState({})

  useEffect(() => {
    if (meets.length > 0) {
      setExpanded({ [meets[0].id]: true })
    }
  }, [meets])

  if (loading) return <SectionSkeleton />
  if (!meets.length) {
    return (
      <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)', fontSize: 13 }}>
        No completed meet results yet.
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {meets.map(meet => (
        <MeetResultCard
          key={meet.id}
          meet={meet}
          open={!!expanded[meet.id]}
          onToggle={() => setExpanded(prev => ({ ...prev, [meet.id]: !prev[meet.id] }))}
        />
      ))}
    </div>
  )
}

function MeetResultCard({ meet, open, onToggle }) {
  const hasResults = meet.events?.some(e => e.results?.length > 0)

  return (
    <div style={{
      borderRadius: 8, overflow: 'hidden',
      border: '1px solid var(--border)',
      background: open ? 'rgba(255,255,255,0.02)' : 'transparent',
    }}>
      <button
        onClick={onToggle}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 14px', background: 'none', border: 'none',
          cursor: hasResults ? 'pointer' : 'default', textAlign: 'left',
          color: 'var(--text-primary)',
        }}
      >
        {hasResults
          ? (open ? <ChevronDown size={15} style={{ flexShrink: 0, color: 'var(--accent)' }} />
                  : <ChevronRight size={15} style={{ flexShrink: 0, color: 'var(--text-muted)' }} />)
          : <span style={{ width: 15, flexShrink: 0 }} />
        }
        <div style={{
          flexShrink: 0, fontFamily: 'var(--font-display)',
          letterSpacing: '0.04em', textAlign: 'center', lineHeight: 1.1, minWidth: 36,
        }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>
            {new Date(meet.date + 'T00:00:00').getDate()}
          </div>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            {new Date(meet.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short' })}
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{meet.name}</div>
          {meet.location && (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>
              {meet.location}
            </div>
          )}
        </div>
        {!hasResults && (
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>No results</span>
        )}
        {hasResults && (
          <span style={{
            fontSize: 10, fontFamily: 'var(--font-display)', letterSpacing: '0.05em',
            padding: '2px 7px', borderRadius: 3,
            background: 'rgba(56,189,248,0.1)', color: 'var(--accent)',
          }}>
            {meet.events.filter(e => e.results?.length).length} events
          </span>
        )}
      </button>

      {open && hasResults && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '8px 0 12px' }}>
          {meet.events.filter(e => e.results?.length > 0).map(ev => (
            <EventResults key={ev.id} ev={ev} />
          ))}
        </div>
      )}
    </div>
  )
}

function EventResults({ ev }) {
  const genderLabel = ev.gender === 'M' ? 'Boys' : ev.gender === 'F' ? 'Girls' : 'Mixed'
  const label = `${genderLabel} ${ev.event_name}${ev.age_group ? ` · ${ev.age_group}` : ''}`

  return (
    <div style={{ padding: '8px 14px 0' }}>
      <div style={{
        fontSize: 11, fontFamily: 'var(--font-display)', letterSpacing: '0.05em',
        color: 'var(--text-secondary)', textTransform: 'uppercase',
        marginBottom: 4, paddingBottom: 4,
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        {label}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {ev.results.map((r, i) => (
          <ResultRow key={i} r={r} />
        ))}
      </div>
    </div>
  )
}

function ResultRow({ r }) {
  const name = r.last_name && r.first_name
    ? `${r.last_name}, ${r.first_name}`
    : r.last_name || r.first_name || '—'

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '3px 0', fontSize: 13,
      borderBottom: '1px solid rgba(255,255,255,0.03)',
    }}>
      <PlaceBadge place={r.place} />
      <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {name}
      </span>
      {r.team && (
        <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>{r.team}</span>
      )}
      {r.mark && (
        <span style={{
          fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13,
          color: 'var(--text-primary)', flexShrink: 0,
        }}>
          {r.mark}
        </span>
      )}
      {r.is_pr ? <Star size={12} style={{ color: '#f59e0b', flexShrink: 0 }} fill="#f59e0b" /> : null}
    </div>
  )
}

function SectionSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {[1, 2, 3].map(i => (
        <div key={i} style={{
          height: 54, borderRadius: 8,
          background: 'rgba(255,255,255,0.04)', animation: 'pulse 1.5s ease-in-out infinite',
          opacity: 1 - i * 0.2,
        }} />
      ))}
    </div>
  )
}

export default function ParentPortal() {
  const { user, logout } = useAuth()
  const { homeTeam } = useSettings()

  const [schedule, setSchedule] = useState([])
  const [results, setResults] = useState([])
  const [scheduleLoading, setScheduleLoading] = useState(true)
  const [resultsLoading, setResultsLoading] = useState(true)

  useEffect(() => {
    if (!api) return
    api.getUpcomingSchedule()
      .then(setSchedule)
      .catch(() => setSchedule([]))
      .finally(() => setScheduleLoading(false))

    api.getMeetResults()
      .then(setResults)
      .catch(() => setResults([]))
      .finally(() => setResultsLoading(false))
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{
        height: 56, borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', padding: '0 24px', gap: 12,
        flexShrink: 0,
      }}>
        <AppLogo size={20} />
        <span style={{
          fontFamily: 'var(--font-display)', fontWeight: 700,
          fontSize: 16, letterSpacing: '0.06em',
        }}>
          {homeTeam.toUpperCase()}
        </span>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 4 }}>Parent Portal</span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            {user?.display_name || user?.username}
          </span>
          <button className="btn btn-ghost" style={{ fontSize: 12, gap: 6 }} onClick={logout}>
            <LogOut size={13} /> Sign Out
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, padding: '24px', maxWidth: 1100, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 24, alignItems: 'start' }}>

          {/* Schedule */}
          <div>
            <SectionHeader icon={<Calendar size={15} />} title="Upcoming Schedule" />
            <ScheduleSection items={schedule} loading={scheduleLoading} />
          </div>

          {/* Results */}
          <div>
            <SectionHeader icon={<Trophy size={15} />} title="Meet Results" />
            <ResultsSection meets={results} loading={resultsLoading} />
          </div>

        </div>
      </div>
    </div>
  )
}

function SectionHeader({ icon, title }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      marginBottom: 12, paddingBottom: 8,
      borderBottom: '1px solid var(--border)',
    }}>
      <span style={{ color: 'var(--accent)' }}>{icon}</span>
      <span style={{
        fontFamily: 'var(--font-display)', fontWeight: 700,
        fontSize: 13, letterSpacing: '0.08em', textTransform: 'uppercase',
        color: 'var(--text-primary)',
      }}>
        {title}
      </span>
    </div>
  )
}
