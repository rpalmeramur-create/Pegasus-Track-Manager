import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { athleteApi, athletes as _mockAthletes } from '../mockStore.js'
import {
  Calendar, Plus, X, Edit2, Trash2, ChevronLeft,
  Users, List, Trophy, Clock, MapPin, Play, CheckCircle,
  Zap, Search, Star, Shuffle, RefreshCw, AlertTriangle,
} from 'lucide-react'

// ─── Static event catalogue (mirrors DB seed; used as fallback) ───
const STATIC_TF_EVENTS = [
  { id:1,  name:'50 Meter Dash',        abbreviation:'50m',      category:'track',    sort_order:1  },
  { id:5,  name:'100 Meter Dash',       abbreviation:'100m',     category:'track',    sort_order:5  },
  { id:6,  name:'200 Meter Dash',       abbreviation:'200m',     category:'track',    sort_order:6  },
  { id:7,  name:'400 Meter Dash',       abbreviation:'400m',     category:'track',    sort_order:7  },
  { id:8,  name:'800 Meter Run',        abbreviation:'800m',     category:'track',    sort_order:8  },
  { id:9,  name:'1500 Meter Run',       abbreviation:'1500m',    category:'track',    sort_order:9  },
  { id:10, name:'1600 Meter Run',       abbreviation:'1600m',    category:'track',    sort_order:10 },
  { id:11, name:'Mile Run',             abbreviation:'1 Mile',   category:'track',    sort_order:11 },
  { id:12, name:'3000 Meter Run',       abbreviation:'3000m',    category:'track',    sort_order:12 },
  { id:13, name:'3200 Meter Run',       abbreviation:'3200m',    category:'track',    sort_order:13 },
  { id:14, name:'2 Mile Run',           abbreviation:'2 Mile',   category:'track',    sort_order:14 },
  { id:15, name:'5000 Meter Run',       abbreviation:'5000m',    category:'track',    sort_order:15 },
  { id:16, name:'10000 Meter Run',      abbreviation:'10000m',   category:'track',    sort_order:16 },
  { id:20, name:'60 Meter Hurdles',     abbreviation:'60mH',     category:'track',    sort_order:20 },
  { id:21, name:'80 Meter Hurdles',     abbreviation:'80mH',     category:'track',    sort_order:21 },
  { id:22, name:'100 Meter Hurdles',    abbreviation:'100mH',    category:'track',    sort_order:22 },
  { id:23, name:'110 Meter Hurdles',    abbreviation:'110mH',    category:'track',    sort_order:23 },
  { id:24, name:'300 Meter Hurdles',    abbreviation:'300mH',    category:'track',    sort_order:24 },
  { id:25, name:'400 Meter Hurdles',    abbreviation:'400mH',    category:'track',    sort_order:25 },
  { id:30, name:'2000m Steeplechase',   abbreviation:'2000mSC',  category:'track',    sort_order:30 },
  { id:31, name:'3000m Steeplechase',   abbreviation:'3000mSC',  category:'track',    sort_order:31 },
  { id:40, name:'4 x 100 Meter Relay',  abbreviation:'4x100m',   category:'relay',    sort_order:40 },
  { id:41, name:'4 x 200 Meter Relay',  abbreviation:'4x200m',   category:'relay',    sort_order:41 },
  { id:42, name:'4 x 400 Meter Relay',  abbreviation:'4x400m',   category:'relay',    sort_order:42 },
  { id:43, name:'4 x 800 Meter Relay',  abbreviation:'4x800m',   category:'relay',    sort_order:43 },
  { id:44, name:'Sprint Medley Relay',  abbreviation:'SMR',      category:'relay',    sort_order:44 },
  { id:45, name:'Distance Medley Relay',abbreviation:'DMR',      category:'relay',    sort_order:45 },
  { id:50, name:'Long Jump',            abbreviation:'LJ',       category:'field',    sort_order:50 },
  { id:51, name:'Triple Jump',          abbreviation:'TJ',       category:'field',    sort_order:51 },
  { id:52, name:'High Jump',            abbreviation:'HJ',       category:'field',    sort_order:52 },
  { id:53, name:'Pole Vault',           abbreviation:'PV',       category:'field',    sort_order:53 },
  { id:60, name:'Shot Put',             abbreviation:'SP',       category:'field',    sort_order:60 },
  { id:61, name:'Discus',               abbreviation:'DT',       category:'field',    sort_order:61 },
  { id:62, name:'Hammer',               abbreviation:'HT',       category:'field',    sort_order:62 },
  { id:63, name:'Javelin',              abbreviation:'JT',       category:'field',    sort_order:63 },
  { id:64, name:'Turbo Javelin',        abbreviation:'Turbo JT', category:'field',    sort_order:64 },
  { id:65, name:'Softball Throw',       abbreviation:'SB',       category:'field',    sort_order:65 },
  { id:70, name:'Pentathlon',           abbreviation:'Pent',     category:'combined', sort_order:70 },
  { id:71, name:'Heptathlon',           abbreviation:'Hept',     category:'combined', sort_order:71 },
  { id:72, name:'Decathlon',            abbreviation:'Dec',      category:'combined', sort_order:72 },
]

// ─── In-memory store for browser-only (no Electron) usage ───
let _nextId = 1
const _db = { meets: [], meetEvents: [], entries: [], results: [], prs: {} }
const _id = () => _nextId++
const _now = () => new Date().toISOString().slice(0, 10)

function _parseMark(str, category) {
  if (!str) return null
  const s = String(str).trim()
  if (!s || s === 'F' || s === 'X' || s === 'P' || s === 'NH') return null
  const isField = category === 'field' || category === 'combined'
  if (isField) {
    if (s.includes('-')) { const [ft, inch] = s.split('-'); return parseFloat(ft) * 12 + parseFloat(inch || 0) }
    return parseFloat(s) || null
  }
  if (s.includes(':')) {
    const parts = s.split(':')
    return parts.length === 2
      ? parseFloat(parts[0]) * 60 + parseFloat(parts[1])
      : parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2])
  }
  return parseFloat(s) || null
}

function _bestAttempt(attemptsJson, category) {
  if (!attemptsJson) return null
  let arr; try { arr = JSON.parse(attemptsJson) } catch { return null }
  const isField = category === 'field' || category === 'combined'
  let best = null, bestVal = isField ? -Infinity : Infinity
  for (const a of arr) {
    const v = _parseMark(a, category)
    if (v === null) continue
    if (isField ? v > bestVal : v < bestVal) { bestVal = v; best = a }
  }
  return best
}

const FALLBACK = {
  getMeets: () => Promise.resolve(
    [..._db.meets].sort((a, b) => b.date.localeCompare(a.date))
  ),
  createMeet: (data) => {
    const m = { id: _id(), ...data, status: 'upcoming', event_count: 0, created_at: _now() }
    _db.meets.push(m)
    return Promise.resolve(m)
  },
  updateMeet: (id, data) => {
    const i = _db.meets.findIndex(m => m.id === id)
    if (i >= 0) _db.meets[i] = { ..._db.meets[i], ...data }
    return Promise.resolve(_db.meets[i] ?? {})
  },
  deleteMeet: (id) => {
    _db.meets = _db.meets.filter(m => m.id !== id)
    return Promise.resolve({ success: true })
  },
  getMeetDetail: (id) => {
    const meet = _db.meets.find(m => m.id === id)
    if (!meet) return Promise.resolve(null)
    const events = _db.meetEvents.filter(e => e.meet_id === id)
    return Promise.resolve({ ...meet, events })
  },
  addMeetEvent: (data) => {
    const tfEvent = STATIC_TF_EVENTS.find(e => e.id === data.tf_event_id) ?? {}
    const ev = {
      id: _id(), ...data, entry_count: 0,
      event_name: tfEvent.name, abbreviation: tfEvent.abbreviation,
      category: tfEvent.category, measurement_unit: 'time', is_relay: 0,
    }
    _db.meetEvents.push(ev)
    const meet = _db.meets.find(m => m.id === data.meet_id)
    if (meet) meet.event_count = _db.meetEvents.filter(e => e.meet_id === data.meet_id).length
    return Promise.resolve(ev)
  },
  removeMeetEvent: (id) => {
    _db.meetEvents = _db.meetEvents.filter(e => e.id !== id)
    return Promise.resolve({ success: true })
  },
  getMeetEventEntries: (meetEventId) => {
    const ev = _db.meetEvents.find(e => e.id === meetEventId)
    if (!ev) return Promise.resolve(null)
    const entries = _db.entries.filter(e => e.meet_event_id === meetEventId)
      .map(en => {
        const r       = _db.results.find(r => r.entry_id === en.id) ?? {}
        const athlete = _mockAthletes.find(a => a.id === en.athlete_id) ?? {}
        return {
          ...en, ...r,
          first_name:     athlete.first_name,
          last_name:      athlete.last_name,
          athlete_gender: athlete.gender,
          attempts_json:  r.attempts_json ?? null,
          is_pr:          r.is_pr ?? 0,
        }
      })
    return Promise.resolve({ ...ev, entries })
  },
  addEntry: (data) => {
    const athlete = _mockAthletes.find(a => a.id === data.athlete_id) ?? {}
    const en = {
      id: _id(), ...data, scratched: 0, attempts_json: null, is_pr: 0,
      first_name:     athlete.first_name,
      last_name:      athlete.last_name,
      athlete_gender: athlete.gender,
    }
    _db.entries.push(en)
    return Promise.resolve(en)
  },
  removeEntry: (id) => {
    _db.entries = _db.entries.filter(e => e.id !== id)
    return Promise.resolve({ success: true })
  },
  updateEntrySeed: (id, mark) => {
    const en = _db.entries.find(e => e.id === id)
    if (en) en.seed_mark = mark
    return Promise.resolve({ success: true })
  },
  scratchEntry: (id, scratched) => {
    const en = _db.entries.find(e => e.id === id)
    if (en) en.scratched = scratched ? 1 : 0
    return Promise.resolve({ success: true })
  },
  saveResult: (entryId, data) => {
    // Compute best attempt mark for field events
    const entry = _db.entries.find(e => e.id === entryId)
    const ev = entry ? _db.meetEvents.find(e => e.id === entry.meet_event_id) : null
    let markToSave = data.mark || null
    if (data.attempts_json && ev) {
      const best = _bestAttempt(data.attempts_json, ev.category)
      if (best) markToSave = best
    }
    // PR detection
    let isPr = 0
    if (ev && markToSave && !data.disqualified && !data.did_not_start && !data.did_not_finish && entry?.athlete_id) {
      const prKey = `${entry.athlete_id}_${ev.tf_event_id}`
      const isField = ev.category === 'field' || ev.category === 'combined'
      const newVal = _parseMark(markToSave, ev.category)
      const prVal  = _parseMark(_db.prs[prKey], ev.category)
      if (newVal !== null && (prVal === null || (isField ? newVal > prVal : newVal < prVal))) {
        isPr = 1
        _db.prs[prKey] = markToSave
      }
    }
    const row = { ...data, mark: markToSave, is_pr: isPr }
    const i = _db.results.findIndex(r => r.entry_id === entryId)
    if (i >= 0) _db.results[i] = { ..._db.results[i], ...row }
    else _db.results.push({ id: _id(), entry_id: entryId, ...row })
    return Promise.resolve({ success: true, is_pr: isPr })
  },
  autoRank:  () => Promise.resolve({ success: true }),
  seedEvent: () => Promise.resolve({ success: true }),
  getAthletes: athleteApi.getAthletes,
  getSeasons:  () => Promise.resolve([]),
  getTfEvents: () => Promise.resolve(STATIC_TF_EVENTS),
}

// ─── API shim — reads window.electronAPI lazily so Electron's
//     contextBridge has time to inject it before first call ──
const api = new Proxy({}, {
  get(_, key) {
    return (window.electronAPI?.[key] ?? FALLBACK[key])
  },
})

// ─── Sheet print helper ───────────────────────────────────
// Extracts .ps-* / .print-sheet CSS rules (no @media, no @font-face)
// then calls the Electron print:sheet IPC, falling back to window.print().
function printSheetHtml(containerRef) {
  const css = Array.from(document.styleSheets).flatMap(sheet => {
    try { return Array.from(sheet.cssRules).map(r => r.cssText) }
    catch { return [] }
  }).filter(t => {
    const s = t.trimStart()
    if (s.startsWith('@media') || s.startsWith('@font-face')) return false
    return s.includes('.ps-') || s.includes('.print-sheet') || s.includes('.pbreak')
  }).join('\n')

  const html = containerRef.current?.innerHTML ?? ''

  if (window.electronAPI?.printSheet && html) {
    window.electronAPI.printSheet({ html, css })
      .then(r => { if (r && !r.success) alert(`Print failed: ${r.reason}`) })
      .catch(err => alert(`Print error: ${err?.message ?? err}`))
  } else {
    window.print()
  }
}

// ─── Constants ────────────────────────────────────────────
const STATUS_CFG = {
  upcoming:    { label: 'Upcoming',    badge: 'badge-gold',    dot: '#f59e0b' },
  active:      { label: 'Active',      badge: 'badge-green',   dot: '#10b981' },
  in_progress: { label: 'In Progress', badge: 'badge-blue',    dot: '#38bdf8' },
  completed:   { label: 'Completed',   badge: 'badge-neutral', dot: '#404e6e' },
  cancelled:   { label: 'Cancelled',   badge: 'badge-red',     dot: '#ef4444' },
}

const MEET_TYPES  = ['invitational','home','away','dual','championship']
const AGE_GROUPS  = ['5-6','7-8','9-10','11-12','13-14','15-16','17-18','Open']
const CAT_TABS    = ['All','Track','Relay','Field','Combined']
const SCORE_TABLE = { 1: 8, 2: 6, 3: 5, 4: 4, 5: 3, 6: 2, 7: 1 }

const PLACE_SUFFIX = ['','ST','ND','RD','TH','TH','TH','TH','TH']
const PLACE_MEDAL  = { 1: '#d97706', 2: '#9ca3af', 3: '#b45309' }
const LABEL_FORMATS = [
  { id:'avery5163',  label:'Avery 5163 — 2″ × 4″',   sub:'10 per sheet',  isSheet:true,  perSheet:10,  sheetClass:'al-sheet-avery5163', labelVariant:'lg'   },
  { id:'avery5160',  label:'Avery 5160 — 1″ × 2⅝″',  sub:'30 per sheet',  isSheet:true,  perSheet:30,  sheetClass:'al-sheet-avery5160', labelVariant:'sm'   },
  { id:'thermal4x2', label:'Thermal — 4″ × 2″',       sub:'one per page',  isSheet:false, perSheet:1,   pageSize:'4in 2in', labelVariant:'lg'      },
  { id:'thermal2x4', label:'Thermal — 2″ × 4″',       sub:'one per page',  isSheet:false, perSheet:1,   pageSize:'2in 4in', labelVariant:'tall'    },
  { id:'thermal1x4', label:'Thermal — 1″ × 4″',       sub:'one per page',  isSheet:false, perSheet:1,   pageSize:'4in 1in', labelVariant:'wide-sm' },
]

function getAgeGroup(age) {
  if (age <= 6)  return '5-6'
  if (age <= 8)  return '7-8'
  if (age <= 10) return '9-10'
  if (age <= 12) return '11-12'
  if (age <= 14) return '13-14'
  if (age <= 16) return '15-16'
  return '17-18'
}

function gLabel(g) {
  return g === 'M' ? 'Boys' : g === 'F' ? 'Girls' : 'Mixed'
}
function gBadge(g) {
  return g === 'M' ? 'badge-blue' : g === 'F' ? 'badge-gold' : 'badge-neutral'
}
function placeBadgeStyle(p) {
  if (p === 1) return { background: '#f59e0b', color: '#08091a', border: 'none' }
  if (p === 2) return { background: '#9ca3af', color: '#08091a', border: 'none' }
  if (p === 3) return { background: '#fb923c', color: '#08091a', border: 'none' }
  return { background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }
}

// ─── Meet Modal (Create / Edit) ───────────────────────────
function MeetModal({ meet, seasons, onSave, onClose }) {
  const isEdit = !!meet?.id
  const [form, setForm] = useState({
    name:      meet?.name      ?? '',
    date:      meet?.date      ?? '',
    location:  meet?.location  ?? '',
    host:      meet?.host      ?? '',
    type:      meet?.type      ?? 'invitational',
    season_id: meet?.season_id ?? '',
    notes:     meet?.notes     ?? '',
  })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const validate = () => {
    const e = {}
    if (!form.name.trim()) e.name = 'Meet name is required'
    if (!form.date) e.date = 'Date is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)
    try { await onSave({ ...form, season_id: form.season_id || null }) }
    finally { setSaving(false) }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 560 }}>
        <div className="modal-header">
          <div className="modal-title">{isEdit ? 'Edit Meet' : 'New Meet'}</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={15} /></button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label className="form-label">Meet Name <span style={{ color: 'var(--red)' }}>*</span></label>
            <input className="input" value={form.name} onChange={e => set('name', e.target.value)}
              placeholder="Pegasus Spring Invitational" autoFocus />
            {errors.name && <span className="form-error">{errors.name}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Date <span style={{ color: 'var(--red)' }}>*</span></label>
            <input className="input" type="date" value={form.date} onChange={e => set('date', e.target.value)} />
            {errors.date && <span className="form-error">{errors.date}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Meet Type</label>
            <select className="input" value={form.type} onChange={e => set('type', e.target.value)}>
              {MEET_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Location</label>
            <input className="input" value={form.location} onChange={e => set('location', e.target.value)}
              placeholder="Stadium name or city" />
          </div>

          <div className="form-group">
            <label className="form-label">Host</label>
            <input className="input" value={form.host} onChange={e => set('host', e.target.value)}
              placeholder="Hosting club or school" />
          </div>

          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label className="form-label">Season</label>
            <select className="input" value={form.season_id} onChange={e => set('season_id', e.target.value)}>
              <option value="">No season</option>
              {seasons.map(s => <option key={s.id} value={s.id}>{s.name} ({s.year})</option>)}
            </select>
          </div>
        </div>

        <div className="form-group" style={{ marginTop: 14 }}>
          <label className="form-label">Notes</label>
          <textarea className="input" value={form.notes} onChange={e => set('notes', e.target.value)}
            placeholder="Any notes about this meet..." rows={2} />
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Meet'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Events Tab ───────────────────────────────────────────
const BULK_AGE_GROUPS = ['5-6','7-8','9-10','11-12','13-14','15-16','17-18']

function EventsTab({ meet, meetDetail, tfEvents, onEventAdded, onEventRemoved }) {
  const [catFilter, setCatFilter] = useState('All')
  const [pickerEvent, setPickerEvent] = useState(null)
  const [gender, setGender]           = useState('M')
  const [ageGroup, setAgeGroup]       = useState('')
  const [round, setRound]             = useState('final')
  const [adding, setAdding]           = useState(false)
  const [addError, setAddError]       = useState('')

  // Bulk-add state
  const [bulkMode,      setBulkMode]      = useState(false)
  const [bulkEvents,    setBulkEvents]    = useState(new Set())
  const [bulkAgeGroups, setBulkAgeGroups] = useState(new Set())
  const [bulkGenders,   setBulkGenders]   = useState(new Set(['M', 'F']))
  const [bulkRound,     setBulkRound]     = useState('final')
  const [bulkAdding,    setBulkAdding]    = useState(false)
  const [bulkResult,    setBulkResult]    = useState('')

  const toggleSet = (setter, val) => setter(s => { const n = new Set(s); n.has(val) ? n.delete(val) : n.add(val); return n })

  const bulkTotal = bulkEvents.size * bulkAgeGroups.size * bulkGenders.size

  const handleBulkAdd = async () => {
    if (!bulkTotal) return
    setBulkAdding(true)
    setBulkResult('')
    let added = 0, skipped = 0
    const combos = []
    for (const evId of bulkEvents) {
      const ev = tfEvents.find(e => e.id === evId)
      for (const g of bulkGenders) {
        for (const ag of bulkAgeGroups) {
          combos.push({ meet_id: meet.id, tf_event_id: evId, gender: g,
            age_group: ag, round: bulkRound, sort_order: ev?.sort_order ?? 999 })
        }
      }
    }
    for (const combo of combos) {
      const res = await api.addMeetEvent(combo)
      if (res?.error) skipped++
      else { added++; onEventAdded(res) }
    }
    setBulkAdding(false)
    setBulkResult(`Added ${added}${skipped ? `, ${skipped} already existed` : ''}.`)
  }

  const addedIds = new Set(meetDetail.events.map(e => `${e.tf_event_id}_${e.gender}_${e.age_group ?? ''}`))

  const filtered = tfEvents.filter(e => {
    if (catFilter === 'All') return true
    return e.category === catFilter.toLowerCase()
  })

  const handleAdd = async () => {
    if (!pickerEvent) return
    setAdding(true)
    setAddError('')
    const res = await api.addMeetEvent({
      meet_id: meet.id,
      tf_event_id: pickerEvent.id,
      gender,
      age_group: ageGroup || null,
      round,
      sort_order: pickerEvent.sort_order,
    })
    setAdding(false)
    if (res?.error) { setAddError(res.error); return }
    onEventAdded(res)
  }

  const addKey = pickerEvent ? `${pickerEvent.id}_${gender}_${ageGroup}` : ''
  const alreadyAdded = addedIds.has(addKey)

  return (
    <div className="meets-two-col">
      {/* Left: added events */}
      <div className="meets-col-left">
        <div className="meets-col-header">
          <List size={13} /> Events in This Meet
          <span className="badge badge-blue" style={{ marginLeft: 'auto', fontSize: 11 }}>
            {meetDetail.events.length}
          </span>
        </div>
        {meetDetail.events.length === 0 ? (
          <div className="empty-state" style={{ padding: '32px 0' }}>
            <p style={{ fontSize: 13 }}>No events added yet</p>
          </div>
        ) : (
          <div className="meets-event-list">
            {meetDetail.events.map(ev => (
              <div key={ev.id} className="meets-event-row">
                <div>
                  <div style={{ fontWeight: 500, fontSize: 13 }}>{ev.event_name}</div>
                  <div style={{ display: 'flex', gap: 5, marginTop: 4, flexWrap: 'wrap' }}>
                    <span className={`badge ${gBadge(ev.gender)}`} style={{ fontSize: 10 }}>
                      {gLabel(ev.gender)}
                    </span>
                    {ev.age_group && (
                      <span className="badge badge-neutral" style={{ fontSize: 10 }}>{ev.age_group}</span>
                    )}
                    <span className="badge badge-neutral" style={{ fontSize: 10, textTransform: 'capitalize' }}>
                      {ev.round}
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', alignSelf: 'center' }}>
                      {ev.entry_count} entered
                    </span>
                  </div>
                </div>
                <button className="btn btn-danger btn-icon" style={{ padding: 5 }}
                  onClick={() => onEventRemoved(ev.id)} title="Remove event">
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right: event picker */}
      <div className="meets-col-right">
        {/* Mode toggle */}
        <div style={{ display: 'flex', background: 'var(--bg-tertiary)', borderRadius: 6,
          padding: 3, gap: 3, marginBottom: 12 }}>
          <button
            className={`btn ${!bulkMode ? 'btn-primary' : 'btn-ghost'}`}
            style={{ flex: 1, fontSize: 11, padding: '4px 8px' }}
            onClick={() => setBulkMode(false)}>
            Single Event
          </button>
          <button
            className={`btn ${bulkMode ? 'btn-primary' : 'btn-ghost'}`}
            style={{ flex: 1, fontSize: 11, padding: '4px 8px' }}
            onClick={() => { setBulkMode(true); setBulkResult('') }}>
            Bulk Setup
          </button>
        </div>

        {bulkMode ? (
          /* ── Bulk Setup Panel ── */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Events */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span className="form-label" style={{ marginBottom: 0 }}>Events</span>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button className="btn btn-ghost" style={{ fontSize: 10, padding: '2px 7px' }}
                    onClick={() => setBulkEvents(new Set(tfEvents.map(e => e.id)))}>All</button>
                  <button className="btn btn-ghost" style={{ fontSize: 10, padding: '2px 7px' }}
                    onClick={() => setBulkEvents(new Set())}>None</button>
                </div>
              </div>
              {['track','relay','field','combined'].map(cat => {
                const evs = tfEvents.filter(e => e.category === cat)
                if (!evs.length) return null
                return (
                  <div key={cat} style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
                      letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 4 }}>
                      {cat}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {evs.map(ev => (
                        <button key={ev.id}
                          className={`btn ${bulkEvents.has(ev.id) ? 'btn-primary' : 'btn-ghost'}`}
                          style={{ fontSize: 10, padding: '3px 8px' }}
                          onClick={() => toggleSet(setBulkEvents, ev.id)}>
                          {ev.abbreviation}
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Age Groups */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span className="form-label" style={{ marginBottom: 0 }}>Age Groups</span>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button className="btn btn-ghost" style={{ fontSize: 10, padding: '2px 7px' }}
                    onClick={() => setBulkAgeGroups(new Set(BULK_AGE_GROUPS))}>All</button>
                  <button className="btn btn-ghost" style={{ fontSize: 10, padding: '2px 7px' }}
                    onClick={() => setBulkAgeGroups(new Set())}>None</button>
                </div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {BULK_AGE_GROUPS.map(ag => (
                  <button key={ag}
                    className={`btn ${bulkAgeGroups.has(ag) ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ fontSize: 11, padding: '3px 10px' }}
                    onClick={() => toggleSet(setBulkAgeGroups, ag)}>
                    {ag}
                  </button>
                ))}
              </div>
            </div>

            {/* Gender */}
            <div>
              <div className="form-label" style={{ marginBottom: 6 }}>Gender</div>
              <div style={{ display: 'flex', gap: 4 }}>
                {[['M','Boys'],['F','Girls']].map(([g, label]) => (
                  <button key={g}
                    className={`btn ${bulkGenders.has(g) ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ fontSize: 11, padding: '4px 16px' }}
                    onClick={() => toggleSet(setBulkGenders, g)}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Round */}
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Round</label>
              <select className="input" value={bulkRound} onChange={e => setBulkRound(e.target.value)}>
                <option value="final">Final</option>
                <option value="prelim">Prelim</option>
                <option value="semi">Semi</option>
              </select>
            </div>

            {bulkResult && (
              <div style={{ fontSize: 12, color: 'var(--accent)' }}>{bulkResult}</div>
            )}

            <button className="btn btn-primary" style={{ width: '100%' }}
              onClick={handleBulkAdd} disabled={bulkAdding || !bulkTotal}>
              {bulkAdding
                ? 'Adding…'
                : bulkTotal
                  ? `Add ${bulkTotal} Event${bulkTotal !== 1 ? 's' : ''}`
                  : 'Select events, ages & genders above'}
            </button>
          </div>
        ) : (
          /* ── Single Event Picker ── */
          <>
            <div className="meets-cat-tabs">
              {CAT_TABS.map(c => (
                <button key={c}
                  className={`meets-cat-tab${catFilter === c ? ' active' : ''}`}
                  onClick={() => setCatFilter(c)}>
                  {c}
                </button>
              ))}
            </div>

            <div className="meets-picker-list">
              {filtered.map(ev => {
                const isSelected = pickerEvent?.id === ev.id
                return (
                  <button key={ev.id}
                    className={`meets-picker-item${isSelected ? ' selected' : ''}`}
                    onClick={() => setPickerEvent(isSelected ? null : ev)}>
                    <span className="meets-picker-abbr">{ev.abbreviation}</span>
                    <span className="meets-picker-name">{ev.name}</span>
                    <span className="badge badge-neutral" style={{ fontSize: 10, marginLeft: 'auto', flexShrink: 0 }}>
                      {ev.category}
                    </span>
                  </button>
                )
              })}
            </div>

            {pickerEvent && (
              <div className="meets-picker-options">
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600,
                  letterSpacing: '0.04em', marginBottom: 12, color: 'var(--accent)' }}>
                  {pickerEvent.name}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Gender</label>
                    <select className="input" value={gender} onChange={e => setGender(e.target.value)}>
                      <option value="M">Boys</option>
                      <option value="F">Girls</option>
                      <option value="mixed">Mixed</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Age Group</label>
                    <select className="input" value={ageGroup} onChange={e => setAgeGroup(e.target.value)}>
                      <option value="">All Ages</option>
                      {AGE_GROUPS.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">Round</label>
                    <select className="input" value={round} onChange={e => setRound(e.target.value)}>
                      <option value="final">Final</option>
                      <option value="prelim">Prelim</option>
                      <option value="semi">Semi</option>
                    </select>
                  </div>
                </div>
                {addError && (
                  <div style={{ fontSize: 12, color: 'var(--red)', marginBottom: 8 }}>{addError}</div>
                )}
                <button className="btn btn-primary" style={{ width: '100%' }}
                  onClick={handleAdd} disabled={adding || alreadyAdded}>
                  {alreadyAdded ? '✓ Already Added' : adding ? 'Adding…' : `Add ${gLabel(gender)} ${pickerEvent.abbreviation}`}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ─── Worksheet Tab (Entries + Results combined) ───────────
function WorksheetTab({ meet, meetDetail }) {
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [eventDetail,   setEventDetail]   = useState(null)
  const [results,       setResults]       = useState({})   // entryId → local edits
  const [athletes,      setAthletes]      = useState([])
  const [search,        setSearch]        = useState('')
  const [loading,       setLoading]       = useState(false)
  const [seeding,       setSeeding]       = useState(false)
  const [ranking,       setRanking]       = useState(false)
  const [actionMsg,     setActionMsg]     = useState('')
  const [showPrint,     setShowPrint]     = useState(false)

  useEffect(() => { api.getAthletes().then(setAthletes) }, [])

  useEffect(() => {
    if (!selectedEvent) { setEventDetail(null); setResults({}); return }
    setLoading(true)
    api.getMeetEventEntries(selectedEvent.id).then(d => {
      setEventDetail(d)
      const init = {}
      d.entries.forEach(en => {
        init[en.id] = {
          seed_mark:      en.seed_mark      ?? '',
          mark:           en.mark           ?? '',
          wind:           en.wind           ?? '',
          did_not_start:  !!en.did_not_start,
          did_not_finish: !!en.did_not_finish,
          disqualified:   !!en.disqualified,
          place:          en.place          ?? null,
          is_pr:          !!en.is_pr,
          attempts_json:  en.attempts_json  ?? null,
        }
      })
      setResults(init)
      setLoading(false)
    })
  }, [selectedEvent])

  const setR = (entryId, patch) =>
    setResults(r => ({ ...r, [entryId]: { ...r[entryId], ...patch } }))

  const saveSeed = async (entryId) => {
    const r = results[entryId]
    await api.updateEntrySeed(entryId, r?.seed_mark || null)
  }

  const saveResult = async (entryId) => {
    const r = results[entryId]
    if (!r) return
    const res = await api.saveResult(entryId, {
      mark:           r.mark           || null,
      wind:           r.wind           || null,
      did_not_start:  r.did_not_start,
      did_not_finish: r.did_not_finish,
      disqualified:   r.disqualified,
      dq_reason:      null,
      attempts_json:  r.attempts_json  || null,
    })
    if (res?.is_pr !== undefined) setR(entryId, { is_pr: !!res.is_pr })
  }

  const handleAddAthlete = async (athlete) => {
    const res = await api.addEntry({ meet_event_id: selectedEvent.id, athlete_id: athlete.id })
    if (res?.error) { alert(res.error); return }
    setEventDetail(d => ({ ...d, entries: [...d.entries, res] }))
    setResults(r => ({ ...r, [res.id]: {
      seed_mark: '', mark: '', wind: '',
      did_not_start: false, did_not_finish: false, disqualified: false,
      place: null, is_pr: false, attempts_json: null,
    }}))
  }

  const handleRemoveEntry = async (entryId) => {
    await api.removeEntry(entryId)
    setEventDetail(d => ({ ...d, entries: d.entries.filter(e => e.id !== entryId) }))
    setResults(r => { const next = { ...r }; delete next[entryId]; return next })
  }

  const handleScratch = async (entry) => {
    await api.scratchEntry(entry.id, !entry.scratched)
    setEventDetail(d => ({
      ...d,
      entries: d.entries.map(e => e.id === entry.id ? { ...e, scratched: !e.scratched } : e),
    }))
  }

  const handleAutoSeed = async () => {
    setSeeding(true)
    // Flush pending seed edits first
    await Promise.all(Object.keys(results).map(id => saveSeed(Number(id))))
    await api.seedEvent(selectedEvent.id)
    const d = await api.getMeetEventEntries(selectedEvent.id)
    setEventDetail(d)
    setSeeding(false)
    setActionMsg('Seeded!')
    setTimeout(() => setActionMsg(''), 2000)
  }

  const handleAutoRank = async () => {
    setRanking(true)
    await Promise.all(Object.keys(results).map(id => saveResult(Number(id))))
    await api.autoRank(selectedEvent.id)
    const d = await api.getMeetEventEntries(selectedEvent.id)
    setEventDetail(d)
    const updated = {}
    d.entries.forEach(en => {
      updated[en.id] = { ...results[en.id], place: en.place ?? null, is_pr: !!en.is_pr }
    })
    setResults(updated)
    setRanking(false)
    setActionMsg('Ranked!')
    setTimeout(() => setActionMsg(''), 2000)
  }

  const isField  = eventDetail?.category === 'field' || eventDetail?.category === 'combined'
  const showWind = eventDetail?.category === 'track'  || eventDetail?.category === 'relay'

  const enteredIds = new Set(eventDetail?.entries.map(e => e.athlete_id) ?? [])
  const filteredAthletes = athletes.filter(a => {
    if (enteredIds.has(a.id)) return false
    if (selectedEvent?.gender && selectedEvent.gender !== 'mixed' && a.gender !== selectedEvent.gender) return false
    if (selectedEvent?.age_group && getAgeGroup(a.age) !== selectedEvent.age_group) return false
    const q = search.toLowerCase()
    return !q || `${a.first_name} ${a.last_name}`.toLowerCase().includes(q)
  })

  const scoring = (eventDetail?.entries ?? [])
    .filter(en => { const r = results[en.id]; return r?.place && SCORE_TABLE[r.place] && !r.disqualified && !en.scratched })
    .map(en => ({ name: `${en.last_name}, ${en.first_name}`, place: results[en.id].place, pts: SCORE_TABLE[results[en.id].place], is_pr: results[en.id].is_pr }))
    .sort((a, b) => a.place - b.place)

  return (
    <div className="meets-two-col">
      {/* Left: event list */}
      <div className="meets-col-left">
        <div className="meets-col-header"><List size={13} /> Events</div>
        {meetDetail.events.length === 0 ? (
          <div style={{ padding: '24px 16px', color: 'var(--text-muted)', fontSize: 13 }}>
            Add events first in the Events tab.
          </div>
        ) : (
          <div className="meets-event-list">
            {meetDetail.events.map(ev => (
              <button key={ev.id}
                className={`meets-event-select${selectedEvent?.id === ev.id ? ' active' : ''}`}
                onClick={() => setSelectedEvent(ev)}>
                <div style={{ fontWeight: 500, fontSize: 13 }}>{ev.event_name}</div>
                <div style={{ display: 'flex', gap: 5, marginTop: 3, flexWrap: 'wrap' }}>
                  <span className={`badge ${gBadge(ev.gender)}`} style={{ fontSize: 10 }}>{gLabel(ev.gender)}</span>
                  {ev.age_group && <span className="badge badge-neutral" style={{ fontSize: 10 }}>{ev.age_group}</span>}
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', alignSelf: 'center' }}>{ev.entry_count} entered</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right: worksheet */}
      <div className="meets-col-right">
        {!selectedEvent ? (
          <div className="empty-state" style={{ padding: '48px 0' }}>
            <Users size={36} />
            <p style={{ fontSize: 13 }}>Select an event to manage entries and results</p>
          </div>
        ) : loading ? (
          <div className="loading-container"><div className="loading-spinner" /></div>
        ) : (
          <>
            {/* Event header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600, letterSpacing: '0.04em' }}>
                  {selectedEvent.event_name}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {gLabel(selectedEvent.gender)}{selectedEvent.age_group ? ` · ${selectedEvent.age_group}` : ''}
                  {' · '}{isField ? 'Field — highest mark wins' : 'Track — lowest time wins'}
                </div>
              </div>
              <button className="btn btn-ghost" style={{ fontSize: 11, padding: '5px 10px' }}
                onClick={handleAutoSeed} disabled={seeding || ranking}>
                <Shuffle size={12} /> {seeding ? 'Seeding…' : 'Auto-Seed'}
              </button>
              <button className="btn btn-primary" style={{ fontSize: 11, padding: '5px 10px' }}
                onClick={handleAutoRank} disabled={seeding || ranking}>
                <RefreshCw size={12} /> {ranking ? 'Ranking…' : actionMsg || 'Auto-Rank'}
              </button>
              {eventDetail?.entries?.length > 0 && (
                <button className="btn btn-ghost" style={{ fontSize: 11, padding: '5px 10px' }}
                  onClick={() => setShowPrint(true)} title="Print results sheet">
                  🖨 Print
                </button>
              )}
            </div>

            {/* ── Athlete rows ── */}
            {(eventDetail?.entries.length ?? 0) === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '8px 0 14px' }}>
                No entries yet — add athletes below.
              </div>
            ) : (
              <div className="worksheet-table">
                {/* Column headers */}
                <div className="worksheet-head">
                  <span className="ws-col-name">Athlete</span>
                  <span className="ws-col-seed">Seed</span>
                  <span className="ws-col-pos">{isField ? 'Fl/Pos' : 'Ht/Ln'}</span>
                  {!isField && <span className="ws-col-mark">Time</span>}
                  {showWind && <span className="ws-col-wind">Wind</span>}
                  <span className="ws-col-toggle">DNS</span>
                  <span className="ws-col-toggle">DNF</span>
                  <span className="ws-col-toggle">DQ</span>
                  <span className="ws-col-place">Pl</span>
                  <span className="ws-col-scratch">Scr</span>
                  <span className="ws-col-del" />
                </div>

                {eventDetail.entries.map((en, idx) => {
                  const r = results[en.id] ?? {}
                  const statusDisabled = r.did_not_start || r.did_not_finish || r.disqualified
                  return (
                    <div key={en.id} className={`worksheet-row${en.scratched ? ' scratched' : ''}`}>
                      {/* Main row */}
                      <div className="worksheet-main-row">
                        {/* Avatar + name */}
                        <div className="ws-col-name" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div className={`avatar avatar-${en.athlete_gender === 'M' ? 'male' : 'female'}`}
                            style={{ width: 24, height: 24, fontSize: 10, flexShrink: 0 }}>
                            {en.first_name?.[0]}{en.last_name?.[0]}
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {en.last_name}, {en.first_name}
                            {r.is_pr && <span style={{ marginLeft: 5, color: '#f59e0b', fontSize: 11 }}>★ PR</span>}
                          </span>
                        </div>

                        {/* Seed */}
                        <input className="ws-col-seed worksheet-input" value={r.seed_mark ?? ''} placeholder="—"
                          onChange={e => setR(en.id, { seed_mark: e.target.value })}
                          onBlur={() => saveSeed(en.id)} />

                        {/* Heat/Lane or Flight/Pos */}
                        <span className="ws-col-pos" style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                          {en.heat ? (isField ? `F${en.heat}·${en.lane}` : `H${en.heat}·L${en.lane}`) : '—'}
                        </span>

                        {/* Time (track only) */}
                        {!isField && (
                          <input
                            className={`ws-col-mark worksheet-input${statusDisabled ? ' disabled' : ''}`}
                            value={r.mark ?? ''}
                            disabled={statusDisabled || !!en.scratched}
                            placeholder="0:00.00"
                            onChange={e => setR(en.id, { mark: e.target.value })}
                            onBlur={() => saveResult(en.id)}
                            data-result-idx={idx}
                            onKeyDown={e => {
                              if (e.key === 'Tab' && !e.shiftKey) {
                                e.preventDefault()
                                document.querySelector(`[data-result-idx="${idx + 1}"]`)?.focus()
                              }
                            }}
                          />
                        )}

                        {/* Wind */}
                        {showWind && (
                          <input className={`ws-col-wind worksheet-input${statusDisabled ? ' disabled' : ''}`}
                            value={r.wind ?? ''} disabled={statusDisabled || !!en.scratched}
                            placeholder="+0.0"
                            onChange={e => setR(en.id, { wind: e.target.value })}
                            onBlur={() => saveResult(en.id)} />
                        )}

                        {/* DNS / DNF / DQ */}
                        <div className="ws-col-toggle">
                          <StatusToggle label="DNS" active={r.did_not_start} disabled={!!en.scratched}
                            onToggle={() => { const n=!r.did_not_start; setR(en.id,{did_not_start:n,did_not_finish:false,disqualified:false,mark:n?'':r.mark}); setTimeout(()=>saveResult(en.id),0) }} />
                        </div>
                        <div className="ws-col-toggle">
                          <StatusToggle label="DNF" active={r.did_not_finish} disabled={!!en.scratched}
                            onToggle={() => { const n=!r.did_not_finish; setR(en.id,{did_not_finish:n,did_not_start:false,disqualified:false,mark:n?'':r.mark}); setTimeout(()=>saveResult(en.id),0) }} />
                        </div>
                        <div className="ws-col-toggle">
                          <StatusToggle label="DQ" active={r.disqualified} disabled={!!en.scratched}
                            onToggle={() => { const n=!r.disqualified; setR(en.id,{disqualified:n,did_not_start:false,did_not_finish:false,mark:n?'':r.mark}); setTimeout(()=>saveResult(en.id),0) }} />
                        </div>

                        {/* Place */}
                        <div className="ws-col-place" style={{ display: 'flex', justifyContent: 'center' }}>
                          {r.place
                            ? <span className="badge" style={{ ...placeBadgeStyle(r.place), fontSize: 11, fontWeight: 700, minWidth: 22, justifyContent: 'center' }}>{r.place}</span>
                            : <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>—</span>}
                        </div>

                        {/* Scratch */}
                        <div className="ws-col-scratch" style={{ textAlign: 'center' }}>
                          <button className={`meets-status-toggle${en.scratched ? ' on' : ''}`}
                            style={{ width: 34, fontSize: 10 }} onClick={() => handleScratch(en)}>
                            SCR
                          </button>
                        </div>

                        {/* Remove */}
                        <div className="ws-col-del">
                          <button className="btn btn-danger btn-icon" style={{ padding: 4 }}
                            onClick={() => handleRemoveEntry(en.id)}>
                            <X size={11} />
                          </button>
                        </div>
                      </div>

                      {/* Field attempt grid (below main row) */}
                      {isField && !en.scratched && !statusDisabled && (
                        <div style={{ paddingLeft: 30, paddingTop: 6, paddingBottom: 4 }}>
                          <FieldAttempts
                            attemptsJson={r.attempts_json}
                            category={eventDetail.category}
                            disabled={false}
                            onChange={(attemptsJson, bestMark) => {
                              setR(en.id, { attempts_json: attemptsJson, mark: bestMark ?? r.mark })
                              setTimeout(() => saveResult(en.id), 0)
                            }}
                          />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* ── Add from Roster ── */}
            <div style={{ marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
              <div className="form-label" style={{ marginBottom: 8 }}>Add from Roster</div>
              <div className="search-bar" style={{ maxWidth: '100%', marginBottom: 8 }}>
                <Search size={13} />
                <input className="input" placeholder="Search athletes…" value={search}
                  onChange={e => setSearch(e.target.value)} />
              </div>
              <div className="meets-roster-list">
                {filteredAthletes.slice(0, 30).map(a => (
                  <button key={a.id} className="meets-roster-item" onClick={() => handleAddAthlete(a)}>
                    <div className={`avatar avatar-${a.gender === 'M' ? 'male' : 'female'}`}
                      style={{ width: 24, height: 24, fontSize: 10 }}>
                      {a.first_name[0]}{a.last_name[0]}
                    </div>
                    <span style={{ fontSize: 12 }}>{a.last_name}, {a.first_name}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>Age {a.age}</span>
                    <Plus size={12} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                  </button>
                ))}
                {filteredAthletes.length === 0 && (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '8px 0' }}>
                    {search
                      ? 'No athletes match'
                      : selectedEvent?.age_group || selectedEvent?.gender !== 'mixed'
                        ? `No eligible athletes — only ${selectedEvent.gender !== 'mixed' ? (selectedEvent.gender === 'M' ? 'boys' : 'girls') : 'athletes'}${selectedEvent.age_group ? ` in the ${selectedEvent.age_group} age group` : ''} can be added`
                        : 'All athletes entered'}
                  </div>
                )}
              </div>
            </div>

            {/* ── Event Scoring ── */}
            {scoring.length > 0 && (
              <div style={{ marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                <div className="meets-col-header" style={{ marginBottom: 10 }}>
                  <Star size={13} /> Event Scoring
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {scoring.map(({ name, place, pts, is_pr }) => (
                    <div key={place} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                      <span className="badge" style={{ ...placeBadgeStyle(place), minWidth: 22, justifyContent: 'center', fontWeight: 700, fontSize: 11 }}>{place}</span>
                      <span style={{ flex: 1 }}>{name}{is_pr && <span style={{ color: '#f59e0b', marginLeft: 5 }}>★</span>}</span>
                      <span style={{ fontFamily: 'monospace', color: 'var(--accent)', fontWeight: 600 }}>{pts} pts</span>
                    </div>
                  ))}
                  <div style={{ borderTop: '1px solid var(--border)', marginTop: 6, paddingTop: 6, display: 'flex', justifyContent: 'flex-end', fontSize: 12, fontWeight: 600 }}>
                    Total: {scoring.reduce((s, x) => s + x.pts, 0)} pts
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {showPrint && eventDetail && (
        <PrintResultsModal
          meet={meet}
          event={selectedEvent}
          entries={eventDetail.entries}
          results={results}
          onClose={() => setShowPrint(false)}
        />
      )}
    </div>
  )
}

// ─── Event Result Card ────────────────────────────────────
function EventResultCard({ eventDetail, onPrint, onScore, onLabels, onHeatSheet, scoring }) {
  const isField  = eventDetail.category === 'field' || eventDetail.category === 'combined'
  const showWind = eventDetail.category === 'track'  || eventDetail.category === 'relay'

  const sorted = [...(eventDetail.entries ?? [])].sort((a, b) => {
    const pa = a.place, pb = b.place
    if (pa && pb) return pa - pb
    if (pa) return -1
    if (pb) return 1
    return 0
  })

  const hasResults = sorted.some(en =>
    en.place || en.did_not_start || en.did_not_finish || en.disqualified || en.scratched
  )

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      {/* Card header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px',
        borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, letterSpacing: '0.04em' }}>
            {eventDetail.event_name}
          </div>
          <div style={{ display: 'flex', gap: 5, marginTop: 4, flexWrap: 'wrap' }}>
            <span className={`badge ${gBadge(eventDetail.gender)}`} style={{ fontSize: 10 }}>{gLabel(eventDetail.gender)}</span>
            {eventDetail.age_group && <span className="badge badge-neutral" style={{ fontSize: 10 }}>{eventDetail.age_group}</span>}
            <span className="badge badge-neutral" style={{ fontSize: 10, textTransform: 'capitalize' }}>{eventDetail.round}</span>
            <span style={{ fontSize: 10, color: 'var(--text-muted)', alignSelf: 'center' }}>
              {sorted.length} athlete{sorted.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 5, flexShrink: 0, alignItems: 'center' }}>
          {sorted.length > 0 && (
            <button className="btn btn-ghost" style={{ fontSize: 11, padding: '4px 10px' }}
              onClick={onScore} disabled={scoring} title="Auto-rank this event">
              {scoring ? '…' : '⚡ Score'}
            </button>
          )}
          {sorted.length > 0 && (
            <button className="btn btn-ghost" style={{ fontSize: 11, padding: '4px 10px' }}
              onClick={onHeatSheet} title="Print heat sheet for this event">
              📋 Heat Sheet
            </button>
          )}
          <button className="btn btn-ghost" style={{ fontSize: 11, padding: '4px 10px' }}
            onClick={onLabels} title="Print award labels for this event">
            🏷 Labels
          </button>
          <button className="btn btn-ghost" style={{ fontSize: 11, padding: '4px 10px' }}
            onClick={onPrint} disabled={!hasResults}
            title={hasResults ? 'Print results for this event' : 'Run Score first to enable results'}>
            🖨 Results
          </button>
        </div>
      </div>

      {/* Results table */}
      {sorted.length === 0 ? (
        <div style={{ padding: '14px 20px', fontSize: 13, color: 'var(--text-muted)' }}>No entries</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: 'var(--bg-tertiary)' }}>
              <th style={{ padding: '6px 12px', textAlign: 'left', fontWeight: 600, fontSize: 11,
                color: 'var(--text-muted)', letterSpacing: '0.05em', width: 44 }}>Pl</th>
              <th style={{ padding: '6px 12px', textAlign: 'left', fontWeight: 600, fontSize: 11,
                color: 'var(--text-muted)', letterSpacing: '0.05em' }}>Athlete</th>
              {!isField && <th style={{ padding: '6px 12px', textAlign: 'center', fontWeight: 600, fontSize: 11,
                color: 'var(--text-muted)', letterSpacing: '0.05em', width: 90 }}>Time</th>}
              {showWind && <th style={{ padding: '6px 12px', textAlign: 'center', fontWeight: 600, fontSize: 11,
                color: 'var(--text-muted)', letterSpacing: '0.05em', width: 56 }}>Wind</th>}
              {isField && <th style={{ padding: '6px 12px', textAlign: 'center', fontWeight: 600, fontSize: 11,
                color: 'var(--text-muted)', letterSpacing: '0.05em', width: 90 }}>Best</th>}
              <th style={{ padding: '6px 12px', textAlign: 'center', fontWeight: 600, fontSize: 11,
                color: 'var(--text-muted)', letterSpacing: '0.05em', width: 50 }}>Pts</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((en, i) => {
              const status = en.scratched      ? 'SCR'
                : en.did_not_start  ? 'DNS'
                : en.did_not_finish ? 'DNF'
                : en.disqualified   ? 'DQ'
                : null
              const pts = (!status && en.place) ? (SCORE_TABLE[en.place] ?? null) : null
              return (
                <tr key={en.id} style={{ borderTop: '1px solid var(--border)',
                  background: i % 2 === 1 ? 'var(--bg-secondary)' : 'transparent' }}>
                  <td style={{ padding: '7px 12px' }}>
                    {status
                      ? <span style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>{status}</span>
                      : en.place
                        ? <span className="badge" style={{ ...placeBadgeStyle(en.place), fontSize: 11,
                            fontWeight: 700, minWidth: 22, justifyContent: 'center' }}>{en.place}</span>
                        : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                  </td>
                  <td style={{ padding: '7px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div className={`avatar avatar-${en.athlete_gender === 'M' ? 'male' : 'female'}`}
                        style={{ width: 22, height: 22, fontSize: 9, flexShrink: 0 }}>
                        {en.first_name?.[0]}{en.last_name?.[0]}
                      </div>
                      <span style={{ fontWeight: 500 }}>{en.last_name}, {en.first_name}</span>
                      {en.is_pr && <span style={{ color: '#f59e0b', fontSize: 11, marginLeft: 4 }}>★ PR</span>}
                    </div>
                  </td>
                  {!isField && (
                    <td style={{ padding: '7px 12px', textAlign: 'center', fontFamily: 'monospace',
                      fontWeight: en.mark ? 600 : 400, color: en.mark ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                      {status || en.mark || '—'}
                    </td>
                  )}
                  {showWind && (
                    <td style={{ padding: '7px 12px', textAlign: 'center', fontFamily: 'monospace',
                      fontSize: 11, color: 'var(--text-muted)' }}>
                      {en.wind || '—'}
                    </td>
                  )}
                  {isField && (
                    <td style={{ padding: '7px 12px', textAlign: 'center', fontFamily: 'monospace',
                      fontWeight: en.mark ? 600 : 400, color: en.mark ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                      {status || en.mark || '—'}
                    </td>
                  )}
                  <td style={{ padding: '7px 12px', textAlign: 'center', fontFamily: 'monospace',
                    color: pts ? 'var(--accent)' : 'var(--text-muted)', fontWeight: pts ? 600 : 400 }}>
                    {pts ?? '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}

// ─── Team Score Summary ───────────────────────────────────
function TeamScoreSummary({ eventsData }) {
  const totals = {}
  for (const ev of eventsData) {
    for (const en of (ev.entries ?? [])) {
      if (!en.place || en.scratched || en.disqualified || en.did_not_start || en.did_not_finish) continue
      const pts = SCORE_TABLE[en.place]
      if (!pts) continue
      const team = en.team || 'Unknown'
      totals[team] = (totals[team] ?? 0) + pts
    }
  }

  const ranked = Object.entries(totals).sort((a, b) => b[1] - a[1])
  if (ranked.length < 2) return null

  return (
    <div className="card" style={{ marginBottom: 20, padding: '16px 20px' }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 600,
        letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)',
        marginBottom: 14 }}>
        Team Scores
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {ranked.map(([team, pts], i) => {
          const pct = ranked[0][1] > 0 ? (pts / ranked[0][1]) * 100 : 0
          return (
            <div key={team}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                marginBottom: 5 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {i === 0 && (
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#f59e0b',
                      fontFamily: 'var(--font-display)', letterSpacing: '0.05em' }}>
                      LEAD
                    </span>
                  )}
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{team}</span>
                </span>
                <span style={{ fontFamily: 'monospace', fontSize: 20, fontWeight: 700,
                  color: i === 0 ? 'var(--accent)' : 'var(--text-secondary)' }}>
                  {pts}
                </span>
              </div>
              <div style={{ height: 6, background: 'var(--bg-tertiary)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 3, transition: 'width 0.4s ease',
                  width: `${pct}%`,
                  background: i === 0 ? 'var(--accent)' : 'var(--text-muted)' }} />
              </div>
            </div>
          )
        })}
      </div>
      {ranked.length === 2 && (
        <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border)',
          fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
          {ranked[0][0]} leads by {ranked[0][1] - ranked[1][1]} point{ranked[0][1] - ranked[1][1] !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  )
}

// ─── Results Tab ──────────────────────────────────────────
function ResultsTab({ meet, meetDetail, onScoringChange }) {
  const [eventsData,           setEventsData]           = useState([])
  const [loading,              setLoading]              = useState(false)
  const [showPrintEvent,       setShowPrintEvent]       = useState(null)
  const [showPrintMeet,        setShowPrintMeet]        = useState(false)
  const [showAwardLabels,      setShowAwardLabels]      = useState(false)
  const [showAwardLabelsEvent, setShowAwardLabelsEvent] = useState(null)
  const [showHeatSheetEvent,   setShowHeatSheetEvent]   = useState(null)
  const [scoringEventId,       setScoringEventId]       = useState(null)

  const load = useCallback(() => {
    if (meetDetail.events.length === 0) { setEventsData([]); return }
    setLoading(true)
    Promise.all(meetDetail.events.map(ev => api.getMeetEventEntries(ev.id)))
      .then(data => { setEventsData(data.filter(Boolean)); setLoading(false) })
      .catch(() => setLoading(false))
  }, [meetDetail.events])

  useEffect(() => { load() }, [load])

  const buildResultsMap = (ev) =>
    Object.fromEntries((ev.entries ?? []).map(en => [en.id, {
      mark:           en.mark           ?? null,
      wind:           en.wind           ?? null,
      place:          en.place          ?? null,
      is_pr:          en.is_pr          ?? 0,
      did_not_start:  en.did_not_start  ?? 0,
      did_not_finish: en.did_not_finish ?? 0,
      disqualified:   en.disqualified   ?? 0,
      attempts_json:  en.attempts_json  ?? null,
      seed_mark:      en.seed_mark      ?? null,
    }]))

  const handleScoreEvent = async (ev) => {
    setScoringEventId(ev.id)
    try {
      await api.autoRank(ev.id)
      const updated = await api.getMeetEventEntries(ev.id)
      if (updated) {
        setEventsData(prev => {
          const next = prev.map(e => e.id === ev.id ? updated : e)
          const withEntries = next.filter(e => (e.entries ?? []).some(en => !en.scratched))
          const scored      = withEntries.filter(e => e.entries.some(en => en.place))
          onScoringChange?.({
            any: scored.length > 0,
            all: withEntries.length > 0 && scored.length === withEntries.length,
          })
          return next
        })
      }
    } finally {
      setScoringEventId(null)
    }
  }

  if (loading) return <div className="loading-container"><div className="loading-spinner" /></div>

  if (meetDetail.events.length === 0) {
    return (
      <div className="empty-state" style={{ padding: '48px 0' }}>
        <Trophy size={36} />
        <p style={{ fontSize: 13 }}>No events added to this meet yet</p>
      </div>
    )
  }

  const completedCount = eventsData.filter(ev => ev.entries?.some(en => en.place)).length

  return (
    <div>
      {/* Team score summary — shown whenever 2+ teams have points */}
      <TeamScoreSummary eventsData={eventsData} />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          {completedCount} of {eventsData.length} event{eventsData.length !== 1 ? 's' : ''} with results
        </div>
        <button className="btn btn-ghost" style={{ fontSize: 12 }}
          onClick={() => setShowAwardLabels(true)}>
          🏷 Award Labels
        </button>
        <button className="btn btn-primary" style={{ fontSize: 12 }}
          onClick={() => setShowPrintMeet(true)}>
          🖨 Print Full Meet Results
        </button>
      </div>

      {/* Per-event result cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {eventsData.map(ev => (
          <EventResultCard key={ev.id} eventDetail={ev}
            onPrint={() => setShowPrintEvent(ev)}
            onScore={() => handleScoreEvent(ev)}
            onLabels={() => setShowAwardLabelsEvent(ev)}
            onHeatSheet={() => setShowHeatSheetEvent(ev)}
            scoring={scoringEventId === ev.id}
          />
        ))}
      </div>

      {showPrintEvent && (
        <PrintResultsModal
          meet={meet}
          event={showPrintEvent}
          entries={showPrintEvent.entries ?? []}
          results={buildResultsMap(showPrintEvent)}
          onClose={() => setShowPrintEvent(null)}
        />
      )}

      {showPrintMeet && (
        <PrintMeetModal
          meet={meet}
          eventsData={eventsData}
          onClose={() => setShowPrintMeet(false)}
        />
      )}

      {showAwardLabels && (
        <PrintAwardLabelsModal
          meet={meet}
          eventsData={eventsData}
          onClose={() => setShowAwardLabels(false)}
        />
      )}

      {showAwardLabelsEvent && (
        <PrintAwardLabelsModal
          meet={meet}
          eventsData={eventsData}
          initialSelectedIds={new Set([showAwardLabelsEvent.id])}
          onClose={() => setShowAwardLabelsEvent(null)}
        />
      )}

      {showHeatSheetEvent && (
        <PrintEventHeatSheetModal
          meet={meet}
          eventDetail={showHeatSheetEvent}
          onClose={() => setShowHeatSheetEvent(null)}
        />
      )}
    </div>
  )
}

// ─── Print Heat Sheet Modal ───────────────────────────────
function PrintHeatSheetModal({ meet, meetDetail, onClose }) {
  const [eventsData, setEventsData] = useState([])
  const [loading,    setLoading]    = useState(true)
  const printRef = useRef(null)

  useEffect(() => {
    if (meetDetail.events.length === 0) { setLoading(false); return }
    Promise.all(meetDetail.events.map(ev => api.getMeetEventEntries(ev.id)))
      .then(data => { setEventsData(data.filter(Boolean)); setLoading(false) })
  }, [meetDetail.events])

  const meetDate = new Date(meet.date + 'T00:00:00')
    .toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  const groupByHeat = (entries) => {
    const seeded   = entries.filter(en => en.heat)
    const unseeded = entries.filter(en => !en.heat)
    const map = {}
    for (const en of seeded) {
      if (!map[en.heat]) map[en.heat] = []
      map[en.heat].push(en)
    }
    const heats = Object.entries(map)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([h, rows]) => ({ heat: Number(h), rows: rows.sort((a, b) => (a.lane ?? 99) - (b.lane ?? 99)) }))
    return { heats, unseeded }
  }

  const activeEvents = eventsData.filter(ev => (ev.entries ?? []).some(en => !en.scratched))

  if (loading) return (
    <div className="print-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="loading-container"><div className="loading-spinner" /></div>
    </div>
  )

  return (
    <div className="print-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="print-preview-container">
        <div className="print-toolbar no-print">
          <span style={{ fontWeight: 600, fontSize: 14 }}>Heat Sheets — Print Preview</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" onClick={() => printSheetHtml(printRef)}>🖨 Print / Save PDF</button>
            <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={15} /></button>
          </div>
        </div>

        <div ref={printRef}>
        {activeEvents.length === 0 ? (
          <div className="print-sheet">
            <div className="ps-club-name">PEGASUS TRACK</div>
            <div className="ps-meet-name">{meet.name}</div>
            <div className="ps-divider" />
            <p style={{ textAlign: 'center', color: '#888', padding: '40px 0' }}>
              No entries yet. Add athletes to events first.
            </p>
          </div>
        ) : (
          activeEvents.map((ev, idx) => {
            const isField  = ev.category === 'field' || ev.category === 'combined'
            const showWind = ev.category === 'track'  || ev.category === 'relay'
            const isLast   = idx === activeEvents.length - 1
            const nonScr   = (ev.entries ?? []).filter(en => !en.scratched)
            const { heats, unseeded } = groupByHeat(nonScr)

            const eventTitle = [
              ev.event_name.toUpperCase(),
              ev.gender === 'M' ? 'BOYS' : ev.gender === 'F' ? 'GIRLS' : 'MIXED',
              ev.age_group || null,
              (ev.round || 'FINAL').toUpperCase(),
            ].filter(Boolean).join(' · ')

            return (
              <div key={ev.id} className="print-sheet"
                style={{ marginBottom: isLast ? 0 : 24, pageBreakAfter: isLast ? 'auto' : 'always' }}>
                <div className="ps-header">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div className="ps-club-name">PEGASUS TRACK</div>
                      <div className="ps-meet-name">{meet.name}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className="ps-meet-date">{meetDate}</div>
                      {meet.location && <div className="ps-meet-location">{meet.location}</div>}
                    </div>
                  </div>
                  <div className="ps-divider" />
                  <div className="ps-event-title">{eventTitle}</div>
                </div>

                {heats.map(({ heat, rows }) => (
                  <div key={heat} style={{ marginBottom: 18 }}>
                    <div className="hs-heat-label">
                      {isField ? 'Flight' : 'Heat'} {heat} of {heats.length}
                    </div>
                    <table className="ps-table">
                      <thead>
                        <tr>
                          <th style={{ width: 28 }}>{isField ? 'Pos' : 'Ln'}</th>
                          <th className="ps-th-name">Athlete</th>
                          <th style={{ width: 90, textAlign: 'left' }}>Team</th>
                          <th className="ps-th-seed">Seed</th>
                          {isField ? (
                            <>
                              <th className="ps-th-att">1st</th>
                              <th className="ps-th-att">2nd</th>
                              <th className="ps-th-att">3rd</th>
                              <th className="ps-th-att">4th</th>
                              <th className="ps-th-att">5th</th>
                              <th className="ps-th-att">6th</th>
                              <th className="ps-th-best">Best</th>
                            </>
                          ) : (
                            <>
                              <th style={{ width: 68 }}>Time</th>
                              {showWind && <th style={{ width: 44 }}>Wind</th>}
                              <th style={{ width: 28 }}>Pl</th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((en, i) => (
                          <tr key={en.id} className={i % 2 === 1 ? 'ps-row-shade' : ''}>
                            <td className="ps-td-place">{en.lane || '—'}</td>
                            <td className="ps-td-name">{en.last_name}, {en.first_name}</td>
                            <td style={{ padding: '5px 6px', fontSize: '9pt', color: '#555' }}>
                              {en.team || '—'}
                            </td>
                            <td className="ps-td-center">{en.seed_mark || '—'}</td>
                            {isField
                              ? [0,1,2,3,4,5,6].map(n => <td key={n} className="hs-write-in" />)
                              : <>
                                  <td className="hs-write-in" />
                                  {showWind && <td className="hs-write-in" />}
                                  <td className="hs-write-in" />
                                </>
                            }
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}

                {unseeded.length > 0 && (
                  <div style={{ marginTop: heats.length > 0 ? 12 : 0 }}>
                    <div className="hs-heat-label" style={{ color: '#aaa', borderBottomStyle: 'dashed' }}>
                      Not Yet Seeded
                    </div>
                    <table className="ps-table">
                      <thead>
                        <tr>
                          <th className="ps-th-name">Athlete</th>
                          <th style={{ width: 90, textAlign: 'left' }}>Team</th>
                          <th className="ps-th-seed">Seed</th>
                        </tr>
                      </thead>
                      <tbody>
                        {unseeded.map((en, i) => (
                          <tr key={en.id} className={i % 2 === 1 ? 'ps-row-shade' : ''}>
                            <td className="ps-td-name">{en.last_name}, {en.first_name}</td>
                            <td style={{ padding: '5px 6px', fontSize: '9pt', color: '#555' }}>{en.team || '—'}</td>
                            <td className="ps-td-center">{en.seed_mark || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {heats.length === 0 && unseeded.length === 0 && (
                  <p style={{ color: '#aaa', fontSize: '9pt', fontStyle: 'italic' }}>No active entries.</p>
                )}

                <div className="ps-footer">
                  Event {idx + 1} of {activeEvents.length}
                  {' · '}Generated {new Date().toLocaleDateString('en-US')}
                  {' · '}Pegasus Track Management
                </div>
              </div>
            )
          })
        )}
        </div>
      </div>
    </div>
  )
}

// ─── Award Label Renderer ─────────────────────────────────
function LabelContent({ lbl, variant, includeMark, meetDateStr }) {
  const { place, firstName, lastName, eventName, gender, ageGroup, mark, meetName } = lbl
  const ordinal    = `${place}${PLACE_SUFFIX[place] || 'TH'}`
  const placeColor = PLACE_MEDAL[place] || '#374151'
  const gStr       = gender === 'M' ? 'Boys' : gender === 'F' ? 'Girls' : 'Mixed'
  const eventLine  = [gStr, eventName, ageGroup].filter(Boolean).join(' · ')

  if (variant === 'sm') {
    return (
      <div className="al-label al-label-sm">
        <div className="al-sm-place" style={{ color: placeColor }}>{ordinal} PLACE · {eventLine}</div>
        <div className="al-sm-name">{lastName}, {firstName}</div>
        {includeMark && mark && <div className="al-sm-mark">{mark}</div>}
        <div className="al-sm-bottom">{meetName} · {meetDateStr}</div>
      </div>
    )
  }

  if (variant === 'wide-sm') {
    return (
      <div className="al-label al-label-wide-sm">
        {/* Speed-wings watermark (Hamilton-inspired) — top-center, behind content */}
        <svg className="al-wsm-watermark" viewBox="0 0 200 80" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          {/* Central diamond */}
          <path d="M100 28 L112 40 L100 52 L88 40 Z"/>
          {/* Left upper blade — sweeps up and back */}
          <path d="M91 37 Q68 22 38 14 Q20 9 4 12 Q24 20 52 28 Q74 33 91 37 Z"/>
          {/* Left lower blade — sweeps down and back */}
          <path d="M91 43 Q66 50 36 57 Q18 61 2 58 Q22 52 50 46 Q72 43 91 43 Z"/>
          {/* Right upper blade — mirror */}
          <path d="M109 37 Q132 22 162 14 Q180 9 196 12 Q176 20 148 28 Q126 33 109 37 Z"/>
          {/* Right lower blade — mirror */}
          <path d="M109 43 Q134 50 164 57 Q182 61 198 58 Q178 52 150 46 Q128 43 109 43 Z"/>
        </svg>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
          <span className="al-wsm-place" style={{ color: placeColor }}>{ordinal} PLACE</span>
          <span className="al-wsm-name">{lastName}, {firstName}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
          <span className="al-wsm-event">{eventLine}</span>
          <span style={{ display: 'flex', gap: 5, alignItems: 'baseline', flexShrink: 0 }}>
            {includeMark && mark && <span className="al-wsm-mark">{mark}</span>}
            <span className="al-wsm-meta">{meetName} · {meetDateStr}</span>
          </span>
        </div>
      </div>
    )
  }

  if (variant === 'tall') {
    return (
      <div className="al-label al-label-tall">
        <div className="al-tall-header">
          <div className="al-tall-club">Pegasus Track</div>
          <div className="al-tall-meet">{meetName}</div>
          <div className="al-tall-meet">{meetDateStr}</div>
        </div>
        <div className="al-tall-rule" />
        <div className="al-tall-center">
          <div className="al-tall-place" style={{ color: placeColor }}>{ordinal}</div>
          <div className="al-tall-place-sub">PLACE</div>
        </div>
        <div className="al-tall-rule" />
        <div>
          <div className="al-tall-name">{lastName}, {firstName}</div>
          <div className="al-tall-event">{eventLine}</div>
          {includeMark && mark && <div className="al-tall-mark" style={{ color: placeColor }}>{mark}</div>}
        </div>
      </div>
    )
  }

  // Default: large landscape (lg) — used for avery5163 and thermal4x2
  return (
    <div className="al-label al-label-lg">
      <div className="al-row-top">
        <span className="al-club">Pegasus Track</span>
        <span className="al-meet">{meetName}<br />{meetDateStr}</span>
      </div>
      <div className="al-rule" />
      <div className="al-place" style={{ color: placeColor }}>{ordinal} PLACE</div>
      <div className="al-name">{lastName}, {firstName}</div>
      <div className="al-event">{eventLine}</div>
      {includeMark && mark && <div className="al-mark-standalone">{mark}</div>}
    </div>
  )
}

// ─── Print Award Labels Modal ─────────────────────────────
// ─── Per-event Heat Sheet Modal ───────────────────────────
function PrintEventHeatSheetModal({ meet, eventDetail, onClose }) {
  const isField  = eventDetail.category === 'field' || eventDetail.category === 'combined'
  const showWind = eventDetail.category === 'track'  || eventDetail.category === 'relay'

  const meetDate = meet.date
    ? new Date(meet.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    : ''

  const nonScr = (eventDetail.entries ?? []).filter(en => !en.scratched)

  const seeded   = nonScr.filter(en => en.heat)
  const unseeded = nonScr.filter(en => !en.heat)
  const heatMap  = {}
  for (const en of seeded) {
    if (!heatMap[en.heat]) heatMap[en.heat] = []
    heatMap[en.heat].push(en)
  }
  const heats = Object.entries(heatMap)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([h, rows]) => ({ heat: Number(h), rows: rows.sort((a, b) => (a.lane ?? 99) - (b.lane ?? 99)) }))

  const eventTitle = [
    eventDetail.event_name.toUpperCase(),
    eventDetail.gender === 'M' ? 'BOYS' : eventDetail.gender === 'F' ? 'GIRLS' : 'MIXED',
    eventDetail.age_group || null,
    (eventDetail.round || 'FINAL').toUpperCase(),
  ].filter(Boolean).join(' · ')

  const heatLabel = isField ? 'Flight' : 'Heat'

  return (
    <div className="print-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="print-preview-container">
        <div className="print-toolbar no-print">
          <span style={{ fontWeight: 600, fontSize: 14 }}>{eventDetail.event_name} — Heat Sheet</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" onClick={() => window.print()}>🖨 Print / Save PDF</button>
            <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={15} /></button>
          </div>
        </div>

        <div className="print-sheet">
          <div className="ps-header">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div className="ps-club-name">PEGASUS TRACK</div>
                <div className="ps-meet-name">{meet.name}</div>
              </div>
              <div style={{ textAlign: 'right', fontSize: 11, color: '#555' }}>{meetDate}</div>
            </div>
            <div className="ps-divider" />
            <div className="ps-event-title">{eventTitle}</div>
          </div>

          {nonScr.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#888', padding: '40px 0' }}>No entries for this event.</p>
          ) : (
            <>
              {heats.map(({ heat, rows }) => (
                <div key={heat} className="ps-heat-block">
                  <div className="ps-heat-label">{heatLabel} {heat}</div>
                  <table className="ps-table">
                    <thead>
                      <tr>
                        {!isField && <th style={{ width: 36 }}>Lane</th>}
                        {isField  && <th style={{ width: 36 }}>Pos</th>}
                        <th style={{ width: 32 }}>#</th>
                        <th>Athlete</th>
                        <th>Team</th>
                        <th style={{ width: 70 }}>Seed</th>
                        <th style={{ width: 70 }}>{isField ? 'Mark' : 'Time'}</th>
                        {showWind && <th style={{ width: 50 }}>Wind</th>}
                        <th style={{ width: 50 }}>Place</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((en, i) => (
                        <tr key={en.id ?? i}>
                          <td style={{ textAlign: 'center' }}>{en.lane ?? '—'}</td>
                          <td style={{ textAlign: 'center' }}>{en.athlete_number ?? '—'}</td>
                          <td>{en.last_name}, {en.first_name}</td>
                          <td>{en.team ?? '—'}</td>
                          <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{en.seed_mark ?? ''}</td>
                          <td />
                          {showWind && <td />}
                          <td />
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
              {unseeded.length > 0 && (
                <div className="ps-heat-block">
                  <div className="ps-heat-label">Unseeded</div>
                  <table className="ps-table">
                    <thead>
                      <tr>
                        <th style={{ width: 32 }}>#</th>
                        <th>Athlete</th>
                        <th>Team</th>
                        <th style={{ width: 70 }}>Seed</th>
                        <th style={{ width: 70 }}>{isField ? 'Mark' : 'Time'}</th>
                        {showWind && <th style={{ width: 50 }}>Wind</th>}
                        <th style={{ width: 50 }}>Place</th>
                      </tr>
                    </thead>
                    <tbody>
                      {unseeded.map((en, i) => (
                        <tr key={en.id ?? i}>
                          <td style={{ textAlign: 'center' }}>{en.athlete_number ?? '—'}</td>
                          <td>{en.last_name}, {en.first_name}</td>
                          <td>{en.team ?? '—'}</td>
                          <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{en.seed_mark ?? ''}</td>
                          <td />
                          {showWind && <td />}
                          <td />
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function PrintAwardLabelsModal({ meet, eventsData, onClose, initialSelectedIds }) {
  const [formatId,    setFormatId]    = useState('thermal1x4')
  const [maxPlace,    setMaxPlace]    = useState(8)
  const [includeMark, setIncludeMark] = useState(true)
  const [localData,   setLocalData]   = useState(eventsData)
  const [selectedIds, setSelectedIds] = useState(() =>
    initialSelectedIds ?? new Set(eventsData.filter(ev => ev.entries?.some(en => en.place)).map(ev => ev.id))
  )
  const previewRef = useRef(null)

  const fmt = LABEL_FORMATS.find(f => f.id === formatId)

  const meetDateStr = meet.date
    ? new Date(meet.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : ''

  const labels = useMemo(() => {
    const out = []
    for (const ev of localData) {
      if (!selectedIds.has(ev.id)) continue
      const placed = (ev.entries ?? [])
        .filter(en => en.place && en.place <= maxPlace && !en.scratched && !en.disqualified && !en.did_not_start && !en.did_not_finish)
        .sort((a, b) => a.place - b.place)
      for (const en of placed) {
        out.push({ place: en.place, firstName: en.first_name, lastName: en.last_name,
          eventName: ev.event_name, gender: ev.gender, ageGroup: ev.age_group,
          mark: en.mark, meetName: meet.name, meetDate: meet.date })
      }
    }
    return out
  }, [localData, selectedIds, maxPlace, meet])

  const handlePrint = () => {
    if (labels.length === 0) {
      alert('No labels to print yet.\n\nScore your events first using the ⚡ Score button on each event card, then come back here.')
      return
    }
    if (!fmt.isSheet && fmt.pageSize) {
      const [pageW, pageH] = fmt.pageSize.split(' ')

      const toMicrons = (s) => {
        const m = s.match(/^([0-9.]+)(in|mm|cm)$/)
        if (!m) return 0
        const v = parseFloat(m[1])
        if (m[2] === 'in') return Math.round(v * 25400)
        if (m[2] === 'mm') return Math.round(v * 1000)
        if (m[2] === 'cm') return Math.round(v * 10000)
        return 0
      }

      const widthMicrons  = toMicrons(pageW)
      const heightMicrons = toMicrons(pageH)

      if (api.printThermal && widthMicrons && heightMicrons) {
        // Collect .al-* rules only — exclude @media blocks (they carry
        // "body * { visibility: hidden }" which blanks the print window)
        // and @font-face (relative URLs break in a new window context).
        const css = Array.from(document.styleSheets).flatMap(sheet => {
          try { return Array.from(sheet.cssRules).map(r => r.cssText) }
          catch { return [] }
        }).filter(t => t.includes('.al-') && !t.trimStart().startsWith('@media') && !t.trimStart().startsWith('@font-face')).join('\n')

        // Flatten label elements with page breaks as inline styles
        const tmp = document.createElement('div')
        tmp.innerHTML = previewRef.current?.innerHTML ?? ''
        const html = Array.from(tmp.querySelectorAll('.al-label')).map((el, i) => {
          if (i > 0) el.style.pageBreakBefore = 'always'
          return el.outerHTML
        }).join('\n')

        api.printThermal({ html, css, widthMicrons, heightMicrons })
          .then(r => { if (r && !r.success) alert(`Print failed: ${r.reason}`) })
          .catch(err => alert(`Print error: ${err?.message ?? err}`))
      } else {
        // Browser fallback (dev mode without Electron)
        const root = Object.assign(document.createElement('div'), { id: 'al-print-root' })
        const tmp  = document.createElement('div')
        tmp.innerHTML = previewRef.current?.innerHTML ?? ''
        Array.from(tmp.querySelectorAll('.al-label')).forEach((el, i) => {
          if (i > 0) el.style.pageBreakBefore = 'always'
          root.appendChild(el)
        })
        const styleEl = Object.assign(document.createElement('style'), {
          id: 'al-pagesize',
          textContent: `@media print { @page { size: ${fmt.pageSize}; margin: 0; } body > *:not(#al-print-root) { display: none !important; } #al-print-root, #al-print-root * { visibility: visible !important; } #al-print-root * { color: #000 !important; } #al-print-root .al-label { width: ${pageW} !important; height: ${pageH} !important; } }`,
        })
        document.body.appendChild(root)
        document.head.appendChild(styleEl)
        requestAnimationFrame(() => { window.print(); setTimeout(() => { root.remove(); styleEl.remove() }, 1000) })
      }
    } else {
      window.print()
    }
  }

  const [scoring, setScoring] = useState(false)

  const handleScoreAll = async () => {
    setScoring(true)
    try {
      for (const ev of localData) {
        if ((ev.entries ?? []).some(en => !en.scratched && en.mark)) await api.autoRank(ev.id)
      }
      const refreshed = await Promise.all(localData.map(ev => api.getMeetEventEntries(ev.id)))
      const updated = refreshed.filter(Boolean)
      setLocalData(updated)
      setSelectedIds(new Set(updated.filter(ev => ev.entries?.some(en => en.place)).map(ev => ev.id)))
    } finally {
      setScoring(false)
    }
  }

  const eventsWithResults = localData.filter(ev => ev.entries?.some(en => en.place))

  const printContent = () => {
    if (labels.length === 0) {
      return (
        <div style={{ background: 'white', padding: '32px', textAlign: 'center' }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
            No placed athletes yet
          </div>
          <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 20 }}>
            Events need to be ranked before labels can be printed.
          </div>
          <button className="btn btn-primary" onClick={handleScoreAll} disabled={scoring}
            style={{ fontSize: 13 }}>
            {scoring ? '⏳ Scoring…' : '⚡ Score All Events Now'}
          </button>
        </div>
      )
    }

    if (!fmt.isSheet) {
      return labels.map((lbl, i) => (
        <div key={i} className="al-label-page al-thermal-wrap"
          style={{ pageBreakAfter: i < labels.length - 1 ? 'always' : 'auto' }}>
          <LabelContent lbl={lbl} variant={fmt.labelVariant} includeMark={includeMark} meetDateStr={meetDateStr} />
        </div>
      ))
    }

    const chunks = []
    for (let i = 0; i < labels.length; i += fmt.perSheet) chunks.push(labels.slice(i, i + fmt.perSheet))
    return chunks.map((chunk, ci) => (
      <div key={ci} className={`${fmt.sheetClass} al-sheet-break`}
        style={{ pageBreakAfter: ci < chunks.length - 1 ? 'always' : 'auto' }}>
        {chunk.map((lbl, i) => (
          <LabelContent key={i} lbl={lbl} variant={fmt.labelVariant} includeMark={includeMark} meetDateStr={meetDateStr} />
        ))}
        {Array(fmt.perSheet - chunk.length).fill(null).map((_, i) => (
          <div key={`e${i}`} className="al-label al-label-empty" />
        ))}
      </div>
    ))
  }

  return (
    <div className="print-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="print-preview-container">

        {/* Config toolbar */}
        <div className="print-toolbar no-print"
          style={{ height:'auto', padding:'12px 20px', flexWrap:'wrap', gap:14, alignItems:'flex-end' }}>
          <span style={{ fontWeight:600, fontSize:14, alignSelf:'center', marginRight:4 }}>🏷 Award Labels</span>

          <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
            <span style={{ fontSize:10, fontWeight:600, letterSpacing:'0.08em', textTransform:'uppercase', color:'#aaa' }}>Format</span>
            <select className="input" style={{ fontSize:12, padding:'4px 8px', minWidth:220 }}
              value={formatId} onChange={e => setFormatId(e.target.value)}>
              {LABEL_FORMATS.map(f => <option key={f.id} value={f.id}>{f.label} ({f.sub})</option>)}
            </select>
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
            <span style={{ fontSize:10, fontWeight:600, letterSpacing:'0.08em', textTransform:'uppercase', color:'#aaa' }}>Award Places</span>
            <select className="input" style={{ fontSize:12, padding:'4px 8px', width:110 }}
              value={maxPlace} onChange={e => setMaxPlace(Number(e.target.value))}>
              <option value={1}>1st only</option>
              <option value={3}>Top 3</option>
              <option value={5}>Top 5</option>
              <option value={8}>Top 8</option>
            </select>
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
            <span style={{ fontSize:10, fontWeight:600, letterSpacing:'0.08em', textTransform:'uppercase', color:'#aaa' }}>Performance</span>
            <div style={{ display:'flex', gap:4 }}>
              {[true,false].map(v => (
                <button key={String(v)} className={`btn ${includeMark===v ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ fontSize:11, padding:'4px 12px' }}
                  onClick={() => setIncludeMark(v)}>
                  {v ? 'Include' : 'Omit'}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:12, color:'#999' }}>{labels.length} label{labels.length!==1?'s':''}</span>
            <button className="btn btn-primary" onClick={handlePrint}>
              🖨 Print Labels
            </button>
            <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={15} /></button>
          </div>
        </div>

        {/* Event filter */}
        {eventsWithResults.length > 1 && (
          <div className="no-print" style={{
            padding:'8px 20px', display:'flex', gap:6, flexWrap:'wrap',
            background:'rgba(0,0,0,0.3)', borderBottom:'1px solid rgba(255,255,255,0.08)',
          }}>
            <span style={{ fontSize:11, color:'#aaa', alignSelf:'center', marginRight:4 }}>Events:</span>
            <button className="btn btn-ghost" style={{ fontSize:10, padding:'2px 7px' }}
              onClick={() => setSelectedIds(new Set(eventsWithResults.map(e => e.id)))}>All</button>
            <button className="btn btn-ghost" style={{ fontSize:10, padding:'2px 7px' }}
              onClick={() => setSelectedIds(new Set())}>None</button>
            {eventsWithResults.map(ev => {
              const on = selectedIds.has(ev.id)
              const g  = ev.gender==='M' ? 'B' : ev.gender==='F' ? 'G' : 'M'
              return (
                <button key={ev.id} className={`btn ${on ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ fontSize:10, padding:'2px 8px' }}
                  onClick={() => setSelectedIds(s => { const n=new Set(s); n.has(ev.id)?n.delete(ev.id):n.add(ev.id); return n })}>
                  {g} {ev.event_name}{ev.age_group ? ` ${ev.age_group}` : ''}
                </button>
              )
            })}</div>
        )}

        {/* Printable label content */}
        <div className="award-labels-print-wrap">
          <div className="award-labels-preview" ref={previewRef}>
            {printContent()}
          </div>
        </div>

      </div>
    </div>
  )
}

// ─── Print Full Meet Modal ────────────────────────────────
function PrintMeetModal({ meet, eventsData: initData, onClose }) {
  const printRef = useRef(null)
  const [eventsData, setEventsData] = useState(initData)
  const [loading,    setLoading]    = useState(true)

  useEffect(() => {
    if (!(meet.events?.length > 0)) { setLoading(false); return }
    Promise.all(meet.events.map(ev => api.getMeetEventEntries(ev.id)))
      .then(data => { setEventsData(data.filter(Boolean)); setLoading(false) })
      .catch(() => setLoading(false))
  }, [meet.events])

  const meetDate = new Date(meet.date + 'T00:00:00')
    .toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  const isFoul = (v) => v && ['F','X','P','NH'].includes(String(v).trim().toUpperCase())
  const parseAttempts = (json) => {
    const a = json ? (() => { try { return JSON.parse(json) } catch { return [] } })() : []
    while (a.length < 6) a.push('')
    return a.slice(0, 6)
  }

  // Only events that have entries
  const events = eventsData.filter(ev => (ev.entries?.length ?? 0) > 0)

  if (loading) return (
    <div className="print-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="print-preview-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="loading-spinner" />
      </div>
    </div>
  )

  return (
    <div className="print-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="print-preview-container">
        {/* Toolbar */}
        <div className="print-toolbar no-print">
          <span style={{ fontWeight: 600, fontSize: 14 }}>Full Meet Results — Print Preview</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" onClick={() => printSheetHtml(printRef)}>🖨 Print / Save PDF</button>
            <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={15} /></button>
          </div>
        </div>

        <div ref={printRef}>
        {events.length === 0 ? (
          <div className="print-sheet">
            <div className="ps-header">
              <div className="ps-club-name">PEGASUS TRACK</div>
              <div className="ps-meet-name">{meet.name}</div>
              <div className="ps-divider" />
            </div>
            <p style={{ textAlign: 'center', color: '#888', padding: '40px 0', fontSize: 14 }}>
              No events with entries to print.
            </p>
          </div>
        ) : (
          events.map((ev, idx) => {
            const isField  = ev.category === 'field' || ev.category === 'combined'
            const showWind = ev.category === 'track'  || ev.category === 'relay'
            const isLast   = idx === events.length - 1

            const sorted = [...(ev.entries ?? [])].sort((a, b) => {
              const pa = a.place, pb = b.place
              if (pa && pb) return pa - pb
              if (pa) return -1
              if (pb) return 1
              return 0
            })

            const eventTitle = [
              ev.event_name.toUpperCase(),
              ev.gender === 'M' ? 'BOYS' : ev.gender === 'F' ? 'GIRLS' : 'MIXED',
              ev.age_group || null,
              (ev.round || 'FINAL').toUpperCase(),
            ].filter(Boolean).join(' · ')

            return (
              <div key={ev.id} className="print-sheet"
                style={{ marginBottom: isLast ? 0 : 24, pageBreakAfter: isLast ? 'auto' : 'always' }}>
                {/* Header */}
                <div className="ps-header">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div className="ps-club-name">PEGASUS TRACK</div>
                      <div className="ps-meet-name">{meet.name}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className="ps-meet-date">{meetDate}</div>
                      {meet.location && <div className="ps-meet-location">{meet.location}</div>}
                    </div>
                  </div>
                  <div className="ps-divider" />
                  <div className="ps-event-title">{eventTitle}</div>
                </div>

                {/* Table */}
                <table className="ps-table">
                  <thead>
                    <tr>
                      <th className="ps-th-place">Pl</th>
                      <th className="ps-th-name">Athlete</th>
                      <th className="ps-th-seed">Seed</th>
                      {isField ? (
                        <>
                          <th className="ps-th-att">1st</th>
                          <th className="ps-th-att">2nd</th>
                          <th className="ps-th-att">3rd</th>
                          <th className="ps-th-att">4th</th>
                          <th className="ps-th-att">5th</th>
                          <th className="ps-th-att">6th</th>
                          <th className="ps-th-best">Best</th>
                        </>
                      ) : (
                        <>
                          <th className="ps-th-mark">Time</th>
                          {showWind && <th className="ps-th-wind">Wind</th>}
                        </>
                      )}
                      <th style={{ width: 34, textAlign: 'center', fontSize: 9,
                        color: '#666', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((en, i) => {
                      const status = en.scratched      ? 'SCR'
                        : en.did_not_start  ? 'DNS'
                        : en.did_not_finish ? 'DNF'
                        : en.disqualified   ? 'DQ'
                        : null
                      const attempts = isField ? parseAttempts(en.attempts_json) : []
                      const pts = (!status && en.place) ? (SCORE_TABLE[en.place] ?? null) : null
                      const shade = i % 2 === 1 ? 'ps-row-shade' : ''

                      return (
                        <tr key={en.id} className={shade}>
                          <td className="ps-td-place">{status || (en.place ? en.place : '—')}</td>
                          <td className="ps-td-name">
                            {en.last_name}, {en.first_name}
                            {en.is_pr && <span className="ps-pr"> ★ PR</span>}
                          </td>
                          <td className="ps-td-center">{en.seed_mark || '—'}</td>
                          {isField ? (
                            <>
                              {attempts.map((att, ai) => (
                                <td key={ai} className={`ps-td-center${isFoul(att) ? ' ps-foul' : ''}`}>
                                  {att || '—'}
                                </td>
                              ))}
                              <td className="ps-td-best">{status || en.mark || '—'}</td>
                            </>
                          ) : (
                            <>
                              <td className="ps-td-mark">{status || en.mark || '—'}</td>
                              {showWind && <td className="ps-td-center">{en.wind || '—'}</td>}
                            </>
                          )}
                          <td style={{ textAlign: 'center', fontFamily: 'monospace', fontSize: 11 }}>
                            {pts ?? '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>

                <div className="ps-footer">
                  Event {idx + 1} of {events.length}
                  {' · '}Generated {new Date().toLocaleDateString('en-US')}
                  {' · '}Pegasus Track Management
                  {' · '}★ = Personal Record
                </div>
              </div>
            )
          })
        )}
        </div>
      </div>
    </div>
  )
}

// ─── Print Results Modal ──────────────────────────────────
function PrintResultsModal({ meet, event, entries, results, onClose }) {
  const printRef = useRef(null)
  const isField  = event.category === 'field' || event.category === 'combined'
  const showWind = event.category === 'track'  || event.category === 'relay'

  const sorted = [...entries].sort((a, b) => {
    const pa = results[a.id]?.place, pb = results[b.id]?.place
    if (pa && pb) return pa - pb
    if (pa) return -1
    if (pb) return 1
    return 0
  })

  const parseAttempts = (json) => {
    const a = json ? (() => { try { return JSON.parse(json) } catch { return [] } })() : []
    while (a.length < 6) a.push('')
    return a.slice(0, 6)
  }

  const isFoul = (v) => v && ['F','X','P','NH'].includes(String(v).trim().toUpperCase())

  const meetDate = new Date(meet.date + 'T00:00:00')
    .toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  const eventTitle = [
    event.event_name.toUpperCase(),
    event.gender === 'M' ? 'BOYS' : event.gender === 'F' ? 'GIRLS' : 'MIXED',
    event.age_group || null,
    (event.round || 'FINAL').toUpperCase(),
  ].filter(Boolean).join(' · ')

  return (
    <div className="print-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="print-preview-container">
        {/* Screen-only toolbar */}
        <div className="print-toolbar no-print">
          <span style={{ fontWeight: 600, fontSize: 14 }}>Print Preview</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" onClick={() => printSheetHtml(printRef)}>🖨 Print / Save PDF</button>
            <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={15} /></button>
          </div>
        </div>

        {/* 8.5×11 sheet */}
        <div ref={printRef}><div className="print-sheet">
          {/* Club + meet header */}
          <div className="ps-header">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div className="ps-club-name">PEGASUS TRACK</div>
                <div className="ps-meet-name">{meet.name}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="ps-meet-date">{meetDate}</div>
                {meet.location && <div className="ps-meet-location">{meet.location}</div>}
              </div>
            </div>
            <div className="ps-divider" />
            <div className="ps-event-title">{eventTitle}</div>
          </div>

          {/* Results table */}
          <table className="ps-table">
            <thead>
              <tr>
                <th className="ps-th-place">Pl</th>
                <th className="ps-th-name">Athlete</th>
                <th className="ps-th-seed">Seed</th>
                {isField ? (
                  <>
                    <th className="ps-th-att">1st</th>
                    <th className="ps-th-att">2nd</th>
                    <th className="ps-th-att">3rd</th>
                    <th className="ps-th-att">4th</th>
                    <th className="ps-th-att">5th</th>
                    <th className="ps-th-att">6th</th>
                    <th className="ps-th-best">Best</th>
                  </>
                ) : (
                  <>
                    <th className="ps-th-mark">Time</th>
                    {showWind && <th className="ps-th-wind">Wind</th>}
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {sorted.map((en, i) => {
                const r = results[en.id] ?? {}
                const status = en.scratched ? 'SCR'
                  : r.did_not_start  ? 'DNS'
                  : r.did_not_finish ? 'DNF'
                  : r.disqualified   ? 'DQ'
                  : null
                const attempts = isField ? parseAttempts(r.attempts_json) : []
                const shade = i % 2 === 1 ? 'ps-row-shade' : ''

                return (
                  <tr key={en.id} className={shade}>
                    <td className="ps-td-place">
                      {status || (r.place ? r.place : '—')}
                    </td>
                    <td className="ps-td-name">
                      {en.last_name}, {en.first_name}
                      {r.is_pr && <span className="ps-pr"> ★ PR</span>}
                    </td>
                    <td className="ps-td-center">{r.seed_mark || en.seed_mark || '—'}</td>
                    {isField ? (
                      <>
                        {attempts.map((att, ai) => (
                          <td key={ai} className={`ps-td-center${isFoul(att) ? ' ps-foul' : ''}`}>
                            {att || '—'}
                          </td>
                        ))}
                        <td className="ps-td-best">{status || r.mark || '—'}</td>
                      </>
                    ) : (
                      <>
                        <td className="ps-td-mark">{status || r.mark || '—'}</td>
                        {showWind && <td className="ps-td-center">{r.wind || '—'}</td>}
                      </>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>

          <div className="ps-footer">
            Generated {new Date().toLocaleDateString('en-US')} · Pegasus Track Management
            {' · '}★ = Personal Record
          </div>
        </div></div>
      </div>
    </div>
  )
}

// ─── Field Attempt Grid ───────────────────────────────────
const ATTEMPT_LABELS = ['1st', '2nd', '3rd', '4th', '5th', '6th']

function FieldAttempts({ attemptsJson, category, disabled, onChange }) {
  const parse = (json) => {
    const a = json ? (() => { try { return JSON.parse(json) } catch { return [] } })() : []
    while (a.length < 6) a.push('')
    return a.slice(0, 6)
  }
  const [vals, setVals] = useState(() => parse(attemptsJson))

  // Sync if parent reloads
  useEffect(() => { setVals(parse(attemptsJson)) }, [attemptsJson])

  const computeBest = (arr) => {
    const isField = category === 'field' || category === 'combined'
    let best = null, bestVal = isField ? -Infinity : Infinity
    for (const a of arr) {
      if (!a || !a.trim() || ['F','X','P','NH'].includes(a.trim().toUpperCase())) continue
      let v
      if (a.includes('-')) { const [ft, inch] = a.split('-'); v = parseFloat(ft) * 12 + parseFloat(inch || 0) }
      else v = parseFloat(a)
      if (isNaN(v)) continue
      if (isField ? v > bestVal : v < bestVal) { bestVal = v; best = a }
    }
    return best
  }

  const handleChange = (i, v) => {
    const next = [...vals]; next[i] = v; setVals(next)
  }
  const handleBlur = () => {
    onChange(JSON.stringify(vals), computeBest(vals))
  }

  const best = computeBest(vals)
  const isFoul = (v) => v && ['F','X','P','NH'].includes(v.trim().toUpperCase())

  return (
    <div style={{ flex: 1 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px 8px', marginBottom: 6 }}>
        {vals.map((v, i) => (
          <div key={i}>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 2 }}>{ATTEMPT_LABELS[i]}</div>
            <input
              className={`results-mark-input${isFoul(v) ? ' foul' : ''}`}
              style={{ width: '100%', fontSize: 11 }}
              value={v}
              disabled={disabled}
              placeholder="—"
              onChange={e => handleChange(i, e.target.value)}
              onBlur={handleBlur}
            />
          </div>
        ))}
      </div>
      <div style={{ fontSize: 11, color: best ? 'var(--accent)' : 'var(--text-muted)', fontWeight: best ? 600 : 400 }}>
        Best: {best ?? '—'}
      </div>
    </div>
  )
}


function StatusToggle({ label, active, onToggle, disabled }) {
  return (
    <button
      className={`meets-status-toggle${active ? ' on' : ''}`}
      style={{ width: 42 }}
      onClick={onToggle}
      disabled={disabled}
      title={label}
    >
      {label}
    </button>
  )
}

// ─── Meet Detail ──────────────────────────────────────────
function MeetDetail({ meet, onBack, onMeetUpdated }) {
  const [meetDetail, setMeetDetail] = useState(null)
  const [tfEvents,   setTfEvents]   = useState([])
  const [tab,        setTab]        = useState('events')
  const [loading,    setLoading]    = useState(true)
  const [editingMeet,   setEditingMeet]   = useState(false)
  const [showHeatSheet, setShowHeatSheet] = useState(false)
  const [seasons,       setSeasons]       = useState([])

  const loadDetail = useCallback(() => {
    api.getMeetDetail(meet.id)
      .then(d => { setMeetDetail(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [meet.id])

  useEffect(() => {
    loadDetail()
    if (window.electronAPI) {
      api.getTfEvents().then(setTfEvents)
      api.getSeasons().then(setSeasons)
    } else {
      setTfEvents(STATIC_TF_EVENTS)
    }
  }, [loadDetail])

  const [scoringState, setScoringState] = useState({ any: false, all: false })

  const handleStatusChange = async (status) => {
    const updated = await api.updateMeet(meet.id, { ...meet, status })
    onMeetUpdated(updated)
    setMeetDetail(d => ({ ...d, status }))
  }

  const handleScoringChange = async ({ any: anyScored, all: allScored }) => {
    setScoringState({ any: anyScored, all: allScored })
    const current = meetDetail?.status
    let next = null
    if (allScored && current === 'in_progress') next = 'completed'
    else if (anyScored && !allScored && current === 'active') next = 'in_progress'
    if (next) {
      const updated = await api.updateMeet(meet.id, { ...meet, status: next })
      onMeetUpdated(updated)
      setMeetDetail(d => ({ ...d, status: next }))
    }
  }

  const handleEventAdded = (ev) => {
    setMeetDetail(d => ({ ...d, events: [...d.events, ev] }))
  }

  const handleEventRemoved = async (meetEventId) => {
    await api.removeMeetEvent(meetEventId)
    setMeetDetail(d => ({ ...d, events: d.events.filter(e => e.id !== meetEventId) }))
  }

  if (loading) return <div className="loading-container"><div className="loading-spinner" /></div>
  if (!meetDetail) return <div className="empty-state"><p style={{ fontSize: 14 }}>Meet not found.</p></div>

  const d   = new Date(meetDetail.date + 'T00:00:00')
  const sc  = STATUS_CFG[meetDetail.status] ?? STATUS_CFG.upcoming
  const nextStatuses = {
    upcoming:    ['active', 'cancelled'],
    active:      ['in_progress', 'completed', 'upcoming'],
    in_progress: ['completed', 'active'],
    completed:   ['active'],
    cancelled:   ['upcoming'],
  }

  return (
    <div className="meets-page">
      {/* Back + header */}
      <div className="page-header">
        <div>
          <button className="meets-back-btn" onClick={onBack}>
            <ChevronLeft size={14} /> All Meets
          </button>
          <div className="page-title">{meetDetail.name}</div>
          <div className="page-subtitle" style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Calendar size={12} />
              {d.toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })}
            </span>
            {meetDetail.location && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <MapPin size={12} /> {meetDetail.location}
              </span>
            )}
            <span className={`badge ${sc.badge}`}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: sc.dot, marginRight: 4 }} />
              {sc.label}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          {nextStatuses[meetDetail.status]?.map(s => (
            <button key={s} className="btn btn-ghost" style={{ fontSize: 12 }}
              onClick={() => handleStatusChange(s)}>
              {s === 'active'      ? <Play        size={13} /> :
               s === 'in_progress' ? null :
               s === 'completed'   ? <CheckCircle size={13} /> : null}
              Mark {STATUS_CFG[s].label}
            </button>
          ))}
          <button className="btn btn-ghost" style={{ fontSize: 12 }}
            onClick={() => setShowHeatSheet(true)} title="Print heat sheets">
            🖨 Heat Sheets
          </button>
          <button className="btn btn-ghost btn-icon" onClick={() => setEditingMeet(true)} title="Edit meet">
            <Edit2 size={14} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="meets-tabs">
        {[
          { key: 'events',    label: 'Events',           icon: List },
          { key: 'worksheet', label: 'Entries & Results', icon: Users },
          { key: 'results',   label: 'Results',           icon: Trophy },
        ].map(({ key, label, icon: Icon }) => (
          <button key={key} className={`meets-tab${tab === key ? ' active' : ''}`} onClick={() => setTab(key)}>
            <Icon size={13} /> {label}
            {key === 'events' && (
              <span className="badge badge-blue" style={{ fontSize: 10, padding: '0 5px', marginLeft: 4 }}>
                {meetDetail.events.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="meets-tab-body">
        {tab === 'events' && (
          <EventsTab
            meet={meetDetail} meetDetail={meetDetail} tfEvents={tfEvents}
            onEventAdded={handleEventAdded} onEventRemoved={handleEventRemoved}
          />
        )}
        {tab === 'worksheet' && (
          <WorksheetTab meet={meetDetail} meetDetail={meetDetail} />
        )}
        {tab === 'results' && (
          <ResultsTab meet={meetDetail} meetDetail={meetDetail} onScoringChange={handleScoringChange} />
        )}
      </div>

      {editingMeet && (
        <MeetModal
          meet={meetDetail}
          seasons={seasons}
          onSave={async (form) => {
            const updated = await api.updateMeet(meetDetail.id, { ...form, status: meetDetail.status })
            setMeetDetail(d => ({ ...d, ...updated }))
            onMeetUpdated(updated)
            setEditingMeet(false)
          }}
          onClose={() => setEditingMeet(false)}
        />
      )}

      {showHeatSheet && (
        <PrintHeatSheetModal
          meet={meetDetail}
          meetDetail={meetDetail}
          onClose={() => setShowHeatSheet(false)}
        />
      )}
    </div>
  )
}

// ─── Meets (main page) ────────────────────────────────────
export default function Meets() {
  const [meets,   setMeets]   = useState([])
  const [seasons, setSeasons] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [selectedMeet, setSelectedMeet] = useState(null)
  const [deleting, setDeleting] = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([api.getMeets(), api.getSeasons()])
      .then(([m, s]) => { setMeets(m); setSeasons(s); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  if (selectedMeet) {
    return (
      <MeetDetail
        meet={selectedMeet}
        onBack={() => { setSelectedMeet(null); load() }}
        onMeetUpdated={updated => setSelectedMeet(updated)}
      />
    )
  }

  const upcoming    = meets.filter(m => m.status === 'upcoming')
  const active      = meets.filter(m => m.status === 'active')
  const inProgress  = meets.filter(m => m.status === 'in_progress')
  const completed   = meets.filter(m => m.status === 'completed')
  const cancelled   = meets.filter(m => m.status === 'cancelled')

  return (
    <div className="meets-page">
      <div className="page-header">
        <div>
          <div className="page-title">MEETS</div>
          <div className="page-subtitle">
            {meets.length} meet{meets.length !== 1 ? 's' : ''}
            {active.length > 0 && ` · ${active.length} active`}
            {inProgress.length > 0 && ` · ${inProgress.length} in progress`}
            {upcoming.length > 0 && ` · ${upcoming.length} upcoming`}
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
          <Plus size={14} /> New Meet
        </button>
      </div>

      {loading ? (
        <div className="loading-container"><div className="loading-spinner" /></div>
      ) : meets.length === 0 ? (
        <div className="empty-state">
          <Calendar size={48} />
          <p>No meets yet. Create your first meet to get started.</p>
          <button className="btn btn-primary" style={{ marginTop: 8 }} onClick={() => setShowAdd(true)}>
            <Plus size={14} /> New Meet
          </button>
        </div>
      ) : (
        <div style={{ padding: '0 32px' }}>
          {active.length > 0 && <MeetSection label="Active" meets={active} onSelect={setSelectedMeet} onDelete={setDeleting} accent="green" />}
          {inProgress.length > 0 && <MeetSection label="In Progress" meets={inProgress} onSelect={setSelectedMeet} onDelete={setDeleting} accent="blue" />}
          {upcoming.length > 0 && <MeetSection label="Upcoming" meets={upcoming} onSelect={setSelectedMeet} onDelete={setDeleting} accent="gold" />}
          {completed.length > 0 && <MeetSection label="Completed" meets={completed} onSelect={setSelectedMeet} onDelete={setDeleting} accent="neutral" />}
          {cancelled.length > 0 && <MeetSection label="Cancelled" meets={cancelled} onSelect={setSelectedMeet} onDelete={setDeleting} accent="neutral" />}
        </div>
      )}

      {showAdd && (
        <MeetModal
          seasons={seasons}
          onSave={async (form) => {
            const m = await api.createMeet(form)
            setShowAdd(false)
            if (m?.id) {
              setMeets(ms => [m, ...ms])
              setSelectedMeet(m)
            } else {
              load()
            }
          }}
          onClose={() => setShowAdd(false)}
        />
      )}

      {deleting && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setDeleting(null)}>
          <div className="modal" style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <div className="modal-title">Delete Meet</div>
              <button className="btn btn-ghost btn-icon" onClick={() => setDeleting(null)}><X size={15} /></button>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6 }}>
              Delete <strong style={{ color: 'var(--text-primary)' }}>{deleting.name}</strong>?
              All events, entries, and results will be permanently removed.
            </p>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setDeleting(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={async () => {
                await api.deleteMeet(deleting.id)
                setMeets(ms => ms.filter(m => m.id !== deleting.id))
                setDeleting(null)
              }}>Delete Meet</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function MeetSection({ label, meets, onSelect, onDelete, accent }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 600,
        letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)',
        marginBottom: 10 }}>
        {label}
      </div>
      <div className="meets-card-grid">
        {meets.map(m => <MeetCard key={m.id} meet={m} onSelect={onSelect} onDelete={onDelete} />)}
      </div>
    </div>
  )
}

function MeetCard({ meet, onSelect, onDelete }) {
  const d   = new Date(meet.date + 'T00:00:00')
  const sc  = STATUS_CFG[meet.status] ?? STATUS_CFG.upcoming
  return (
    <div className="meet-card" onClick={() => onSelect(meet)}>
      <div className="meet-card-date">
        <span>{d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}</span>
        <span>{d.getDate()}</span>
        <span>{d.getFullYear()}</span>
      </div>
      <div className="meet-card-body">
        <div className="meet-card-name">{meet.name}</div>
        <div className="meet-card-meta">
          {meet.location && <span><MapPin size={10} style={{ verticalAlign: 'middle' }} /> {meet.location}</span>}
          {meet.season_name && <span>{meet.season_name}</span>}
          <span style={{ textTransform: 'capitalize' }}>{meet.type}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
          <span className={`badge ${sc.badge}`} style={{ fontSize: 10 }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: sc.dot, marginRight: 4 }} />
            {sc.label}
          </span>
          {meet.event_count > 0 && (
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {meet.event_count} event{meet.event_count !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>
      <button className="btn btn-danger btn-icon" style={{ padding: 6, alignSelf: 'flex-start', flexShrink: 0 }}
        onClick={e => { e.stopPropagation(); onDelete(meet) }} title="Delete meet">
        <Trash2 size={13} />
      </button>
    </div>
  )
}
