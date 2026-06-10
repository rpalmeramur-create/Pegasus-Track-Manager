import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { Plus, RefreshCw, Edit2, Trash2, X, ChevronRight, Trophy, Zap } from 'lucide-react'

// ─── Helpers ─────────────────────────────────────────────
const CAT_ORDER  = ['track', 'relay', 'field', 'combined']
const CAT_LABELS = { track: 'Track Events', relay: 'Relay Events', field: 'Field Events', combined: 'Combined Events' }
const GENDER_LABEL = { M: 'Boys', F: 'Girls', mixed: 'Mixed' }

function fmtDate(d) {
  if (!d) return null
  try { return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }
  catch { return d }
}

function windLabel(w) {
  if (!w || w === '') return null
  const n = parseFloat(w)
  if (isNaN(n)) return null
  return (n >= 0 ? '+' : '') + n.toFixed(1)
}

const FALLBACK = {
  getRecords:             async () => [],
  syncRecordsFromResults: async () => ({ club: 0, open: 0 }),
  saveRecord:             async () => ({}),
  deleteRecord:           async () => ({}),
  getTfEvents:            async () => [],
  getSettings:            async () => ({}),
}
const api = (typeof window !== 'undefined' && window.electronAPI) ? window.electronAPI : FALLBACK

// ─── Add / Edit Modal ─────────────────────────────────────
const AGE_GROUPS = ['8 & Under', '9-10', '11-12', '13-14', '15-16', '17-18', 'Open']

function RecordModal({ record, scope: defaultScope, tfEvents, onSave, onClose }) {
  const isEdit = !!record?.id
  const [form, setForm] = useState({
    scope:          record?.scope          ?? defaultScope,
    event_name:     record?.event_name     ?? '',
    event_category: record?.event_category ?? 'track',
    gender:         record?.gender         ?? 'M',
    age_group:      record?.age_group      ?? '',
    mark:           record?.mark           ?? '',
    wind:           record?.wind           ?? '',
    athlete_name:   record?.athlete_name   ?? '',
    team:           record?.team           ?? '',
    meet_name:      record?.meet_name      ?? '',
    meet_date:      record?.meet_date      ?? '',
    notes:          record?.notes          ?? '',
  })
  const [saving, setSaving] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const isField = form.event_category === 'field' || form.event_category === 'combined'

  const handleEventChange = (name) => {
    const ev = tfEvents.find(e => e.name === name)
    set('event_name', name)
    if (ev) set('event_category', ev.category)
  }

  const handleSave = async () => {
    if (!form.event_name.trim() || !form.mark.trim()) return
    setSaving(true)
    try {
      const data = { ...form, mark_value: null, athlete_id: null, meet_id: null }
      if (isEdit) data.id = record.id
      await api.saveRecord(data)
      onSave()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ width: 520 }}>
        <div className="modal-header">
          <div className="modal-title">{isEdit ? 'Edit Record' : 'Add Record'}</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={15} /></button>
        </div>
        <div className="modal-body" style={{ display: 'grid', gap: 14 }}>

          {/* Scope */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Record Type</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {[['club','Club Record'], ['open','Open Meet Record']].map(([val, lbl]) => (
                <button key={val}
                  className={`btn ${form.scope === val ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ flex: 1, fontSize: 12 }}
                  onClick={() => set('scope', val)}>
                  {lbl}
                </button>
              ))}
            </div>
          </div>

          {/* Event + Category */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: 10 }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Event *</label>
              <input className="input" list="rm-events" value={form.event_name}
                onChange={e => handleEventChange(e.target.value)}
                placeholder="e.g. 100 Meter Dash" />
              <datalist id="rm-events">
                {tfEvents.map(e => <option key={e.id} value={e.name} />)}
              </datalist>
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Category</label>
              <select className="input" value={form.event_category}
                onChange={e => set('event_category', e.target.value)}>
                <option value="track">Track</option>
                <option value="relay">Relay</option>
                <option value="field">Field</option>
                <option value="combined">Combined</option>
              </select>
            </div>
          </div>

          {/* Gender + Age Group */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Gender</label>
              <select className="input" value={form.gender} onChange={e => set('gender', e.target.value)}>
                <option value="M">Boys</option>
                <option value="F">Girls</option>
                <option value="mixed">Mixed / Open</option>
              </select>
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Age Group</label>
              <input className="input" list="rm-ages" value={form.age_group}
                onChange={e => set('age_group', e.target.value)}
                placeholder="e.g. 9-10, Open" />
              <datalist id="rm-ages">
                {AGE_GROUPS.map(a => <option key={a} value={a} />)}
              </datalist>
            </div>
          </div>

          {/* Mark + Wind */}
          <div style={{ display: 'grid', gridTemplateColumns: isField ? '1fr' : '1fr 90px', gap: 10 }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Mark *</label>
              <input className="input" value={form.mark} onChange={e => set('mark', e.target.value)}
                placeholder={isField ? 'e.g. 18-6.5 or 5.65m' : 'e.g. 12.45 or 1:23.45'} />
            </div>
            {!isField && (
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Wind (m/s)</label>
                <input className="input" value={form.wind} onChange={e => set('wind', e.target.value)}
                  placeholder="+1.2" />
              </div>
            )}
          </div>

          {/* Athlete + Team */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Athlete Name</label>
              <input className="input" value={form.athlete_name}
                onChange={e => set('athlete_name', e.target.value)} placeholder="First Last" />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Team</label>
              <input className="input" value={form.team}
                onChange={e => set('team', e.target.value)} />
            </div>
          </div>

          {/* Meet + Date */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 150px', gap: 10 }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Meet Name</label>
              <input className="input" value={form.meet_name}
                onChange={e => set('meet_name', e.target.value)} placeholder="Optional" />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Date</label>
              <input className="input" type="date" value={form.meet_date}
                onChange={e => set('meet_date', e.target.value)} />
            </div>
          </div>

          {/* Notes */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Notes</label>
            <input className="input" value={form.notes}
              onChange={e => set('notes', e.target.value)} placeholder="Optional" />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave}
            disabled={saving || !form.event_name.trim() || !form.mark.trim()}>
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Record'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Records Page ─────────────────────────────────────────
export default function Records() {
  const [records,  setRecords]      = useState([])
  const [tfEvents, setTfEvents]     = useState([])
  const [loading,  setLoading]      = useState(true)
  const [scope,    setScope]        = useState('club')
  const [filterCat,    setFilterCat]    = useState('all')
  const [filterGender, setFilterGender] = useState('all')
  const [filterAge,    setFilterAge]    = useState('')
  const [showModal, setShowModal]   = useState(false)
  const [editRec,   setEditRec]     = useState(null)
  const [syncing,   setSyncing]     = useState(false)
  const [syncMsg,   setSyncMsg]     = useState(null)
  const [homeTeam,  setHomeTeam]    = useState('Pegasus Track')

  const load = useCallback(async (autoSync = false) => {
    setLoading(true)
    const [recs, evts, settings] = await Promise.all([
      api.getRecords(scope),
      api.getTfEvents(),
      api.getSettings(),
    ])
    setTfEvents(evts ?? [])
    setHomeTeam(settings?.homeTeam || 'Pegasus Track')
    // Auto-sync from results if the table is empty
    if ((recs ?? []).length === 0 && autoSync) {
      try {
        await api.syncRecordsFromResults()
        const fresh = await api.getRecords(scope)
        setRecords(fresh ?? [])
      } catch { setRecords([]) }
    } else {
      setRecords(recs ?? [])
    }
    setLoading(false)
  }, [scope])

  useEffect(() => { load(true) }, [load])

  const handleSync = async () => {
    setSyncing(true)
    setSyncMsg(null)
    try {
      const { club, open } = await api.syncRecordsFromResults()
      setSyncMsg(`Synced — ${club} club record${club !== 1 ? 's' : ''}, ${open} open record${open !== 1 ? 's' : ''} computed.`)
      await load()
    } catch (e) {
      setSyncMsg('Sync failed: ' + (e?.message ?? e))
    }
    setSyncing(false)
    setTimeout(() => setSyncMsg(null), 5000)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this record?')) return
    await api.deleteRecord(id)
    setRecords(r => r.filter(rec => rec.id !== id))
  }

  const openModal = (rec = null) => { setEditRec(rec); setShowModal(true) }
  const closeModal = () => { setShowModal(false); setEditRec(null) }

  // Filter
  const filtered = useMemo(() => records.filter(r => {
    if (filterCat !== 'all' && r.event_category !== filterCat) return false
    if (filterGender !== 'all' && r.gender !== filterGender) return false
    if (filterAge.trim() && !(r.age_group || '').toLowerCase().includes(filterAge.trim().toLowerCase())) return false
    return true
  }), [records, filterCat, filterGender, filterAge])

  // Group: category → event_name → Record[]
  const grouped = useMemo(() => {
    const byCat = {}
    for (const rec of filtered) {
      const cat = rec.event_category || 'track'
      if (!byCat[cat]) byCat[cat] = {}
      if (!byCat[cat][rec.event_name]) byCat[cat][rec.event_name] = []
      byCat[cat][rec.event_name].push(rec)
    }
    for (const cat of Object.values(byCat))
      for (const recs of Object.values(cat))
        recs.sort((a, b) => {
          if (a.gender !== b.gender) return a.gender < b.gender ? -1 : 1
          return (a.age_group || '').localeCompare(b.age_group || '')
        })
    return byCat
  }, [filtered])

  const showWind = (cat) => cat === 'track' || cat === 'relay'

  return (
    <div className="records-page">
      {/* Page header */}
      <div className="records-page-header">
        <div>
          <div className="records-page-title">Records</div>
          <div className="records-page-sub">
            {scope === 'club'
              ? `${homeTeam} all-time bests per event & age group`
              : 'All-time bests by any athlete at tracked meets'}
          </div>
        </div>
        <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          onClick={() => openModal()}>
          <Plus size={14} /> Add Record
        </button>
      </div>

      {/* Scope tabs */}
      <div className="records-tabs">
        <button className={`records-tab${scope === 'club' ? ' active' : ''}`}
          onClick={() => setScope('club')}>
          <Trophy size={13} style={{ marginRight: 5 }} />Club Records
        </button>
        <button className={`records-tab${scope === 'open' ? ' active' : ''}`}
          onClick={() => setScope('open')}>
          <Zap size={13} style={{ marginRight: 5 }} />Open Meet Records
        </button>
      </div>

      {/* Filter bar */}
      <div className="records-filter-bar">
        <select className="input" style={{ fontSize: 12, padding: '5px 8px', minWidth: 140 }}
          value={filterCat} onChange={e => setFilterCat(e.target.value)}>
          <option value="all">All Categories</option>
          <option value="track">Track</option>
          <option value="relay">Relay</option>
          <option value="field">Field</option>
          <option value="combined">Combined</option>
        </select>

        <select className="input" style={{ fontSize: 12, padding: '5px 8px', minWidth: 120 }}
          value={filterGender} onChange={e => setFilterGender(e.target.value)}>
          <option value="all">All Genders</option>
          <option value="M">Boys</option>
          <option value="F">Girls</option>
          <option value="mixed">Mixed</option>
        </select>

        <input className="input" style={{ fontSize: 12, padding: '5px 8px', flex: 1, maxWidth: 220 }}
          placeholder="Filter age group…" value={filterAge}
          onChange={e => setFilterAge(e.target.value)} />

        <button className="btn btn-ghost" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}
          onClick={handleSync} disabled={syncing}>
          <RefreshCw size={13} style={syncing ? { animation: 'spin 0.8s linear infinite' } : {}} />
          {syncing ? 'Syncing…' : 'Sync from Results'}
        </button>
      </div>

      {syncMsg && (
        <div className="records-sync-banner">{syncMsg}</div>
      )}

      {/* Body */}
      {loading ? (
        <div className="loading-container"><div className="loading-spinner" /></div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="records-empty">
          <Trophy size={44} style={{ color: 'var(--text-muted)', marginBottom: 14, opacity: 0.4 }} />
          <div style={{ color: 'var(--text-secondary)', fontSize: 15, fontWeight: 600, marginBottom: 6 }}>No records yet</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 13, maxWidth: 340, textAlign: 'center', lineHeight: 1.6 }}>
            Click <strong>Sync from Results</strong> to pull best marks from your recorded meet results,
            or <strong>Add Record</strong> to enter historical records manually.
          </div>
        </div>
      ) : (
        CAT_ORDER.filter(cat => grouped[cat]).map(cat => (
          <div key={cat} className="records-cat-block">
            <div className="records-cat-heading">
              <span>{CAT_LABELS[cat]}</span>
              <div className="records-cat-line" />
            </div>

            {Object.entries(grouped[cat])
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([evName, recs]) => (
                <div key={evName} className="records-event-group">
                  <div className="records-event-heading">
                    <ChevronRight size={12} className="records-chevron" />
                    {evName}
                    <span className="records-count">{recs.length} record{recs.length !== 1 ? 's' : ''}</span>
                  </div>

                  <div className="records-table-wrap">
                    <table className="records-table">
                      <thead>
                        <tr>
                          <th>Gender</th>
                          <th>Age Group</th>
                          <th>Mark</th>
                          {showWind(cat) && <th>Wind</th>}
                          <th>Athlete</th>
                          {scope === 'open' && <th>Team</th>}
                          <th>Meet</th>
                          <th>Date</th>
                          <th style={{ width: 60 }} />
                        </tr>
                      </thead>
                      <tbody>
                        {recs.map(rec => (
                          <tr key={rec.id} className={rec.is_auto ? '' : 'rec-manual'}>
                            <td>
                              <span className={`badge ${rec.gender === 'M' ? 'badge-blue' : rec.gender === 'F' ? 'badge-purple' : 'badge-neutral'}`}>
                                {GENDER_LABEL[rec.gender] ?? rec.gender}
                              </span>
                            </td>
                            <td className="rec-age">{rec.age_group || <span className="muted-val">Open</span>}</td>
                            <td className="rec-mark-cell">{rec.mark}</td>
                            {showWind(cat) && (
                              <td className="rec-wind-cell">
                                {windLabel(rec.wind)
                                  ? <span className={parseFloat(rec.wind) > 2 ? 'rec-wind-illegal' : 'rec-wind-val'}>{windLabel(rec.wind)}</span>
                                  : <span className="muted-val">—</span>
                                }
                              </td>
                            )}
                            <td className="rec-athlete">{rec.athlete_name || <span className="muted-val">—</span>}</td>
                            {scope === 'open' && <td className="rec-team">{rec.team || <span className="muted-val">—</span>}</td>}
                            <td className="rec-meet">{rec.meet_name || <span className="muted-val">—</span>}</td>
                            <td className="rec-date">{fmtDate(rec.meet_date) || <span className="muted-val">—</span>}</td>
                            <td className="rec-actions-cell">
                              {!rec.is_auto && (
                                <button className="btn btn-ghost btn-icon" style={{ padding: '2px 4px' }}
                                  onClick={() => openModal(rec)}>
                                  <Edit2 size={12} />
                                </button>
                              )}
                              <button className="btn btn-ghost btn-icon" style={{ padding: '2px 4px', color: 'var(--text-muted)' }}
                                onClick={() => handleDelete(rec.id)}>
                                <Trash2 size={12} />
                              </button>
                              {rec.is_auto && (
                                <span className="rec-auto-badge" title="Auto-computed from meet results">AUTO</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
          </div>
        ))
      )}

      {showModal && (
        <RecordModal
          record={editRec}
          scope={scope}
          tfEvents={tfEvents}
          onSave={load}
          onClose={closeModal}
        />
      )}
    </div>
  )
}
