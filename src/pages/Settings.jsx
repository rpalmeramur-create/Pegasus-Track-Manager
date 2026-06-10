import React, { useEffect, useState } from 'react'
import { Cloud, CheckCircle, AlertCircle, RefreshCw, Eye, EyeOff, ExternalLink, Plus, X, Zap, Palette, Pencil } from 'lucide-react'
import { THEMES, getSavedTheme, applyTheme } from '../theme.js'
import { getAutoPrint, setAutoPrint } from '../printPrefs.js'

// ─── Status Badge ─────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = {
    idle:     { cls: 'badge-neutral', label: 'Not connected' },
    testing:  { cls: 'badge-neutral', label: 'Testing…' },
    ok:       { cls: 'badge-green',   label: 'Connected' },
    error:    { cls: '',              label: 'Error', style: { background:'var(--red-glow)', color:'var(--red)', border:'1px solid rgba(239,68,68,.2)' } },
  }
  const m = map[status] || map.idle
  return (
    <span className={`badge ${m.cls}`} style={m.style}>
      {status === 'ok'    && <CheckCircle size={10} style={{ marginRight:4 }} />}
      {status === 'error' && <AlertCircle size={10} style={{ marginRight:4 }} />}
      {m.label}
    </span>
  )
}

// ─── Appearance Section ───────────────────────────────────
function AppearanceSection() {
  const [active, setActive] = useState(getSavedTheme)

  const handleSelect = (id) => {
    applyTheme(id)
    setActive(id)
  }

  return (
    <div className="settings-section">
      <div className="settings-section-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Palette size={16} style={{ color: 'var(--accent)' }} />
          <div>
            <div className="settings-section-title">Appearance</div>
            <div className="settings-section-sub">Choose a color theme for the application.</div>
          </div>
        </div>
      </div>
      <div className="settings-fields">
        <div className="theme-picker">
          {THEMES.map(t => (
            <button
              key={t.id}
              className={`theme-card${active === t.id ? ' active' : ''}`}
              onClick={() => handleSelect(t.id)}
              title={t.label}
            >
              <div className="theme-card-preview" style={{ background: t.bg }}>
                {active === t.id
                  ? <CheckCircle size={18} style={{ color: t.accent }} />
                  : <div className="theme-card-dot" style={{ background: t.accent }} />
                }
              </div>
              <div className="theme-card-label">{t.label}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Season Management Section ────────────────────────────
// ─── Club Info Section ────────────────────────────────────
function ClubInfoSection({ form, setForm }) {
  const [saved, setSaved] = useState(false)

  const handleSave = async () => {
    await window.electronAPI?.saveSettings({
      homeTeam: form.homeTeam,
      attendanceThreshold: Number(form.attendanceThreshold) || 3,
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="settings-section">
      <div className="settings-section-header">
        <div>
          <div className="settings-section-title">Club Information</div>
          <div className="settings-section-sub">
            Configure club name and season confirmation rules.
          </div>
        </div>
      </div>
      <div className="settings-fields">
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Club / Team Name</label>
          <input className="input" value={form.homeTeam}
            onChange={e => setForm({ homeTeam: e.target.value })}
            placeholder="e.g. Pegasus Track" style={{ maxWidth: 320 }} />
          <span className="form-hint">
            Athletes with this team name are counted as club members for Records.
          </span>
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Season Confirmation Threshold</label>
          <input className="input" type="number" min={1} max={50}
            value={form.attendanceThreshold ?? 3}
            onChange={e => setForm({ attendanceThreshold: e.target.value })}
            style={{ maxWidth: 100 }} />
          <span className="form-hint">
            Minimum number of meets an athlete must attend to have their season confirmed.
          </span>
        </div>
        {saved && <div className="settings-success">Saved.</div>}
        <button className="btn btn-primary" style={{ alignSelf: 'flex-start' }}
          onClick={handleSave}>Save</button>
      </div>
    </div>
  )
}

const TYPE_LABELS = { outdoor: 'Outdoor', indoor: 'Indoor', cross_country: 'Cross Country' }

// ─── Custom Events ────────────────────────────────────────────
function CustomEventModal({ event, onSave, onClose }) {
  const [form, setForm] = useState({
    name:             event?.name             ?? '',
    abbreviation:     event?.abbreviation     ?? '',
    category:         event?.category         ?? 'track',
    measurement_unit: event?.measurement_unit ?? 'time',
    is_relay:         event?.is_relay         ?? 0,
    is_adaptive:      event?.is_adaptive      ?? 0,
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Event name is required'); return }
    setSaving(true)
    try {
      await onSave({ ...form, is_relay: form.is_relay ? 1 : 0, is_adaptive: form.is_adaptive ? 1 : 0 })
    } catch (e) { setError(e.message || 'Save failed'); setSaving(false) }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">{event?.id ? 'Edit Custom Event' : 'New Custom Event'}</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={15} /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group">
            <label className="form-label">Event Name <span style={{ color: 'var(--red)' }}>*</span></label>
            <input className="input" value={form.name} autoFocus
              onChange={e => { set('name', e.target.value); setError('') }}
              placeholder="e.g. Wheelchair 100m Dash" />
            {error && <span className="form-error">{error}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Abbreviation <span style={{ color: 'var(--text-muted)', textTransform: 'none', letterSpacing: 0 }}>Optional</span></label>
            <input className="input" value={form.abbreviation}
              onChange={e => set('abbreviation', e.target.value)}
              placeholder="e.g. WC100m" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="input" value={form.category} onChange={e => set('category', e.target.value)}>
                <option value="track">Track</option>
                <option value="field">Field</option>
                <option value="relay">Relay</option>
                <option value="combined">Combined</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Measurement</label>
              <select className="input" value={form.measurement_unit} onChange={e => set('measurement_unit', e.target.value)}>
                <option value="time">Time</option>
                <option value="distance">Distance</option>
                <option value="points">Points</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 24 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
              <input type="checkbox" checked={!!form.is_relay}
                onChange={e => set('is_relay', e.target.checked ? 1 : 0)} />
              Relay event (4 athletes)
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
              <input type="checkbox" checked={!!form.is_adaptive}
                onChange={e => set('is_adaptive', e.target.checked ? 1 : 0)} />
              Adaptive / Para
            </label>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : event?.id ? 'Save Changes' : 'Create Event'}
          </button>
        </div>
      </div>
    </div>
  )
}

function CustomEventsSection() {
  const [events,   setEvents]   = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editing,  setEditing]  = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [deleteErr, setDeleteErr] = useState('')

  const load = () => {
    if (!window.electronAPI?.getTfEvents) return
    window.electronAPI.getTfEvents()
      .then(evs => setEvents(evs.filter(e => e.is_custom)))
      .catch(() => {})
  }

  useEffect(() => { load() }, [])

  const handleSave = async (form) => {
    if (editing?.id) {
      await window.electronAPI.updateTfEvent(editing.id, form)
    } else {
      await window.electronAPI.createTfEvent(form)
    }
    setShowModal(false)
    setEditing(null)
    load()
  }

  const handleDelete = async () => {
    const r = await window.electronAPI.deleteTfEvent(deleting.id)
    if (!r.success) { setDeleteErr(r.error); return }
    setDeleting(null)
    setDeleteErr('')
    load()
  }

  const CAT_COLOR = { track: 'var(--accent)', relay: '#a78bfa', field: '#34d399', combined: '#f59e0b' }

  return (
    <div className="settings-section">
      <div className="settings-section-header">
        <div>
          <div className="settings-section-title">Custom Events</div>
          <div className="settings-section-sub">
            Add non-standard events — adaptive, wheelchair, novelty — to the meet catalogue.
            Custom events appear alongside standard ones when setting up a meet.
          </div>
        </div>
        <button className="btn btn-primary" style={{ fontSize: 12 }}
          onClick={() => { setEditing(null); setShowModal(true) }}>
          <Plus size={13} style={{ marginRight: 4 }} />New Event
        </button>
      </div>

      {events.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 10 }}>
          No custom events yet. Standard events are always available.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12 }}>
          {events.map(ev => (
            <div key={ev.id} style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
              background: 'var(--bg-tertiary)', borderRadius: 6, border: '1px solid var(--border)',
            }}>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                <span style={{ fontWeight: 500, fontSize: 13 }}>{ev.name}</span>
                {ev.abbreviation && (
                  <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>({ev.abbreviation})</span>
                )}
                <span className="badge badge-neutral" style={{ fontSize: 10, color: CAT_COLOR[ev.category], textTransform: 'capitalize' }}>
                  {ev.category}
                </span>
                {ev.is_adaptive ? <span className="badge badge-blue" style={{ fontSize: 10 }}>Adaptive</span> : null}
                {ev.is_relay    ? <span className="badge badge-neutral" style={{ fontSize: 10 }}>Relay</span> : null}
              </div>
              <button className="btn btn-ghost btn-icon" title="Edit"
                onClick={() => { setEditing(ev); setShowModal(true) }}>
                <Pencil size={13} />
              </button>
              <button className="btn btn-danger btn-icon" title="Delete"
                onClick={() => { setDeleting(ev); setDeleteErr('') }}>
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <CustomEventModal
          event={editing}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditing(null) }}
        />
      )}

      {deleting && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setDeleting(null)}>
          <div className="modal" style={{ maxWidth: 380 }}>
            <div className="modal-header">
              <div className="modal-title">Delete Custom Event</div>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: deleteErr ? 8 : 0 }}>
              Delete "<strong>{deleting.name}</strong>"? This cannot be undone.
            </p>
            {deleteErr && <p style={{ fontSize: 12, color: 'var(--red)', margin: '8px 0 0' }}>{deleteErr}</p>}
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => { setDeleting(null); setDeleteErr('') }}>Cancel</button>
              <button className="btn btn-danger" onClick={handleDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SeasonSection() {
  const [seasons,      setSeasons]      = useState([])
  const [loading,      setLoading]      = useState(true)
  const [showAdd,      setShowAdd]      = useState(false)
  const [form,         setForm]         = useState({ name: '', year: new Date().getFullYear(), type: 'outdoor' })
  const [saving,       setSaving]       = useState(false)
  const [settingActive, setSettingActive] = useState(null)

  useEffect(() => {
    if (!window.electronAPI) { setLoading(false); return }
    window.electronAPI.getSeasons().then(s => { setSeasons(s); setLoading(false) })
  }, [])

  const handleCreate = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    const s = await window.electronAPI.createSeason({
      name:       form.name.trim(),
      year:       Number(form.year),
      type:       form.type,
      active:     seasons.length === 0 ? 1 : 0,
    })
    setSeasons(prev => [s, ...prev])
    setForm({ name: '', year: new Date().getFullYear(), type: 'outdoor' })
    setShowAdd(false)
    setSaving(false)
  }

  const handleSetActive = async (id) => {
    setSettingActive(id)
    await window.electronAPI.setActiveSeason(id)
    setSeasons(prev => prev.map(s => ({ ...s, active: s.id === id ? 1 : 0 })))
    setSettingActive(null)
  }

  if (loading) return null

  return (
    <div className="settings-section">
      <div className="settings-section-header">
        <div>
          <div className="settings-section-title">Season Management</div>
          <div className="settings-section-sub">
            Create seasons to organize your meets. The active season shows on the dashboard.
          </div>
        </div>
        <button className="btn btn-ghost" style={{ marginLeft: 'auto', fontSize: 12 }}
          onClick={() => setShowAdd(v => !v)}>
          {showAdd ? <><X size={12} /> Cancel</> : <><Plus size={12} /> New Season</>}
        </button>
      </div>

      <div className="settings-fields">
        {showAdd && (
          <div style={{ background: 'var(--bg-tertiary)', borderRadius: 8, padding: 14, marginBottom: 4 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 160px', gap: 10, marginBottom: 12 }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Season Name</label>
                <input className="input" value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. 2025 Outdoor Season" autoFocus
                  onKeyDown={e => e.key === 'Enter' && handleCreate()} />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Year</label>
                <input className="input" type="number" value={form.year}
                  onChange={e => setForm(f => ({ ...f, year: e.target.value }))} />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Type</label>
                <select className="input" value={form.type}
                  onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                  <option value="outdoor">Outdoor</option>
                  <option value="indoor">Indoor</option>
                  <option value="cross_country">Cross Country</option>
                </select>
              </div>
            </div>
            <button className="btn btn-primary" onClick={handleCreate}
              disabled={saving || !form.name.trim()}>
              {saving ? 'Creating…' : 'Create Season'}
            </button>
          </div>
        )}

        {seasons.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '8px 0' }}>
            No seasons yet — click <strong>New Season</strong> to create one.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {seasons.map(s => (
              <div key={s.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 14px', borderRadius: 8,
                background: 'var(--bg-tertiary)',
                border: s.active ? '1px solid var(--accent)' : '1px solid var(--border)',
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{s.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    {s.year} · {TYPE_LABELS[s.type] || s.type}
                  </div>
                </div>
                {s.active ? (
                  <span className="badge badge-green" style={{ fontSize: 10 }}>Active</span>
                ) : (
                  <button className="btn btn-ghost" style={{ fontSize: 11, padding: '4px 10px' }}
                    onClick={() => handleSetActive(s.id)}
                    disabled={settingActive === s.id}>
                    {settingActive === s.id ? 'Setting…' : 'Set Active'}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function DataMaintenanceSection() {
  const [status, setStatus] = useState('idle')
  const [msg, setMsg]       = useState('')

  const handleDedup = async () => {
    if (!window.electronAPI?.deduplicateAthletes) {
      setMsg('Requires the desktop app.')
      setStatus('error')
      return
    }
    setStatus('working')
    setMsg('')
    const res = await window.electronAPI.deduplicateAthletes()
    if (res.groups === 0) {
      setMsg('No duplicates found — roster is clean.')
      setStatus('ok')
    } else {
      setMsg(`Merged ${res.merged} duplicate athlete record${res.merged !== 1 ? 's' : ''} across ${res.groups} group${res.groups !== 1 ? 's' : ''}.`)
      setStatus('ok')
    }
  }

  return (
    <div className="settings-section">
      <div className="settings-section-header">
        <div>
          <div className="settings-section-title">Data Maintenance</div>
          <div className="settings-section-sub">
            Clean up duplicate athletes created during imports.
          </div>
        </div>
      </div>
      <div className="settings-fields">
        {msg && <div className={status === 'ok' ? 'settings-success' : 'settings-error'}>{msg}</div>}
        <button className="btn btn-ghost" onClick={handleDedup} disabled={status === 'working'}>
          {status === 'working' ? 'Scanning…' : 'Deduplicate Athletes'}
        </button>
      </div>
    </div>
  )
}

export default function Settings() {
  const [form, setForm] = useState({
    supabaseUrl: '', supabaseAnonKey: '', supabaseServiceKey: '', parentEmail: '', parentPassword: '',
    claudeApiKey: '', labelPrinter: '', sheetPrinter: '', homeTeam: 'Pegasus Track', attendanceThreshold: 3,
  })
  const [showKey, setShowKey]           = useState(false)
  const [showClaudeKey, setShowClaudeKey] = useState(false)
  const [connStatus, setConnStatus]     = useState('idle')
  const [connError, setConnError]       = useState('')
  const [accountStatus, setAccStatus]   = useState('idle')
  const [accountMsg, setAccountMsg]     = useState('')
  const [syncStatus, setSyncStatus]     = useState('idle')
  const [syncResult, setSyncResult]     = useState(null)
  const [saved, setSaved]               = useState(false)
  const [aiSaved, setAiSaved]           = useState(false)
  const [hasClaudeKey, setHasClaudeKey] = useState(false)
  const [printers, setPrinters]         = useState([])
  const [printerSaved, setPrinterSaved] = useState(false)
  const [autoPrint,  setAutoPrintState] = useState(() => getAutoPrint())
  const [loading, setLoading]           = useState(true)

  useEffect(() => {
    if (!window.electronAPI) { setLoading(false); return }
    Promise.all([
      window.electronAPI.getSettings(),
      window.electronAPI.listPrinters?.() ?? Promise.resolve([]),
    ]).then(([s, p]) => {
      setForm(f => ({
        ...f,
        supabaseUrl:     s.supabaseUrl     || '',
        supabaseAnonKey: s.supabaseAnonKey || '',
        parentEmail:     s.parentEmail     || '',
        labelPrinter:    s.labelPrinter    || '',
        sheetPrinter:    s.sheetPrinter    || '',
        homeTeam:             s.homeTeam             || 'Pegasus Track',
        attendanceThreshold:  s.attendanceThreshold  ?? 3,
      }))
      setHasClaudeKey(!!s.hasClaudeKey)
      setPrinters(p)
      if (s.connected) setConnStatus('ok')
      setLoading(false)
    })
  }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    await window.electronAPI.saveSettings({
      supabaseUrl:        form.supabaseUrl,
      supabaseAnonKey:    form.supabaseAnonKey,
      supabaseServiceKey: form.supabaseServiceKey,
      parentEmail:        form.parentEmail,
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleSavePrinters = async () => {
    await window.electronAPI.saveSettings({
      labelPrinter: form.labelPrinter,
      sheetPrinter: form.sheetPrinter,
    })
    setPrinterSaved(true)
    setTimeout(() => setPrinterSaved(false), 2500)
  }

  const handleSaveClaudeKey = async () => {
    if (!form.claudeApiKey.trim()) return
    await window.electronAPI.saveSettings({ claudeApiKey: form.claudeApiKey.trim() })
    setHasClaudeKey(true)
    setForm(f => ({ ...f, claudeApiKey: '' }))
    setAiSaved(true)
    setTimeout(() => setAiSaved(false), 2500)
  }

  const handleTestConnection = async () => {
    if (!form.supabaseUrl || !form.supabaseServiceKey) {
      setConnError('Enter the Project URL and Service Role Key first.')
      setConnStatus('error')
      return
    }
    setConnStatus('testing')
    setConnError('')
    const res = await window.electronAPI.testConnection({
      url: form.supabaseUrl,
      serviceKey: form.supabaseServiceKey,
    })
    if (res.success) {
      setConnStatus('ok')
      // Auto-save credentials on successful test
      await window.electronAPI.saveSettings({
        supabaseUrl:        form.supabaseUrl,
        supabaseAnonKey:    form.supabaseAnonKey,
        supabaseServiceKey: form.supabaseServiceKey,
        parentEmail:        form.parentEmail,
      })
    } else {
      setConnStatus('error')
      setConnError(res.error || 'Connection failed')
    }
  }

  const handleSetupAccount = async () => {
    if (!form.parentEmail || !form.parentPassword) {
      setAccountMsg('Enter both email and password.')
      setAccStatus('error')
      return
    }
    setAccStatus('testing')
    setAccountMsg('')
    const res = await window.electronAPI.setupParentAccount({
      url: form.supabaseUrl,
      serviceKey: form.supabaseServiceKey,
      email: form.parentEmail,
      password: form.parentPassword,
    })
    if (res.success) {
      setAccStatus('ok')
      setAccountMsg(res.updated ? 'Password updated on existing account.' : 'Parent account created successfully.')
      await window.electronAPI.saveSettings({ parentEmail: form.parentEmail })
    } else {
      setAccStatus('error')
      setAccountMsg(res.error || 'Setup failed')
    }
  }

  const handleFullSync = async () => {
    setSyncStatus('testing')
    setSyncResult(null)
    const res = await window.electronAPI.fullSync()
    if (res.success) {
      setSyncStatus('ok')
      setSyncResult(`Synced ${res.athletes} athletes, ${res.tfEvents} events, ${res.seasons} seasons.`)
    } else {
      setSyncStatus('error')
      setSyncResult(res.error || 'Sync failed')
    }
  }

  if (loading) return <div className="loading-container"><div className="loading-spinner" /></div>

  return (
    <div className="settings-page">
      <div className="page-header">
        <div>
          <div className="page-title">SETTINGS</div>
          <div className="page-subtitle">Configure your cloud sync and parent portal</div>
        </div>
      </div>

      <div className="settings-body">

        {/* ── Appearance ── */}
        <AppearanceSection />

        {/* ── Club Info ── */}
        <ClubInfoSection form={form} setForm={f => setForm(prev => ({ ...prev, ...f }))} />

        {/* ── Seasons ── */}
        <SeasonSection />

        {/* ── Custom Events ── */}
        <CustomEventsSection />

        {/* ── Print Settings ── */}
        <div className="settings-section">
          <div className="settings-section-header">
            <div>
              <div className="settings-section-title">Print Settings</div>
              <div className="settings-section-sub">
                Set default printers so prints go to the right device automatically.
                Leave blank to always show the print dialog.
              </div>
            </div>
          </div>

          <div className="settings-fields">
            {printers.length === 0 && (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
                No printers detected — make sure you're running the desktop app and printers are installed.
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Award Labels Printer</label>
                <select className="input" value={form.labelPrinter}
                  onChange={e => set('labelPrinter', e.target.value)}>
                  <option value="">— Show print dialog —</option>
                  {printers.map(p => (
                    <option key={p.name} value={p.name}>
                      {p.name}{p.isDefault ? ' (system default)' : ''}
                    </option>
                  ))}
                </select>
                <span className="form-hint">Thermal label printer for award labels.</span>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Heat Sheets &amp; Results Printer</label>
                <select className="input" value={form.sheetPrinter}
                  onChange={e => set('sheetPrinter', e.target.value)}>
                  <option value="">— Show print dialog —</option>
                  {printers.map(p => (
                    <option key={p.name} value={p.name}>
                      {p.name}{p.isDefault ? ' (system default)' : ''}
                    </option>
                  ))}
                </select>
                <span className="form-hint">Regular paper printer for 8.5″ × 11″ sheets.</span>
              </div>
            </div>

            <div className="settings-toggle-row">
              <label className="toggle-switch">
                <input type="checkbox" checked={autoPrint}
                  onChange={e => { setAutoPrintState(e.target.checked); setAutoPrint(e.target.checked) }} />
                <span className="toggle-track" />
              </label>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>Direct Print</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Skip the print preview and send directly to the configured printer (or PDF if none is set).
                </div>
              </div>
            </div>

            {printerSaved && <div className="settings-success">Printer preferences saved.</div>}

            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button className="btn btn-primary" onClick={handleSavePrinters}>
                Save Printers
              </button>
              <button className="btn btn-ghost" style={{ fontSize: 12 }}
                onClick={() => window.electronAPI?.listPrinters?.().then(setPrinters)}>
                ↻ Refresh List
              </button>
            </div>
          </div>
        </div>

        {/* ── AI Assistant ── */}
        <div className="settings-section">
          <div className="settings-section-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Zap size={16} style={{ color: 'var(--accent)' }} />
              <div>
                <div className="settings-section-title">AI Assistant</div>
                <div className="settings-section-sub">
                  Powers the in-app AI agents for each page. Get a key at{' '}
                  <a href="https://console.anthropic.com" target="_blank" rel="noreferrer"
                     style={{ color: 'var(--accent)' }}>
                    console.anthropic.com <ExternalLink size={11} style={{ verticalAlign: 'middle' }} />
                  </a>
                </div>
              </div>
            </div>
            <div style={{ marginLeft: 'auto' }}>
              {hasClaudeKey
                ? <span className="badge badge-green"><CheckCircle size={10} style={{ marginRight: 4 }} />Key saved</span>
                : <span className="badge badge-neutral">Not configured</span>}
            </div>
          </div>

          <div className="settings-fields">
            <div className="form-group">
              <label className="form-label">
                Claude API Key {hasClaudeKey && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(enter new key to replace)</span>}
              </label>
              <div style={{ position: 'relative' }}>
                <input className="input" type={showClaudeKey ? 'text' : 'password'}
                  value={form.claudeApiKey}
                  onChange={e => set('claudeApiKey', e.target.value)}
                  placeholder={hasClaudeKey ? '••••••••••••••••••••' : 'sk-ant-api03-…'}
                  style={{ paddingRight: 40 }}
                  onKeyDown={e => e.key === 'Enter' && handleSaveClaudeKey()} />
                <button className="btn btn-ghost btn-icon"
                  style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', padding: 4 }}
                  onClick={() => setShowClaudeKey(v => !v)}>
                  {showClaudeKey ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <span className="form-hint">Stored locally only — never sent to any server except Anthropic.</span>
            </div>

            {aiSaved && <div className="settings-success">API key saved. The AI assistant is ready.</div>}

            <button className="btn btn-primary" onClick={handleSaveClaudeKey}
              disabled={!form.claudeApiKey.trim()}>
              <Zap size={14} /> Save API Key
            </button>
          </div>
        </div>

        {/* ── Step 1: Supabase Credentials ── */}
        <div className="settings-section">
          <div className="settings-section-header">
            <div className="settings-step">1</div>
            <div>
              <div className="settings-section-title">Connect to Supabase</div>
              <div className="settings-section-sub">
                Free account at{' '}
                <a href="https://supabase.com" target="_blank" rel="noreferrer"
                   style={{ color: 'var(--accent)' }}>
                  supabase.com <ExternalLink size={11} style={{ verticalAlign:'middle' }} />
                </a>
                {' '}· Run <code style={codeStyle}>supabase-setup.sql</code> in your project's SQL Editor first.
              </div>
            </div>
            <div style={{ marginLeft: 'auto' }}>
              <StatusBadge status={connStatus} />
            </div>
          </div>

          <div className="settings-fields">
            <div className="form-group">
              <label className="form-label">Project URL</label>
              <input className="input" value={form.supabaseUrl}
                onChange={e => set('supabaseUrl', e.target.value)}
                placeholder="https://xxxxxxxxxxxx.supabase.co" />
            </div>

            <div className="form-group">
              <label className="form-label">Anon / Public Key</label>
              <input className="input" value={form.supabaseAnonKey}
                onChange={e => set('supabaseAnonKey', e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIs..." />
              <span className="form-hint">Used by the parent web portal. Safe to expose.</span>
            </div>

            <div className="form-group">
              <label className="form-label">Service Role Key <span style={{ color:'var(--red)' }}>*</span></label>
              <div style={{ position:'relative' }}>
                <input className="input" type={showKey ? 'text' : 'password'}
                  value={form.supabaseServiceKey}
                  onChange={e => set('supabaseServiceKey', e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1NiIs…"
                  style={{ paddingRight: 40 }} />
                <button className="btn btn-ghost btn-icon"
                  style={{ position:'absolute', right:4, top:'50%', transform:'translateY(-50%)', padding:'4px' }}
                  onClick={() => setShowKey(v => !v)}>
                  {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <span className="form-hint">Never shared with the portal. Stored locally only.</span>
            </div>

            {connError && <div className="settings-error">{connError}</div>}

            <div style={{ display:'flex', gap:8 }}>
              <button className="btn btn-primary" onClick={handleTestConnection} disabled={connStatus==='testing'}>
                <Cloud size={14} />
                {connStatus === 'testing' ? 'Testing…' : 'Test & Save Connection'}
              </button>
            </div>
          </div>
        </div>

        {/* ── Step 2: Parent Account ── */}
        <div className="settings-section">
          <div className="settings-section-header">
            <div className="settings-step">2</div>
            <div>
              <div className="settings-section-title">Set Parent Login</div>
              <div className="settings-section-sub">
                Share this email and password with all parents. Change the password here anytime.
              </div>
            </div>
            {accountStatus !== 'idle' && (
              <div style={{ marginLeft:'auto' }}>
                <StatusBadge status={accountStatus} />
              </div>
            )}
          </div>

          <div className="settings-fields">
            <div className="form-group">
              <label className="form-label">Parent Login Email</label>
              <input className="input" type="email" value={form.parentEmail}
                onChange={e => set('parentEmail', e.target.value)}
                placeholder="parents@myclubname.com" />
            </div>

            <div className="form-group">
              <label className="form-label">Parent Login Password</label>
              <input className="input" type="password" value={form.parentPassword}
                onChange={e => set('parentPassword', e.target.value)}
                placeholder="Choose a strong password" />
            </div>

            {accountMsg && (
              <div className={accountStatus === 'ok' ? 'settings-success' : 'settings-error'}>
                {accountMsg}
              </div>
            )}

            <button className="btn btn-primary" onClick={handleSetupAccount} disabled={accountStatus==='testing'}>
              {accountStatus==='testing' ? 'Setting up…' : 'Create / Update Parent Account'}
            </button>
          </div>
        </div>

        {/* ── Step 3: Initial Sync ── */}
        <div className="settings-section">
          <div className="settings-section-header">
            <div className="settings-step">3</div>
            <div>
              <div className="settings-section-title">Sync Roster Data</div>
              <div className="settings-section-sub">
                Push your current athletes to Supabase so the portal shows the roster.
                Meet results are published from the Meets page (Phase 2).
              </div>
            </div>
            {syncStatus !== 'idle' && (
              <div style={{ marginLeft:'auto' }}>
                <StatusBadge status={syncStatus} />
              </div>
            )}
          </div>

          <div className="settings-fields">
            {syncResult && (
              <div className={syncStatus === 'ok' ? 'settings-success' : 'settings-error'}>
                {syncResult}
              </div>
            )}
            <button className="btn btn-primary" onClick={handleFullSync} disabled={syncStatus==='testing'}>
              <RefreshCw size={14} />
              {syncStatus==='testing' ? 'Syncing…' : 'Sync Athletes & Events Now'}
            </button>
          </div>
        </div>

        {/* ── Data Maintenance ── */}
        <DataMaintenanceSection />

        {/* ── Portal Info ── */}
        <div className="settings-section settings-section-info">
          <div className="settings-section-title" style={{ marginBottom:12 }}>
            <Cloud size={14} style={{ marginRight:6, verticalAlign:'middle' }} />
            Parent Portal Deployment
          </div>
          <p style={{ color:'var(--text-secondary)', fontSize:13, lineHeight:1.7 }}>
            The <code style={codeStyle}>pegasus-track-web/</code> folder is a standalone React app.
            Deploy it to <strong>Vercel</strong> for free:
          </p>
          <ol style={{ color:'var(--text-secondary)', fontSize:13, lineHeight:2, paddingLeft:20, marginTop:8 }}>
            <li>Push <code style={codeStyle}>pegasus-track-web/</code> to a GitHub repo</li>
            <li>Import it at <a href="https://vercel.com" target="_blank" rel="noreferrer" style={{ color:'var(--accent)' }}>vercel.com</a></li>
            <li>Add two environment variables: <code style={codeStyle}>VITE_SUPABASE_URL</code> and <code style={codeStyle}>VITE_SUPABASE_ANON_KEY</code></li>
            <li>Connect your custom domain in Vercel's dashboard</li>
          </ol>
        </div>

      </div>
    </div>
  )
}

const codeStyle = {
  background: 'var(--bg-tertiary)',
  border: '1px solid var(--border)',
  borderRadius: 4,
  padding: '1px 5px',
  fontSize: 12,
  fontFamily: 'monospace',
  color: 'var(--accent)',
}
