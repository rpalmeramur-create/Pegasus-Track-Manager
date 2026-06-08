import React, { useEffect, useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Plus, X, MapPin, Clock, Copy } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const api = window.electronAPI ?? {
  getMeets:       () => Promise.resolve([]),
  getPractices:   () => Promise.resolve([]),
  createPractice: (d) => Promise.resolve({ id: Date.now(), ...d, created_at: new Date().toISOString() }),
  deletePractice: () => Promise.resolve({ success: true }),
}

const DAYS   = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December']

// Color config for every item type shown on the calendar
const TYPE_CFG = {
  meet:          { label: 'Meet',         color: 'var(--accent)',  border: 'rgba(56,189,248,.25)',  bg: 'var(--accent-glow)'  },
  practice:      { label: 'Practice',     color: 'var(--green)',   border: 'rgba(16,185,129,.25)',  bg: 'var(--green-glow)'   },
  makeup:        { label: 'Makeup Day',   color: 'var(--gold)',    border: 'rgba(245,158,11,.25)',  bg: 'var(--gold-glow)'    },
  special_event: { label: 'Special Meet', color: 'var(--purple)',  border: 'rgba(168,85,247,.25)',  bg: 'var(--purple-glow)'  },
}

const ADD_TYPE_OPTIONS = [
  { value: 'practice',      label: 'Practice',     placeholder: 'Afternoon Practice' },
  { value: 'makeup',        label: 'Makeup Day',   placeholder: 'Rain Makeup — City Invitational' },
  { value: 'special_event', label: 'Special Meet', placeholder: 'Run-a-thon' },
]

function buildCells(year, month) {
  const firstWeekday = new Date(year, month, 1).getDay()
  const daysInMonth  = new Date(year, month + 1, 0).getDate()
  const prevYear     = month === 0 ? year - 1 : year
  const prevMonth    = month === 0 ? 11      : month - 1
  const daysInPrev   = new Date(prevYear, prevMonth + 1, 0).getDate()
  const nextYear     = month === 11 ? year + 1 : year
  const nextMonth    = month === 11 ? 0        : month + 1

  const cells = []
  for (let i = firstWeekday - 1; i >= 0; i--) {
    const d = daysInPrev - i
    cells.push({ dateKey: fmt(prevYear, prevMonth + 1, d), day: d, current: false })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ dateKey: fmt(year, month + 1, d), day: d, current: true })
  }
  let nd = 1
  while (cells.length < 42) {
    cells.push({ dateKey: fmt(nextYear, nextMonth + 1, nd), day: nd, current: false })
    nd++
  }
  return cells
}

function fmt(y, m, d) {
  return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`
}

function fmtTime(t) {
  if (!t) return ''
  const [h, m] = t.split(':')
  const hr = parseInt(h)
  return `${hr % 12 || 12}:${m} ${hr < 12 ? 'AM' : 'PM'}`
}

// ─── Add Event Modal ───────────────────────────────────────────
function AddEventModal({ defaultDate, defaultType, onSave, onClose }) {
  const [form, setForm] = useState({
    type: defaultType || 'practice',
    title: '', date: defaultDate || '',
    start_time: '', end_time: '', location: '', notes: '',
  })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const typeOpt = ADD_TYPE_OPTIONS.find(t => t.value === form.type) ?? ADD_TYPE_OPTIONS[0]
  const cfg     = TYPE_CFG[form.type]

  const handleSave = async () => {
    if (!form.title.trim() || !form.date) return
    setSaving(true)
    await onSave(form)
    setSaving(false)
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">Add Event</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={15} /></button>
        </div>

        {/* Type selector */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
          {ADD_TYPE_OPTIONS.map(t => {
            const active = form.type === t.value
            const tcfg   = TYPE_CFG[t.value]
            return (
              <button
                key={t.value}
                type="button"
                style={{
                  padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 500,
                  cursor: 'pointer', transition: 'all 0.12s',
                  border: `1px solid ${active ? tcfg.border : 'var(--border)'}`,
                  background: active ? tcfg.bg : 'transparent',
                  color: active ? tcfg.color : 'var(--text-muted)',
                }}
                onClick={() => set('type', t.value)}
              >
                {t.label}
              </button>
            )
          })}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group">
            <label className="form-label">Title <span style={{ color: 'var(--red)' }}>*</span></label>
            <input className="input" value={form.title} onChange={e => set('title', e.target.value)}
              placeholder={typeOpt.placeholder} autoFocus />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Date <span style={{ color: 'var(--red)' }}>*</span></label>
              <input className="input" type="date" value={form.date} onChange={e => set('date', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Start</label>
              <input className="input" type="time" value={form.start_time} onChange={e => set('start_time', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">End</label>
              <input className="input" type="time" value={form.end_time} onChange={e => set('end_time', e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Location</label>
            <input className="input" value={form.location} onChange={e => set('location', e.target.value)}
              placeholder="Field, gym, track..." />
          </div>
          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea className="input" value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} />
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            style={{ background: cfg.color, borderColor: cfg.color }}
            onClick={handleSave}
            disabled={saving || !form.title.trim() || !form.date}
          >
            {saving ? 'Saving…' : `Add ${typeOpt.label}`}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Duplicate Event Modal ─────────────────────────────────────
function DuplicateEventModal({ event, onSave, onClose }) {
  const [date, setDate] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!date) return
    setSaving(true)
    await onSave(date)
    setSaving(false)
  }

  const cfg = TYPE_CFG[event.type || 'practice'] ?? TYPE_CFG.practice

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 380 }}>
        <div className="modal-header">
          <div className="modal-title">Duplicate {cfg.label}</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={15} /></button>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.6 }}>
          Copy <strong style={{ color: 'var(--text-primary)' }}>{event.title}</strong> to a new date.
          All details will be carried over.
        </p>
        <div className="form-group">
          <label className="form-label">New Date <span style={{ color: 'var(--red)' }}>*</span></label>
          <input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} autoFocus />
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving || !date}>
            {saving ? 'Duplicating…' : 'Duplicate'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Day Detail Modal ──────────────────────────────────────────
function DayModal({ dateKey, events, onClose, onDeleteEvent, onDuplicate, navigate }) {
  const d     = new Date(dateKey + 'T00:00:00')
  const label = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 400 }}>
        <div className="modal-header">
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700 }}>{label}</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={15} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {events.map((ev, i) => {
            const cfg = TYPE_CFG[ev.item_type] ?? TYPE_CFG.practice
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
                padding: '10px 12px', borderRadius: 8,
                background: cfg.bg,
                border: `1px solid ${cfg.border}`,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: cfg.color, marginBottom: 3 }}>
                    {ev.item_type === 'meet' ? ev.name : ev.title}
                  </div>
                  {ev.location && (
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                      <MapPin size={11} /> {ev.location}
                    </div>
                  )}
                  {ev.start_time && (
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={11} /> {fmtTime(ev.start_time)}{ev.end_time ? ` – ${fmtTime(ev.end_time)}` : ''}
                    </div>
                  )}
                  {/* Type badge */}
                  <div style={{ marginTop: 4, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {ev.item_type === 'meet' && (
                      <>
                        {ev.type && <span className="badge badge-blue" style={{ fontSize: 10, textTransform: 'capitalize' }}>{ev.type}</span>}
                        {ev.status && ev.status !== 'upcoming' && (
                          <span className="badge badge-neutral" style={{ fontSize: 10, textTransform: 'capitalize' }}>{ev.status}</span>
                        )}
                      </>
                    )}
                    {(ev.item_type === 'makeup' || ev.item_type === 'special_event') && (
                      <span style={{
                        fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase',
                        padding: '2px 7px', borderRadius: 4,
                        background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
                      }}>
                        {cfg.label}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ marginLeft: 10, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                  {ev.item_type === 'meet' ? (
                    <button className="btn btn-ghost" style={{ fontSize: 11, padding: '4px 10px' }}
                      onClick={() => { onClose(); navigate('/meets') }}>
                      View
                    </button>
                  ) : (
                    <>
                      <button className="btn btn-ghost btn-icon" style={{ padding: '5px 6px' }}
                        title="Duplicate to another date"
                        onClick={() => onDuplicate(ev)}>
                        <Copy size={13} />
                      </button>
                      <button className="btn btn-danger btn-icon" style={{ padding: '5px 6px' }}
                        onClick={() => onDeleteEvent(ev.id)}>
                        <X size={12} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Calendar Page ─────────────────────────────────────────────
export default function CalendarPage() {
  const navigate = useNavigate()
  const today    = new Date()
  const todayKey = fmt(today.getFullYear(), today.getMonth() + 1, today.getDate())

  const [year, setYear]           = useState(today.getFullYear())
  const [month, setMonth]         = useState(today.getMonth())
  const [meets, setMeets]         = useState([])
  const [practices, setPractices] = useState([])
  const [loading, setLoading]     = useState(true)
  const [showAdd, setShowAdd]         = useState(false)
  const [addDate, setAddDate]         = useState('')
  const [addType, setAddType]         = useState('practice')
  const [viewing, setViewing]         = useState(null)
  const [duplicating, setDuplicating] = useState(null)

  useEffect(() => {
    Promise.all([api.getMeets(), api.getPractices()])
      .then(([m, p]) => { setMeets(m); setPractices(p); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }

  const eventMap = useMemo(() => {
    const map = {}
    for (const m of meets) {
      const k = m.date?.slice(0, 10)
      if (!k) continue
      if (!map[k]) map[k] = []
      map[k].push({ ...m, item_type: 'meet' })
    }
    for (const p of practices) {
      const k = p.date?.slice(0, 10)
      if (!k) continue
      if (!map[k]) map[k] = []
      map[k].push({ ...p, item_type: p.type || 'practice' })
    }
    return map
  }, [meets, practices])

  const cells = useMemo(() => buildCells(year, month), [year, month])

  const handleAddEvent = async (form) => {
    try {
      const p = await api.createPractice(form)
      if (!p) throw new Error('No data returned')
      setPractices(prev => [...prev, p])
      setShowAdd(false)
    } catch (err) {
      alert(`Failed to save event: ${err.message}\n\nIf this keeps happening, restart the app.`)
    }
  }

  const handleDeleteEvent = async (id) => {
    await api.deletePractice(id)
    setPractices(prev => prev.filter(p => p.id !== id))
    setViewing(null)
  }

  const handleDuplicateEvent = async (newDate) => {
    const { id, created_at, item_type, ...rest } = duplicating
    const p = await api.createPractice({ ...rest, date: newDate })
    setPractices(prev => [...prev, p])
    setDuplicating(null)
  }

  const viewingEvents = viewing ? (eventMap[viewing] || []) : []

  const thisMonthKey   = `${year}-${String(month + 1).padStart(2,'0')}`
  const thisMonthCount = Object.entries(eventMap)
    .filter(([k]) => k.startsWith(thisMonthKey))
    .reduce((sum, [, evs]) => sum + evs.length, 0)

  return (
    <div className="calendar-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="page-title">CALENDAR</div>
          <div className="page-subtitle">
            {loading ? 'Loading…' : `${thisMonthCount} event${thisMonthCount !== 1 ? 's' : ''} in ${MONTHS[month]}`}
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => { setAddDate(''); setAddType('practice'); setShowAdd(true) }}>
          <Plus size={15} /> Add Event
        </button>
      </div>

      {/* Month navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 32px', marginBottom: 20 }}>
        <button className="btn btn-ghost btn-icon" onClick={prevMonth}><ChevronLeft size={16} /></button>
        <div style={{
          fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700,
          letterSpacing: '0.04em', minWidth: 230, textAlign: 'center',
        }}>
          {MONTHS[month]} {year}
        </div>
        <button className="btn btn-ghost btn-icon" onClick={nextMonth}><ChevronRight size={16} /></button>
        <button className="btn btn-ghost" style={{ fontSize: 12, marginLeft: 4 }}
          onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth()) }}>
          Today
        </button>
      </div>

      {loading ? (
        <div className="loading-container"><div className="loading-spinner" /></div>
      ) : (
        <div style={{ padding: '0 32px' }}>
          <div className="calendar-grid-wrap">
            {/* Day-of-week headers */}
            <div className="calendar-dow-row">
              {DAYS.map(d => (
                <div key={d} className="calendar-dow-cell">{d}</div>
              ))}
            </div>

            {/* Cells */}
            <div className="calendar-cells">
              {cells.map(cell => {
                const events  = eventMap[cell.dateKey] || []
                const isToday = cell.dateKey === todayKey
                const visible = events.slice(0, 3)
                const extra   = events.length - 3

                return (
                  <div
                    key={cell.dateKey}
                    className={[
                      'calendar-cell',
                      !cell.current  ? 'other-month' : '',
                      isToday        ? 'is-today'    : '',
                      events.length  ? 'has-events'  : '',
                    ].filter(Boolean).join(' ')}
                    onClick={() => events.length && setViewing(cell.dateKey)}
                  >
                    <div className="calendar-day-num">
                      {isToday
                        ? <span className="calendar-today-bubble">{cell.day}</span>
                        : cell.day}
                    </div>
                    {visible.map((ev, i) => (
                      <div key={i} className={`calendar-chip ${ev.item_type}`}>
                        {ev.item_type === 'meet' ? ev.name : ev.title}
                      </div>
                    ))}
                    {extra > 0 && (
                      <div className="calendar-overflow">+{extra} more</div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 12, paddingLeft: 2, flexWrap: 'wrap' }}>
            {Object.entries(TYPE_CFG).map(([key, cfg]) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: cfg.color }} />
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{cfg.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {showAdd && (
        <AddEventModal
          defaultDate={addDate}
          defaultType={addType}
          onSave={handleAddEvent}
          onClose={() => setShowAdd(false)}
        />
      )}

      {viewing && viewingEvents.length > 0 && (
        <DayModal
          dateKey={viewing}
          events={viewingEvents}
          onClose={() => setViewing(null)}
          onDeleteEvent={handleDeleteEvent}
          onDuplicate={ev => { setViewing(null); setDuplicating(ev) }}
          navigate={navigate}
        />
      )}

      {duplicating && (
        <DuplicateEventModal
          event={duplicating}
          onSave={handleDuplicateEvent}
          onClose={() => setDuplicating(null)}
        />
      )}
    </div>
  )
}
