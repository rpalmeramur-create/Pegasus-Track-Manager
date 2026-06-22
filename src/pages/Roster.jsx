import React, { useEffect, useState, useCallback, useRef } from 'react'
import { Search, UserPlus, Edit2, Trash2, X, Pencil, Upload, MapPin, User, Calendar, GitMerge, Printer } from 'lucide-react'
import { athleteApi } from '../mockStore.js'
import { useSettings } from '../SettingsContext.jsx'

const api = window.electronAPI ?? athleteApi

function getAgeGroup(age) {
  if (age <= 6)  return '5-6'
  if (age <= 8)  return '7-8'
  if (age <= 10) return '9-10'
  if (age <= 12) return '11-12'
  if (age <= 14) return '13-14'
  if (age <= 16) return '15-16'
  return '17-18'
}

function calcAge(dob) {
  if (!dob) return null
  return Math.floor((Date.now() - new Date(dob)) / (365.25 * 24 * 3600 * 1000))
}

// ─── Athlete Form Modal ───────────────────────────────────────
function AthleteModal({ athlete, teams, onSave, onClose }) {
  const { homeTeam } = useSettings()
  const isEditing = !!athlete?.id
  const [form, setForm] = useState({
    first_name:     athlete?.first_name     ?? '',
    last_name:      athlete?.last_name      ?? '',
    date_of_birth:  athlete?.date_of_birth  ?? '',
    gender:         athlete?.gender         ?? '',
    athlete_number: athlete?.athlete_number ?? '',
    team:           athlete?.team           ?? homeTeam,
    notes:          athlete?.notes          ?? '',
    ec1_name: athlete?.ec1_name ?? '',
    ec1_rel:  athlete?.ec1_rel  ?? '',
    ec1_ph:   athlete?.ec1_ph   ?? '',
    ec1_ph2:  athlete?.ec1_ph2  ?? '',
    ec2_name: athlete?.ec2_name ?? '',
    ec2_rel:  athlete?.ec2_rel  ?? '',
    ec2_ph:   athlete?.ec2_ph   ?? '',
    medical:    athlete?.medical    ?? '',
    shirt_size: athlete?.shirt_size ?? '',
  })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const set = (field, value) => {
    setForm(f => ({ ...f, [field]: value }))
    setErrors(e => ({ ...e, [field]: '' }))
  }

  const validate = () => {
    const e = {}
    if (!form.first_name.trim()) e.first_name = 'First name is required'
    if (!form.last_name.trim())  e.last_name  = 'Last name is required'
    if (!form.date_of_birth)     e.date_of_birth = 'Date of birth is required'
    if (!form.gender)            e.gender = 'Gender is required'
    if (!form.team.trim())       e.team = 'Team is required'
    if (form.date_of_birth) {
      const age = calcAge(form.date_of_birth + 'T00:00:00')
      if (age < 5 || age > 18) e.date_of_birth = 'Age must be between 5 and 18'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)
    try { await onSave(form) }
    finally { setSaving(false) }
  }

  const previewAge = form.date_of_birth ? calcAge(form.date_of_birth + 'T00:00:00') : null

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">{isEditing ? 'Edit Athlete' : 'Add Athlete'}</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={15} /></button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* First Name */}
          <div className="form-group">
            <label className="form-label">First Name <span style={{ color: 'var(--red)' }}>*</span></label>
            <input className="input" value={form.first_name}
              onChange={e => set('first_name', e.target.value)} placeholder="Jane" autoFocus />
            {errors.first_name && <span className="form-error">{errors.first_name}</span>}
          </div>

          {/* Last Name */}
          <div className="form-group">
            <label className="form-label">Last Name <span style={{ color: 'var(--red)' }}>*</span></label>
            <input className="input" value={form.last_name}
              onChange={e => set('last_name', e.target.value)} placeholder="Smith" />
            {errors.last_name && <span className="form-error">{errors.last_name}</span>}
          </div>

          {/* Date of Birth */}
          <div className="form-group">
            <label className="form-label">
              Date of Birth <span style={{ color: 'var(--red)' }}>*</span>
              {previewAge !== null && (
                <span style={{ color: 'var(--accent)', marginLeft: 6, textTransform: 'none', letterSpacing: 0 }}>
                  — Age {previewAge}
                </span>
              )}
            </label>
            <input className="input" type="date" value={form.date_of_birth}
              onChange={e => set('date_of_birth', e.target.value)} />
            {errors.date_of_birth && <span className="form-error">{errors.date_of_birth}</span>}
          </div>

          {/* Gender */}
          <div className="form-group">
            <label className="form-label">Gender <span style={{ color: 'var(--red)' }}>*</span></label>
            <select className="input" value={form.gender} onChange={e => set('gender', e.target.value)}>
              <option value="">Select...</option>
              <option value="M">Male</option>
              <option value="F">Female</option>
            </select>
            {errors.gender && <span className="form-error">{errors.gender}</span>}
          </div>

          {/* Team */}
          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label className="form-label">Team <span style={{ color: 'var(--red)' }}>*</span></label>
            <input
              className="input"
              list="team-suggestions"
              value={form.team}
              onChange={e => set('team', e.target.value)}
              placeholder={homeTeam}
            />
            <datalist id="team-suggestions">
              {teams.map(t => <option key={t} value={t} />)}
            </datalist>
            {errors.team && <span className="form-error">{errors.team}</span>}
          </div>

          {/* Athlete Number */}
          <div className="form-group">
            <label className="form-label">
              Athlete # &nbsp;
              <span style={{ color: 'var(--text-muted)', textTransform: 'none', letterSpacing: 0 }}>Optional</span>
            </label>
            <input className="input" value={form.athlete_number}
              onChange={e => set('athlete_number', e.target.value)}
              placeholder="Club ID or bib number" />
          </div>

          {/* Shirt Size */}
          <div className="form-group">
            <label className="form-label">
              Shirt Size &nbsp;
              <span style={{ color: 'var(--text-muted)', textTransform: 'none', letterSpacing: 0 }}>Optional</span>
            </label>
            <select className="input" value={form.shirt_size} onChange={e => set('shirt_size', e.target.value)}>
              <option value="">— Not set —</option>
              <optgroup label="Youth">
                <option value="YXS">Youth XS</option>
                <option value="YS">Youth S</option>
                <option value="YM">Youth M</option>
                <option value="YL">Youth L</option>
                <option value="YXL">Youth XL</option>
              </optgroup>
              <optgroup label="Adult">
                <option value="AS">Adult S</option>
                <option value="AM">Adult M</option>
                <option value="AL">Adult L</option>
                <option value="AXL">Adult XL</option>
                <option value="A2XL">Adult 2XL</option>
                <option value="A3XL">Adult 3XL</option>
              </optgroup>
            </select>
          </div>
        </div>

        {/* Notes */}
        <div className="form-group" style={{ marginTop: 16 }}>
          <label className="form-label">
            Notes &nbsp;
            <span style={{ color: 'var(--text-muted)', textTransform: 'none', letterSpacing: 0 }}>Optional</span>
          </label>
          <textarea className="input" value={form.notes}
            onChange={e => set('notes', e.target.value)}
            placeholder="Any notes about this athlete..." rows={2} />
        </div>

        {/* Emergency Contacts */}
        <div style={{
          marginTop: 20, paddingTop: 14,
          borderTop: '1px solid var(--border)',
          fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 600,
          letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)',
          marginBottom: 12,
        }}>Emergency Contacts</div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 8 }}>
          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label className="form-label">Contact 1 — Full Name</label>
            <input className="input" value={form.ec1_name}
              onChange={e => set('ec1_name', e.target.value)} placeholder="Parent / Guardian name" />
          </div>
          <div className="form-group">
            <label className="form-label">Relationship</label>
            <input className="input" value={form.ec1_rel}
              onChange={e => set('ec1_rel', e.target.value)} placeholder="Mother, Father…" />
          </div>
          <div className="form-group">
            <label className="form-label">Phone</label>
            <input className="input" type="tel" value={form.ec1_ph}
              onChange={e => set('ec1_ph', e.target.value)} placeholder="(555) 555-5555" />
          </div>
          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label className="form-label">Phone 2 &nbsp;<span style={{ color: 'var(--text-muted)', textTransform: 'none', letterSpacing: 0 }}>Optional</span></label>
            <input className="input" type="tel" value={form.ec1_ph2}
              onChange={e => set('ec1_ph2', e.target.value)} placeholder="Alternate number" />
          </div>

          <div className="form-group" style={{ gridColumn: 'span 2', marginTop: 4 }}>
            <label className="form-label">Contact 2 — Full Name &nbsp;<span style={{ color: 'var(--text-muted)', textTransform: 'none', letterSpacing: 0 }}>Optional</span></label>
            <input className="input" value={form.ec2_name}
              onChange={e => set('ec2_name', e.target.value)} placeholder="Second contact name" />
          </div>
          <div className="form-group">
            <label className="form-label">Relationship</label>
            <input className="input" value={form.ec2_rel}
              onChange={e => set('ec2_rel', e.target.value)} placeholder="Mother, Father…" />
          </div>
          <div className="form-group">
            <label className="form-label">Phone</label>
            <input className="input" type="tel" value={form.ec2_ph}
              onChange={e => set('ec2_ph', e.target.value)} placeholder="(555) 555-5555" />
          </div>
        </div>

        {/* Medical Notes */}
        <div style={{
          marginTop: 8, paddingTop: 14,
          borderTop: '1px solid var(--border)',
          fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 600,
          letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)',
          marginBottom: 12,
        }}>Medical Notes &nbsp;<span style={{ textTransform: 'none', letterSpacing: 0, fontFamily: 'var(--font-body)', fontWeight: 400, color: 'var(--text-muted)' }}>Optional</span></div>
        <div className="form-group">
          <textarea className="input" value={form.medical}
            onChange={e => set('medical', e.target.value)}
            placeholder="Allergies, conditions, medications, or other medical information…" rows={2} />
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : isEditing ? 'Save Changes' : 'Add Athlete'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Rename Team Modal ────────────────────────────────────────
function RenameTeamModal({ teamName, count, onConfirm, onClose }) {
  const [value, setValue] = useState(teamName)
  const [saving, setSaving] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => { inputRef.current?.select() }, [])

  const handleConfirm = async () => {
    if (!value.trim() || value.trim() === teamName) { onClose(); return }
    setSaving(true)
    await onConfirm(value.trim())
    setSaving(false)
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 420 }}>
        <div className="modal-header">
          <div className="modal-title">Rename Team</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={15} /></button>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 16, lineHeight: 1.6 }}>
          Renaming <strong style={{ color: 'var(--text-primary)' }}>{teamName}</strong> will
          update all {count} athlete{count !== 1 ? 's' : ''} on this team.
        </p>
        <div className="form-group">
          <label className="form-label">New Team Name</label>
          <input
            ref={inputRef}
            className="input"
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleConfirm()}
          />
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleConfirm} disabled={saving || !value.trim()}>
            {saving ? 'Renaming…' : 'Rename Team'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Merge Team Modal ─────────────────────────────────────────
function MergeTeamModal({ teamName, count, otherTeams, onConfirm, onClose }) {
  const [target, setTarget] = useState(otherTeams[0] ?? '')
  const [saving, setSaving] = useState(false)

  const handleConfirm = async () => {
    if (!target) return
    setSaving(true)
    await onConfirm(target)
    setSaving(false)
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 420 }}>
        <div className="modal-header">
          <div className="modal-title">Merge Team</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={15} /></button>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 16, lineHeight: 1.6 }}>
          Merge <strong style={{ color: 'var(--text-primary)' }}>{teamName}</strong> ({count} athlete{count !== 1 ? 's' : ''}) into another team.
          The source team will be removed.
        </p>
        <div className="form-group">
          <label className="form-label">Merge into</label>
          <select className="input" value={target} onChange={e => setTarget(e.target.value)}>
            {otherTeams.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleConfirm} disabled={saving || !target}>
            {saving ? 'Merging…' : 'Merge Team'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Delete Team Modal ────────────────────────────────────────
function DeleteTeamModal({ teamName, count, otherTeams, defaultReassign, onConfirm, onClose }) {
  const [reassignTo, setReassignTo] = useState(defaultReassign ?? otherTeams[0] ?? '')
  const [saving, setSaving] = useState(false)

  const handleConfirm = async () => {
    setSaving(true)
    await onConfirm(reassignTo)
    setSaving(false)
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 420 }}>
        <div className="modal-header">
          <div className="modal-title">Delete Team</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={15} /></button>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 16, lineHeight: 1.6 }}>
          Delete <strong style={{ color: 'var(--text-primary)' }}>{teamName}</strong>?
          {count > 0
            ? <> Its {count} athlete{count !== 1 ? 's' : ''} will be moved to the team below.</>
            : <> This team has no athletes and its profile will be removed.</>
          }
        </p>
        {count > 0 && (
          <div className="form-group">
            <label className="form-label">Move athletes to</label>
            <select className="input" value={reassignTo} onChange={e => setReassignTo(e.target.value)}>
              {otherTeams.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        )}
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-danger" onClick={handleConfirm} disabled={saving}>
            {saving ? 'Deleting…' : 'Delete Team'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Delete Confirm Modal ─────────────────────────────────────
function DeleteModal({ athlete, onConfirm, onClose }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 400 }}>
        <div className="modal-header">
          <div className="modal-title">Remove Athlete</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={15} /></button>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6 }}>
          Remove{' '}
          <strong style={{ color: 'var(--text-primary)' }}>
            {athlete.first_name} {athlete.last_name}
          </strong>{' '}
          from the active roster? Their historical records will be preserved.
        </p>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-danger" onClick={onConfirm}>Remove Athlete</button>
        </div>
      </div>
    </div>
  )
}

// ─── Clear Roster Modal ───────────────────────────────────────
function ClearRosterModal({ count, onConfirm, onClose }) {
  const [confirming, setConfirming] = useState(false)

  const handleConfirm = async () => {
    setConfirming(true)
    try { await onConfirm() }
    finally { setConfirming(false) }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 420 }}>
        <div className="modal-header">
          <div className="modal-title">Clear Roster</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={15} /></button>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.7, marginBottom: 8 }}>
          This will remove all{' '}
          <strong style={{ color: 'var(--text-primary)' }}>{count} athlete{count !== 1 ? 's' : ''}</strong>{' '}
          from the active roster. Historical meet results will be preserved, but the athletes will no longer appear in the roster.
        </p>
        <p style={{ color: 'var(--red, #ef4444)', fontSize: 13, lineHeight: 1.6 }}>
          This cannot be undone.
        </p>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-danger" onClick={handleConfirm} disabled={confirming}>
            {confirming ? 'Clearing…' : `Clear ${count} Athlete${count !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Import Preview Modal ─────────────────────────────────────
function ImportPreviewModal({ athletes, onConfirm, onClose }) {
  const [selected, setSelected] = useState(
    () => new Set(athletes.map((_, i) => i).filter(i => !athletes[i].duplicate))
  )
  const [importing, setImporting] = useState(false)

  const toggle = (i) => setSelected(prev => {
    const next = new Set(prev)
    next.has(i) ? next.delete(i) : next.add(i)
    return next
  })

  const allNew = athletes.filter(a => !a.duplicate)
  const toggleAll = () => {
    const allNewIdxs = allNew.map((_, j) => athletes.indexOf(allNew[j]))
    const allChecked = allNewIdxs.every(i => selected.has(i))
    setSelected(prev => {
      const next = new Set(prev)
      allNewIdxs.forEach(i => allChecked ? next.delete(i) : next.add(i))
      return next
    })
  }

  const handleConfirm = async () => {
    setImporting(true)
    await onConfirm(athletes.filter((_, i) => selected.has(i)))
    setImporting(false)
  }

  const dupCount = athletes.filter(a => a.duplicate).length

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 620 }}>
        <div className="modal-header">
          <div className="modal-title">Import from Hy-tek</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={15} /></button>
        </div>

        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.6 }}>
          Found <strong style={{ color: 'var(--text-primary)' }}>{athletes.length}</strong> athlete{athletes.length !== 1 ? 's' : ''} in the TCL file.
          {dupCount > 0 && <> <span style={{ color: 'var(--gold)' }}>{dupCount} already exist</span> in your roster and are unchecked by default.</>}
        </p>

        <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', marginBottom: 16 }}>
          {/* Header */}
          <div style={{
            display: 'grid', gridTemplateColumns: '32px 1fr 70px 110px 50px',
            gap: 8, padding: '8px 12px',
            background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border)',
            fontSize: 11, fontWeight: 600, letterSpacing: '0.07em',
            textTransform: 'uppercase', color: 'var(--text-muted)',
          }}>
            <input type="checkbox"
              checked={allNew.length > 0 && allNew.every((_, j) => selected.has(athletes.indexOf(allNew[j])))}
              onChange={toggleAll}
              style={{ cursor: 'pointer' }}
              title="Select / deselect all new athletes"
            />
            <div>Name</div>
            <div>Gender</div>
            <div>Date of Birth</div>
            <div>#</div>
          </div>

          {/* Rows */}
          <div style={{ maxHeight: 340, overflowY: 'auto' }}>
            {athletes.map((a, i) => (
              <div key={i} style={{
                display: 'grid', gridTemplateColumns: '32px 1fr 70px 110px 50px',
                gap: 8, padding: '8px 12px',
                borderBottom: '1px solid rgba(28,40,71,0.5)',
                alignItems: 'center',
                opacity: selected.has(i) ? 1 : 0.45,
                transition: 'opacity 0.1s',
              }}>
                <input type="checkbox" checked={selected.has(i)} onChange={() => toggle(i)} style={{ cursor: 'pointer' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <div className={`avatar avatar-${a.gender === 'M' ? 'male' : 'female'}`} style={{ width: 28, height: 28, fontSize: 11, flexShrink: 0 }}>
                    {a.first_name[0]}{a.last_name[0]}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {a.last_name}, {a.first_name}
                  </span>
                  {a.duplicate && <span className="badge badge-gold" style={{ fontSize: 10, flexShrink: 0 }}>Exists</span>}
                </div>
                <div>
                  <span className={`badge badge-${a.gender === 'M' ? 'blue' : 'gold'}`} style={{ fontSize: 10 }}>
                    {a.gender === 'M' ? 'Male' : 'Female'}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  {new Date(a.date_of_birth + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                  {a.athlete_number || '—'}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="modal-footer">
          <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginRight: 'auto' }}>
            {selected.size} athlete{selected.size !== 1 ? 's' : ''} selected
          </span>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleConfirm} disabled={importing || selected.size === 0}>
            {importing ? 'Importing…' : `Import ${selected.size}`}
          </button>
        </div>
      </div>
    </div>
  )
}

function resizeImageToDataUrl(file, maxPx = 256) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height))
      const w = Math.round(img.width  * scale)
      const h = Math.round(img.height * scale)
      const canvas = document.createElement('canvas')
      canvas.width  = w
      canvas.height = h
      canvas.getContext('2d').drawImage(img, 0, 0, w, h)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Failed to load image')) }
    img.src = url
  })
}

// ─── Team Profile Modal ───────────────────────────────────────
function TeamProfileModal({ teamName, profile, onSave, onClose }) {
  const [form, setForm] = useState({
    location:    profile?.location    ?? '',
    head_coach:  profile?.head_coach  ?? '',
    founded:     profile?.founded     ?? '',
    description: profile?.description ?? '',
    logo:        profile?.logo        ?? null,
  })
  const [saving, setSaving]         = useState(false)
  const [logoLoading, setLogoLoading] = useState(false)
  const logoInputRef = useRef(null)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleLogoChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoLoading(true)
    try {
      const dataUrl = await resizeImageToDataUrl(file, 256)
      set('logo', dataUrl)
    } catch {}
    finally { setLogoLoading(false) }
    e.target.value = ''
  }

  const handleSave = async () => {
    setSaving(true)
    try { await onSave({ name: teamName, ...form }) }
    finally { setSaving(false) }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 440 }}>
        <div className="modal-header">
          <div className="modal-title">Edit Team Profile</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={15} /></button>
        </div>

        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16, fontFamily: 'var(--font-display)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          {teamName}
        </div>

        {/* Logo upload */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 10,
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden', flexShrink: 0,
          }}>
            {logoLoading ? (
              <div className="loading-spinner" style={{ width: 20, height: 20 }} />
            ) : form.logo ? (
              <img src={form.logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0 }}>
                {teamName.slice(0, 2)}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <button className="btn btn-ghost" style={{ fontSize: 12 }}
              onClick={() => logoInputRef.current?.click()} disabled={logoLoading}>
              {form.logo ? 'Change Logo' : 'Upload Logo'}
            </button>
            {form.logo && (
              <button className="btn btn-ghost" style={{ fontSize: 12, color: 'var(--red, #ef4444)' }}
                onClick={() => set('logo', null)}>
                Remove
              </button>
            )}
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>PNG, JPG, or SVG</span>
          </div>
          <input ref={logoInputRef} type="file" accept="image/*"
            style={{ display: 'none' }} onChange={handleLogoChange} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group">
            <label className="form-label">Location</label>
            <input className="input" placeholder="e.g. Miami, FL"
              value={form.location} onChange={e => set('location', e.target.value)} autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">Head Coach</label>
            <input className="input" placeholder="e.g. Coach Johnson"
              value={form.head_coach} onChange={e => set('head_coach', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Year Founded</label>
            <input className="input" placeholder="e.g. 2015" style={{ maxWidth: 140 }}
              value={form.founded} onChange={e => set('founded', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="input" rows={3}
              placeholder="Short description or notes about this team..."
              value={form.description} onChange={e => set('description', e.target.value)} />
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving || logoLoading}>
            {saving ? 'Saving…' : 'Save Profile'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Athlete Profile Panel ────────────────────────────────────
const CATEGORY_LABELS = { track: 'Track', relay: 'Relay', field: 'Field', combined: 'Combined' }
const CAT_COLORS = { track: 'var(--accent)', relay: '#a78bfa', field: '#34d399', combined: '#f59e0b' }

function fmtProfileDate(d) {
  if (!d) return ''
  try { return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }
  catch { return d }
}

function PlaceBadge({ place }) {
  if (!place) return null
  const bg = place === 1 ? '#d97706' : place === 2 ? '#6b7280' : place === 3 ? '#92400e' : null
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: 22, height: 22, borderRadius: '50%', fontSize: 11, fontWeight: 700, flexShrink: 0,
      background: bg || 'var(--bg-tertiary)', color: bg ? '#fff' : 'var(--text-muted)',
    }}>{place}</span>
  )
}

function AthleteProfilePanel({ athlete, profile, loading, onClose }) {
  const { homeTeam } = useSettings()
  const [tab, setTab] = useState('prs')
  const [expandedMeet, setExpandedMeet] = useState(null)

  const prs     = profile?.prs     ?? []
  const history = profile?.history  ?? []
  const stats   = profile?.stats    ?? { meets: 0, events: 0, prs: 0 }

  const grouped = {}
  for (const pr of prs) {
    const cat = pr.category || 'track'
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(pr)
  }
  const cats = ['track', 'relay', 'field', 'combined'].filter(c => grouped[c])

  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,0,0,0.4)',
      }} />
      <div style={{
        position: 'fixed', right: 0, top: 0, bottom: 0, width: 520, zIndex: 401,
        background: 'var(--bg-secondary)',
        borderLeft: '1px solid var(--border-light)',
        boxShadow: 'var(--shadow-lg)',
        display: 'flex', flexDirection: 'column',
        animation: 'slideInRight 0.2s var(--ease)',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          padding: '20px 20px 16px', borderBottom: '1px solid var(--border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              className={`avatar avatar-${athlete.gender === 'M' ? 'male' : 'female'}`}
              style={{ width: 52, height: 52, fontSize: 18 }}
            >
              {athlete.first_name[0]}{athlete.last_name[0]}
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, lineHeight: 1.1 }}>
                {athlete.last_name.toUpperCase()}, {athlete.first_name}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 3 }}>
                Age {athlete.age} · {athlete.gender === 'M' ? 'Male' : 'Female'} · {getAgeGroup(athlete.age)}
                {athlete.athlete_number ? <span> · #{athlete.athlete_number}</span> : null}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>
                {athlete.team || homeTeam}
                {athlete.date_of_birth ? <span> · Born {fmtProfileDate(athlete.date_of_birth)}</span> : null}
              </div>
            </div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={15} /></button>
        </div>

        {/* Stats strip */}
        <div style={{ display: 'flex', gap: 1, background: 'var(--border)', borderBottom: '1px solid var(--border)' }}>
          {[
            { label: 'Meets',  value: stats.meets  },
            { label: 'Events', value: stats.events },
            { label: 'PRs',    value: stats.prs    },
          ].map(s => (
            <div key={s.label} style={{ flex: 1, textAlign: 'center', padding: '10px 0', background: 'var(--bg-secondary)' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--accent)' }}>
                {loading ? '—' : s.value}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', padding: '0 20px' }}>
          {[['prs', 'Personal Bests'], ['history', 'Meet History'], ['contact', 'Contact']].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '10px 16px 8px', fontSize: 13, fontWeight: 600,
              color: tab === key ? 'var(--accent)' : 'var(--text-muted)',
              borderBottom: tab === key ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom: -1, transition: 'color 0.15s',
            }}>{label}</button>
          ))}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {loading ? (
            <div className="loading-container" style={{ height: 120 }}><div className="loading-spinner" /></div>
          ) : tab === 'prs' ? (
            prs.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', paddingTop: 40 }}>
                No personal bests recorded yet.
              </div>
            ) : cats.map(cat => (
              <div key={cat} style={{ marginBottom: 20 }}>
                <div style={{
                  fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase',
                  color: CAT_COLORS[cat], paddingBottom: 6,
                  borderBottom: '1px solid var(--border)', marginBottom: 8,
                }}>
                  {CATEGORY_LABELS[cat]}
                </div>
                {grouped[cat].map(pr => (
                  <div key={pr.event_name} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '9px 0', borderBottom: '1px solid rgba(28,40,71,0.5)',
                  }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <span style={{ fontSize: 13, fontWeight: 500 }}>{pr.event_name}</span>
                        {pr.indoor ? <span className="badge badge-neutral" style={{ fontSize: 10 }}>Indoor</span> : null}
                      </div>
                      {(pr.meet_name || pr.meet_date || pr.date) && (
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                          {pr.meet_name}{pr.meet_name && (pr.meet_date || pr.date) ? ' · ' : ''}
                          {fmtProfileDate(pr.meet_date || pr.date)}
                        </div>
                      )}
                    </div>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 700, color: 'var(--accent)' }}>
                      {pr.mark}
                    </span>
                  </div>
                ))}
              </div>
            ))
          ) : tab === 'history' ? (
            history.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', paddingTop: 40 }}>
                No competition history yet.
              </div>
            ) : history.map(meet => {
              const isOpen = expandedMeet === meet.meet_id
              const hasPR  = meet.results.some(r => r.is_pr)
              return (
                <div key={meet.meet_id} style={{
                  marginBottom: 8, border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden',
                }}>
                  <button
                    onClick={() => setExpandedMeet(isOpen ? null : meet.meet_id)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center',
                      justifyContent: 'space-between', padding: '10px 14px',
                      background: isOpen ? 'var(--bg-tertiary)' : 'var(--bg-primary)',
                      border: 'none', cursor: 'pointer', textAlign: 'left',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{meet.meet_name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
                        {fmtProfileDate(meet.meet_date)}
                        {hasPR && <span style={{ color: '#f59e0b', marginLeft: 6 }}>★ PR</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {meet.results.length} event{meet.results.length !== 1 ? 's' : ''}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{isOpen ? '▲' : '▼'}</span>
                    </div>
                  </button>
                  {isOpen && (
                    <div style={{ background: 'var(--bg-secondary)' }}>
                      {meet.results.map((r, i) => (
                        <div key={i} style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '8px 14px', borderTop: '1px solid var(--border)',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <PlaceBadge place={r.place} />
                            <div>
                              <span style={{ fontSize: 13 }}>{r.event_name}</span>
                              {r.is_pr ? <span style={{ color: '#f59e0b', marginLeft: 6, fontSize: 11 }}>★ PR</span> : null}
                            </div>
                          </div>
                          <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: 'var(--accent)' }}>
                            {r.mark}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })
          ) : (
            /* Contact tab */
            <div>
              {[
                { label: 'Emergency Contact 1', name: athlete.ec1_name, rel: athlete.ec1_rel, ph: athlete.ec1_ph, ph2: athlete.ec1_ph2 },
                { label: 'Emergency Contact 2', name: athlete.ec2_name, rel: athlete.ec2_rel, ph: athlete.ec2_ph, ph2: null },
              ].map((ec, i) => (
                ec.name ? (
                  <div key={i} style={{
                    marginBottom: 14, padding: '12px 14px',
                    border: '1px solid var(--border)', borderRadius: 8,
                    background: 'var(--bg-primary)',
                  }}>
                    <div style={{
                      fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase',
                      color: 'var(--text-muted)', marginBottom: 8,
                    }}>{ec.label}</div>
                    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>{ec.name}</div>
                    {ec.rel && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>{ec.rel}</div>}
                    {ec.ph && (
                      <div style={{ fontSize: 13, color: 'var(--accent)', marginBottom: 2 }}>
                        📞 {ec.ph}
                      </div>
                    )}
                    {ec.ph2 && (
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                        📞 {ec.ph2}
                      </div>
                    )}
                  </div>
                ) : null
              ))}

              {!athlete.ec1_name && !athlete.ec2_name && (
                <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', paddingTop: 20, paddingBottom: 10 }}>
                  No emergency contacts on file.
                </div>
              )}

              {athlete.shirt_size && (
                <div style={{
                  marginTop: 6, padding: '10px 14px',
                  border: '1px solid var(--border)', borderRadius: 8,
                  background: 'var(--bg-primary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <div style={{
                    fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase',
                    color: 'var(--text-muted)',
                  }}>Shirt Size</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
                    {athlete.shirt_size}
                  </div>
                </div>
              )}

              {athlete.medical && (
                <div style={{
                  marginTop: 6, padding: '12px 14px',
                  border: '1px solid #7c2d2d', borderRadius: 8,
                  background: 'rgba(239,68,68,0.07)',
                }}>
                  <div style={{
                    fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase',
                    color: '#ef4444', marginBottom: 8,
                  }}>Medical Notes</div>
                  <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.55 }}>
                    {athlete.medical}
                  </div>
                </div>
              )}

              {athlete.notes && (
                <div style={{
                  marginTop: 10, padding: '12px 14px',
                  border: '1px solid var(--border)', borderRadius: 8,
                }}>
                  <div style={{
                    fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase',
                    color: 'var(--text-muted)', marginBottom: 8,
                  }}>Notes</div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                    {athlete.notes}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// ─── Roster Page ──────────────────────────────────────────────
// ─── Roster Print Helpers ─────────────────────────────────────
function chunk(arr, n) {
  const out = []
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n))
  return out
}

function printRosterHtml(ref) {
  const css = Array.from(document.styleSheets).flatMap(sheet => {
    try { return Array.from(sheet.cssRules).map(r => r.cssText) } catch { return [] }
  }).filter(t => {
    const s = t.trimStart()
    if (s.startsWith('@media') || s.startsWith('@font-face')) return false
    return s.includes('.print-sheet') || s.includes('.pbreak')
  }).join('\n')
  const html = ref.current?.innerHTML ?? ''
  if (window.electronAPI?.printSheet && html)
    window.electronAPI.printSheet({ html, css })
      .then(r => { if (r && !r.success) alert(`Print failed: ${r.reason}`) })
      .catch(err => alert(`Print error: ${err?.message ?? err}`))
  else window.print()
}

function saveRosterPdf(ref, label) {
  const css = Array.from(document.styleSheets).flatMap(sheet => {
    try { return Array.from(sheet.cssRules).map(r => r.cssText) } catch { return [] }
  }).filter(t => {
    const s = t.trimStart()
    if (s.startsWith('@media') || s.startsWith('@font-face')) return false
    return s.includes('.print-sheet') || s.includes('.pbreak')
  }).join('\n')
  const html = ref.current?.innerHTML ?? ''
  if (window.electronAPI?.savePDF && html)
    window.electronAPI.savePDF({ html, css, suggestedName: `${label}.pdf` })
      .catch(err => alert(`PDF error: ${err?.message ?? err}`))
}

const SHIRT_ORDER = ['YXS','YS','YM','YL','YXL','AS','AM','AL','AXL','A2XL','A3XL']
const SHIRT_LABEL = { YXS:'Youth XS', YS:'Youth S', YM:'Youth M', YL:'Youth L', YXL:'Youth XL',
  AS:'Adult S', AM:'Adult M', AL:'Adult L', AXL:'Adult XL', A2XL:'Adult 2XL', A3XL:'Adult 3XL' }

const REPORT_TYPES = [
  { id: 'roster',   label: 'Roster Sheet' },
  { id: 'contacts', label: 'Emergency Contacts' },
  { id: 'uniforms', label: 'Uniform Sizes' },
]

function PrintRosterModal({ athletes, teams, homeTeam, onClose }) {
  const printRef = useRef(null)
  const [reportType, setReportType] = useState('roster')
  const [filterTeam, setFilterTeam]     = useState('all')
  const [filterGender, setFilterGender] = useState('all')

  const filtered = athletes
    .filter(a => filterTeam   === 'all' || (a.team || homeTeam) === filterTeam)
    .filter(a => filterGender === 'all' || a.gender === filterGender)
    .sort((a, b) => a.last_name.localeCompare(b.last_name) || a.first_name.localeCompare(b.first_name))

  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const teamLabel   = filterTeam   === 'all' ? 'All Teams' : filterTeam
  const genderLabel = filterGender === 'all' ? '' : filterGender === 'M' ? ' · Boys' : ' · Girls'

  const sheetHeader = (title, subtitle) => (
    <div style={{ borderBottom: '2pt solid #111', paddingBottom: 6, marginBottom: 10 }}>
      <div style={{ fontSize: '8pt', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#555' }}>
        {homeTeam.toUpperCase()}
      </div>
      <div style={{ fontSize: '16pt', fontWeight: 800, lineHeight: 1.1, margin: '2px 0' }}>{title}</div>
      <div style={{ fontSize: '8.5pt', color: '#444' }}>{subtitle}</div>
    </div>
  )

  // ── Roster table ──────────────────────────────────────────────
  const rosterPages = chunk(filtered, 36)
  const rosterSheets = rosterPages.map((rows, pi) => (
    <div key={pi} className="print-sheet" style={{ fontFamily: 'Arial, sans-serif', color: '#111', background: '#fff',
      pageBreakAfter: pi < rosterPages.length - 1 ? 'always' : 'auto' }}>
      {sheetHeader('Team Roster', `${teamLabel}${genderLabel} · ${today} · ${filtered.length} athletes`)}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8.5pt' }}>
        <thead>
          <tr style={{ borderBottom: '1.5pt solid #000' }}>
            {['Name','Age','G','Age Group','Team','Bib #','Shirt'].map(h => (
              <th key={h} style={{ textAlign: h === 'Name' || h === 'Team' ? 'left' : 'center',
                padding: '4px 5px', fontSize: '7.5pt', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((a, i) => (
            <tr key={a.id} style={{ background: i % 2 === 0 ? '#fff' : '#f4f6fa', borderBottom: '0.5pt solid #dde' }}>
              <td style={{ padding: '4px 5px', fontWeight: 600 }}>{a.last_name}, {a.first_name}</td>
              <td style={{ padding: '4px 5px', textAlign: 'center' }}>{a.age}</td>
              <td style={{ padding: '4px 5px', textAlign: 'center' }}>{a.gender}</td>
              <td style={{ padding: '4px 5px', textAlign: 'center', color: '#555' }}>{getAgeGroup(a.age)}</td>
              <td style={{ padding: '4px 5px', color: '#555' }}>{a.team || homeTeam}</td>
              <td style={{ padding: '4px 5px', textAlign: 'center', fontFamily: 'monospace' }}>{a.athlete_number || '—'}</td>
              <td style={{ padding: '4px 5px', textAlign: 'center' }}>{a.shirt_size || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {pi < rosterPages.length - 1 && (
        <div style={{ marginTop: 8, fontSize: '7pt', color: '#aaa', textAlign: 'right' }}>
          Page {pi + 1} of {rosterPages.length}
        </div>
      )}
    </div>
  ))

  // ── Emergency contacts ─────────────────────────────────────────
  const contactPages = chunk(filtered, 10)
  const contactSheets = contactPages.map((rows, pi) => (
    <div key={pi} className="print-sheet" style={{ fontFamily: 'Arial, sans-serif', color: '#111', background: '#fff',
      pageBreakAfter: pi < contactPages.length - 1 ? 'always' : 'auto' }}>
      {sheetHeader('Emergency Contacts', `${teamLabel}${genderLabel} · ${today} · CONFIDENTIAL`)}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8pt' }}>
        {rows.map(a => (
          <div key={a.id} style={{ border: '0.75pt solid #ccc', borderRadius: 4, padding: '6pt 8pt',
            pageBreakInside: 'avoid', background: '#fff' }}>
            <div style={{ fontWeight: 800, fontSize: '9.5pt', borderBottom: '0.5pt solid #ddd', paddingBottom: 3, marginBottom: 4 }}>
              {a.last_name.toUpperCase()}, {a.first_name}
              <span style={{ fontWeight: 400, fontSize: '7.5pt', color: '#555', marginLeft: 6 }}>
                Age {a.age} · {a.gender === 'M' ? 'M' : 'F'} · {a.team || homeTeam}
                {a.athlete_number ? ` · #${a.athlete_number}` : ''}
              </span>
            </div>
            {a.ec1_name ? (
              <div style={{ marginBottom: 3, fontSize: '8pt' }}>
                <span style={{ color: '#555', fontSize: '7pt', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Contact 1 </span>
                <strong>{a.ec1_name}</strong>
                {a.ec1_rel ? ` (${a.ec1_rel})` : ''}<br />
                {a.ec1_ph  && <span>📞 {a.ec1_ph}</span>}
                {a.ec1_ph2 && <span style={{ marginLeft: 8, color: '#555' }}>📞 {a.ec1_ph2}</span>}
              </div>
            ) : (
              <div style={{ fontSize: '7.5pt', color: '#aaa', marginBottom: 3 }}>No contacts on file</div>
            )}
            {a.ec2_name && (
              <div style={{ marginBottom: 3, fontSize: '8pt' }}>
                <span style={{ color: '#555', fontSize: '7pt', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Contact 2 </span>
                <strong>{a.ec2_name}</strong>
                {a.ec2_rel ? ` (${a.ec2_rel})` : ''}<br />
                {a.ec2_ph && <span>📞 {a.ec2_ph}</span>}
              </div>
            )}
            {a.medical && (
              <div style={{ marginTop: 3, fontSize: '7.5pt', color: '#c00',
                background: '#fff5f5', border: '0.5pt solid #fbb', borderRadius: 3, padding: '2pt 4pt' }}>
                ⚠ {a.medical}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  ))

  // ── Uniform sizes ──────────────────────────────────────────────
  const bySizeMap = {}
  const unset = []
  for (const a of filtered) {
    if (a.shirt_size) {
      if (!bySizeMap[a.shirt_size]) bySizeMap[a.shirt_size] = []
      bySizeMap[a.shirt_size].push(a)
    } else { unset.push(a) }
  }
  const sizeGroups = [
    ...SHIRT_ORDER.filter(s => bySizeMap[s]).map(s => ({ size: s, label: SHIRT_LABEL[s], athletes: bySizeMap[s] })),
    ...(unset.length ? [{ size: 'UNSET', label: 'Not Set', athletes: unset }] : []),
  ]
  const uniformSheets = (
    <div className="print-sheet" style={{ fontFamily: 'Arial, sans-serif', color: '#111', background: '#fff' }}>
      {sheetHeader('Uniform Sizes', `${teamLabel}${genderLabel} · ${today}`)}
      {sizeGroups.length === 0 ? (
        <div style={{ color: '#aaa', textAlign: 'center', padding: '20pt' }}>No shirt sizes recorded.</div>
      ) : sizeGroups.map(group => (
        <div key={group.size} style={{ marginBottom: '12pt', pageBreakInside: 'avoid' }}>
          <div style={{ background: '#1e2535', color: '#fff', padding: '3pt 8pt', borderRadius: 3,
            fontSize: '9pt', fontWeight: 700, marginBottom: 4, display: 'flex', justifyContent: 'space-between' }}>
            <span>{group.label}</span>
            <span>{group.athletes.length} athlete{group.athletes.length !== 1 ? 's' : ''}</span>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8.5pt' }}>
            <tbody>
              {group.athletes.map((a, i) => (
                <tr key={a.id} style={{ background: i % 2 === 0 ? '#fff' : '#f4f6fa', borderBottom: '0.5pt solid #dde' }}>
                  <td style={{ padding: '3px 6px', fontWeight: 600, width: '40%' }}>{a.last_name}, {a.first_name}</td>
                  <td style={{ padding: '3px 6px', color: '#555', width: '15%' }}>Age {a.age}</td>
                  <td style={{ padding: '3px 6px', color: '#555', width: '10%' }}>{a.gender}</td>
                  <td style={{ padding: '3px 6px', color: '#555' }}>{a.team || homeTeam}</td>
                  {a.athlete_number && <td style={{ padding: '3px 6px', color: '#888', textAlign: 'right' }}>#{a.athlete_number}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  )

  const sheets = reportType === 'roster' ? rosterSheets
    : reportType === 'contacts' ? contactSheets
    : [uniformSheets]

  const pdfLabel = `${homeTeam.replace(/\s+/g, '-')}-${reportType}`

  const sideLabelStyle = { fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
    letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: 6 }

  return (
    <div className="print-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="print-preview-container"
        style={{ display: 'flex', flexDirection: 'column', maxWidth: 1050, alignItems: 'stretch', height: '88vh' }}>

        {/* Toolbar */}
        <div className="print-toolbar">
          <span style={{ fontWeight: 600, fontSize: 14 }}>Roster Reports</span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost" onClick={() => saveRosterPdf(printRef, pdfLabel)}>⬇ Save PDF</button>
            <button className="btn btn-primary" onClick={() => printRosterHtml(printRef)}>🖨 Print</button>
            <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={15} /></button>
          </div>
        </div>

        {/* Body */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

          {/* Options sidebar */}
          <div style={{ width: 190, flexShrink: 0, background: 'var(--bg-secondary)',
            borderRight: '1px solid var(--border)', overflowY: 'auto', padding: '12px 10px' }}>

            <div style={sideLabelStyle}>Report Type</div>
            {REPORT_TYPES.map(rt => (
              <button key={rt.id} onClick={() => setReportType(rt.id)}
                style={{ display: 'block', width: '100%', textAlign: 'left', padding: '7px 10px',
                  marginBottom: 3, borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12,
                  background: reportType === rt.id ? 'var(--accent-glow)' : 'transparent',
                  color: reportType === rt.id ? 'var(--accent)' : 'var(--text-secondary)',
                  fontWeight: reportType === rt.id ? 600 : 400,
                  borderLeft: `3px solid ${reportType === rt.id ? 'var(--accent)' : 'transparent'}`,
                }}>
                {rt.label}
              </button>
            ))}

            <div style={{ ...sideLabelStyle, marginTop: 18 }}>Team</div>
            <select className="input" style={{ fontSize: 11, padding: '5px 8px', marginBottom: 12 }}
              value={filterTeam} onChange={e => setFilterTeam(e.target.value)}>
              <option value="all">All Teams</option>
              {teams.map(t => <option key={t} value={t}>{t}</option>)}
            </select>

            <div style={sideLabelStyle}>Gender</div>
            <select className="input" style={{ fontSize: 11, padding: '5px 8px' }}
              value={filterGender} onChange={e => setFilterGender(e.target.value)}>
              <option value="all">All</option>
              <option value="M">Boys (M)</option>
              <option value="F">Girls (F)</option>
            </select>

            <div style={{ marginTop: 18, padding: '10px 8px', background: 'var(--bg-tertiary)',
              borderRadius: 6, fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>
              {filtered.length} athlete{filtered.length !== 1 ? 's' : ''} selected
            </div>
          </div>

          {/* Preview */}
          <div ref={printRef} className="print-canvas-scroll">
            {filtered.length === 0
              ? <div style={{ padding: 40, textAlign: 'center', color: '#bbb', fontSize: 13 }}>No athletes match the selected filters.</div>
              : sheets
            }
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Roster() {
  const { homeTeam: HOME_TEAM } = useSettings()
  const [athletes, setAthletes]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [filterGender, setGender] = useState('all')
  const [filterAge, setFilterAge] = useState('all')
  const [filterTeam, setTeam]     = useState('all')
  const [showAdd, setShowAdd]     = useState(false)
  const [editing, setEditing]     = useState(null)
  const [deleting, setDeleting]   = useState(null)
  const [renaming, setRenaming]   = useState(null) // team name string
  const [mergingTeam, setMergingTeam]   = useState(null) // team name string
  const [deletingTeam, setDeletingTeam] = useState(null) // team name string
  const [viewing, setViewing]               = useState(null)
  const [athleteProfile, setAthleteProfile] = useState(null)
  const [loadingProfile, setLoadingProfile] = useState(false)
  const [importAthletes, setImportAthletes] = useState(null)
  const [importing, setImporting]       = useState(false)
  const [showPrint, setShowPrint]       = useState(false)
  const [clearingRoster, setClearingRoster] = useState(false)
  const [teamProfiles, setTeamProfiles] = useState({}) // keyed by team name
  const [editingProfile, setEditingProfile] = useState(null) // team name string

  const loadAthletes = useCallback(() => {
    setLoading(true)
    api.getAthletes()
      .then(data => { setAthletes(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => { loadAthletes() }, [loadAthletes])

  useEffect(() => {
    if (!api.getTeamProfiles) return
    api.getTeamProfiles()
      .then(rows => {
        const map = {}
        for (const p of rows) map[p.name] = p
        setTeamProfiles(map)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!viewing) { setAthleteProfile(null); return }
    setLoadingProfile(true)
    api.getAthleteProfile(viewing.id)
      .then(data => { setAthleteProfile(data); setLoadingProfile(false) })
      .catch(() => setLoadingProfile(false))
  }, [viewing])

  const handleAdd = async (form) => {
    const a = await api.createAthlete(form)
    setAthletes(prev => [...prev, a])
    setShowAdd(false)
  }

  const handleEdit = async (form) => {
    const a = await api.updateAthlete(editing.id, form)
    setAthletes(prev => prev.map(x => x.id === editing.id ? a : x))
    setEditing(null)
  }

  const handleDelete = async () => {
    await api.deleteAthlete(deleting.id)
    setAthletes(prev => prev.filter(x => x.id !== deleting.id))
    setDeleting(null)
  }

  const handleStartImport = async () => {
    if (!api.importTCL) return
    setImporting(true)
    try {
      const result = await api.importTCL()
      if (!result) return                          // user cancelled dialog
      if (result.error) { alert(`Import failed: ${result.error}`); return }
      setImportAthletes(result)
    } catch (err) {
      alert(`Import error: ${err.message}`)
    } finally {
      setImporting(false)
    }
  }

  const handleConfirmImport = async (selected) => {
    for (const a of selected) {
      const { duplicate, ...data } = a
      const created = await api.createAthlete(data)
      setAthletes(prev => [...prev, created])
    }
    setImportAthletes(null)
  }

  const handleClearRoster = async () => {
    if (!api.clearRoster) { alert('Clear roster is not available — please restart Electron.'); return }
    await api.clearRoster()
    setAthletes([])
    setClearingRoster(false)
  }

  const handleRenameTeam = async (newName) => {
    await api.renameTeam(renaming, newName)
    setAthletes(prev => prev.map(a =>
      (a.team || HOME_TEAM) === renaming ? { ...a, team: newName } : a
    ))
    if (filterTeam === renaming) setTeam(newName)
    // Migrate profile key to new name
    setTeamProfiles(prev => {
      const next = { ...prev }
      if (next[renaming]) {
        next[newName] = { ...next[renaming], name: newName }
        delete next[renaming]
      } else {
        delete next[renaming]
      }
      return next
    })
    setRenaming(null)
  }

  const handleMergeTeam = async (targetTeam) => {
    await api.mergeTeam(mergingTeam, targetTeam)
    setAthletes(prev => prev.map(a =>
      (a.team || HOME_TEAM) === mergingTeam ? { ...a, team: targetTeam } : a
    ))
    if (filterTeam === mergingTeam) setTeam('all')
    setTeamProfiles(prev => { const next = { ...prev }; delete next[mergingTeam]; return next })
    setMergingTeam(null)
  }

  const handleDeleteTeam = async (reassignTo) => {
    await api.deleteTeam(deletingTeam, reassignTo)
    setAthletes(prev => prev.map(a =>
      (a.team || HOME_TEAM) === deletingTeam ? { ...a, team: reassignTo } : a
    ))
    if (filterTeam === deletingTeam) setTeam('all')
    setTeamProfiles(prev => { const next = { ...prev }; delete next[deletingTeam]; return next })
    setDeletingTeam(null)
  }

  const handleSaveProfile = async (data) => {
    if (!api.saveTeamProfile) return
    const saved = await api.saveTeamProfile(data)
    setTeamProfiles(prev => ({ ...prev, [saved.name]: saved }))
    setEditingProfile(null)
  }

  // Distinct teams sorted: home team first, then alphabetical
  const teams =Array.from(new Set(athletes.map(a => a.team || HOME_TEAM)))
    .sort((a, b) => a === HOME_TEAM ? -1 : b === HOME_TEAM ? 1 : a.localeCompare(b))
  const multipleTeams = teams.length > 1

  // ── Filters ─────────────────────────────────────────────────
  const filtered = athletes.filter(a => {
    const q = search.toLowerCase()
    const matchSearch = !q
      || `${a.first_name} ${a.last_name}`.toLowerCase().includes(q)
      || (a.athlete_number && a.athlete_number.includes(q))
    const matchGender = filterGender === 'all' || a.gender === filterGender
    const matchAge    = filterAge    === 'all' || getAgeGroup(a.age) === filterAge
    const matchTeam   = filterTeam   === 'all' || (a.team || HOME_TEAM) === filterTeam
    return matchSearch && matchGender && matchAge && matchTeam
  })

  const countFor = (team) => athletes.filter(a => (a.team || HOME_TEAM) === team).length
  const maleCount   = filtered.filter(a => a.gender === 'M').length
  const femaleCount = filtered.filter(a => a.gender === 'F').length
  const hasFilters  = search || filterGender !== 'all' || filterAge !== 'all'

  const clearFilters = () => { setSearch(''); setGender('all'); setFilterAge('all') }

  return (
    <div className="roster-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="page-title">TEAMS</div>
          <div className="page-subtitle">
            {filtered.length} athletes &middot; {maleCount} male &middot; {femaleCount} female
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {api.importTCL && (
            <button className="btn btn-ghost" onClick={handleStartImport} disabled={importing}>
              <Upload size={15} /> {importing ? 'Reading…' : 'Import Hy-tek'}
            </button>
          )}
          {athletes.length > 0 && (
            <>
              <button className="btn btn-ghost" onClick={() => setShowPrint(true)}>
                <Printer size={15} /> Reports
              </button>
              <button className="btn btn-danger" onClick={() => setClearingRoster(true)}>
                <Trash2 size={15} /> Clear Roster
              </button>
            </>
          )}
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
            <UserPlus size={15} /> Add Athlete
          </button>
        </div>
      </div>

      {/* Team Profile Cards */}
      <div className="team-cards">
        {multipleTeams && (
          <div
            className={`team-card ${filterTeam === 'all' ? 'active' : ''}`}
            onClick={() => setTeam('all')}
          >
            <div className="team-card-header">
              <div className="team-card-name">All Teams</div>
            </div>
            <hr className="team-card-divider" />
            <div className="team-card-count">{athletes.length}</div>
            <div className="team-card-breakdown">
              {athletes.filter(a => a.gender === 'M').length}M &middot; {athletes.filter(a => a.gender === 'F').length}F
            </div>
          </div>
        )}
        {teams.map(t => {
          const profile = teamProfiles[t]
          const count   = countFor(t)
          const mc = athletes.filter(a => (a.team || HOME_TEAM) === t && a.gender === 'M').length
          const fc = athletes.filter(a => (a.team || HOME_TEAM) === t && a.gender === 'F').length
          return (
            <div
              key={t}
              className={`team-card ${filterTeam === t ? 'active' : ''}`}
              onClick={() => setTeam(filterTeam === t ? 'all' : t)}
            >
              {/* Logo + name + actions row */}
              <div className="team-card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
                  <div className="team-card-logo">
                    {profile?.logo
                      ? <img src={profile.logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 6 }} />
                      : <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0 }}>
                          {t.slice(0, 2)}
                        </span>
                    }
                  </div>
                  <div className="team-card-name">{t}</div>
                </div>
                <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                  <button
                    className="btn btn-ghost btn-icon"
                    style={{ padding: 3, width: 22, height: 22, opacity: 0.55 }}
                    title={`Rename ${t}`}
                    onClick={e => { e.stopPropagation(); setRenaming(t) }}
                  >
                    <Edit2 size={11} />
                  </button>
                  {api.saveTeamProfile && (
                    <button
                      className="btn btn-ghost btn-icon"
                      style={{ padding: 3, width: 22, height: 22, opacity: 0.55 }}
                      title="Edit team profile"
                      onClick={e => { e.stopPropagation(); setEditingProfile(t) }}
                    >
                      <Pencil size={11} />
                    </button>
                  )}
                  {teams.length > 1 && (
                    <button
                      className="btn btn-ghost btn-icon"
                      style={{ padding: 3, width: 22, height: 22, opacity: 0.55 }}
                      title={`Merge ${t} into another team`}
                      onClick={e => { e.stopPropagation(); setMergingTeam(t) }}
                    >
                      <GitMerge size={11} />
                    </button>
                  )}
                  <button
                    className="btn btn-ghost btn-icon"
                    style={{ padding: 3, width: 22, height: 22, opacity: 0.55, color: 'var(--red)' }}
                    title={`Delete ${t}`}
                    onClick={e => { e.stopPropagation(); setDeletingTeam(t) }}
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
              {(profile?.location || profile?.head_coach || profile?.founded) && (
                <div className="team-card-meta">
                  {profile.location   && <div className="team-card-meta-row"><MapPin size={10} /><span>{profile.location}</span></div>}
                  {profile.head_coach && <div className="team-card-meta-row"><User size={10} /><span>{profile.head_coach}</span></div>}
                  {profile.founded    && <div className="team-card-meta-row"><Calendar size={10} /><span>Est. {profile.founded}</span></div>}
                </div>
              )}
              <hr className="team-card-divider" />
              <div className="team-card-count">{count}</div>
              <div className="team-card-breakdown">{mc}M &middot; {fc}F</div>
              {profile?.description && (
                <div className="team-card-desc">{profile.description}</div>
              )}
            </div>
          )
        })}
      </div>

      {/* Toolbar */}
      <div className="toolbar">
        <div className="search-bar">
          <Search size={14} />
          <input className="input" placeholder="Search by name or #..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        <select className="input filter-select" value={filterGender} onChange={e => setGender(e.target.value)}>
          <option value="all">All Genders</option>
          <option value="M">Male</option>
          <option value="F">Female</option>
        </select>

        <select className="input filter-select" value={filterAge} onChange={e => setFilterAge(e.target.value)}>
          <option value="all">All Age Groups</option>
          <option value="5-6">5–6</option>
          <option value="7-8">7–8</option>
          <option value="9-10">9–10</option>
          <option value="11-12">11–12</option>
          <option value="13-14">13–14</option>
          <option value="15-16">15–16</option>
          <option value="17-18">17–18</option>
        </select>

        {hasFilters && (
          <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={clearFilters}>
            <X size={13} /> Clear
          </button>
        )}

        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>
          {filtered.length} result{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      <div className="roster-table-wrap">
        {loading ? (
          <div className="loading-container"><div className="loading-spinner" /></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <UserPlus size={44} />
            <p style={{ fontSize: 14 }}>
              {hasFilters || filterTeam !== 'all'
                ? 'No athletes match your filters'
                : 'No athletes in the roster yet'}
            </p>
            {!hasFilters && filterTeam === 'all' && (
              <button className="btn btn-primary" style={{ marginTop: 8 }} onClick={() => setShowAdd(true)}>
                <UserPlus size={14} /> Add First Athlete
              </button>
            )}
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Athlete</th>
                  {multipleTeams && <th>Team</th>}
                  <th>Gender</th>
                  <th>Age</th>
                  <th>Age Group</th>
                  <th>Date of Birth</th>
                  <th>#</th>
                  <th style={{ width: 80, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(a => (
                  <tr key={a.id} onClick={() => setViewing(a)} style={{ cursor: 'pointer' }}>
                    {/* Name + Avatar */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className={`avatar avatar-${a.gender === 'M' ? 'male' : 'female'}`}>
                          {a.first_name[0]}{a.last_name[0]}
                        </div>
                        <span style={{ fontWeight: 500 }}>
                          {a.last_name}, {a.first_name}
                        </span>
                      </div>
                    </td>

                    {/* Team — only visible when multiple teams exist */}
                    {multipleTeams && (
                      <td>
                        <span className={`badge ${(a.team || HOME_TEAM) === HOME_TEAM ? 'badge-blue' : 'badge-neutral'}`}>
                          {a.team || HOME_TEAM}
                        </span>
                      </td>
                    )}

                    {/* Gender */}
                    <td>
                      <span className={`badge badge-${a.gender === 'M' ? 'blue' : 'gold'}`}>
                        {a.gender === 'M' ? 'Male' : 'Female'}
                      </span>
                    </td>

                    {/* Age */}
                    <td style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600 }}>
                      {a.age}
                    </td>

                    {/* Age Group */}
                    <td><span className="badge badge-neutral">{getAgeGroup(a.age)}</span></td>

                    {/* DOB */}
                    <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                      {new Date(a.date_of_birth + 'T00:00:00').toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric',
                      })}
                    </td>

                    {/* Athlete # */}
                    <td style={{ color: 'var(--text-muted)', fontSize: 12, fontFamily: 'monospace' }}>
                      {a.athlete_number || '—'}
                    </td>

                    {/* Actions */}
                    <td>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4 }}>
                        <button className="btn btn-ghost btn-icon" onClick={e => { e.stopPropagation(); setEditing(a) }} title="Edit">
                          <Edit2 size={14} />
                        </button>
                        <button className="btn btn-danger btn-icon" onClick={e => { e.stopPropagation(); setDeleting(a) }} title="Remove">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      {showAdd  && <AthleteModal                    teams={teams} onSave={handleAdd}  onClose={() => setShowAdd(false)} />}
      {editing  && <AthleteModal athlete={editing}  teams={teams} onSave={handleEdit} onClose={() => setEditing(null)} />}
      {deleting && <DeleteModal  athlete={deleting} onConfirm={handleDelete}           onClose={() => setDeleting(null)} />}
      {renaming && (
        <RenameTeamModal
          teamName={renaming}
          count={countFor(renaming)}
          onConfirm={handleRenameTeam}
          onClose={() => setRenaming(null)}
        />
      )}
      {editingProfile && (
        <TeamProfileModal
          teamName={editingProfile}
          profile={teamProfiles[editingProfile]}
          onSave={handleSaveProfile}
          onClose={() => setEditingProfile(null)}
        />
      )}
      {mergingTeam && (
        <MergeTeamModal
          teamName={mergingTeam}
          count={countFor(mergingTeam)}
          otherTeams={teams.filter(t => t !== mergingTeam)}
          onConfirm={handleMergeTeam}
          onClose={() => setMergingTeam(null)}
        />
      )}
      {deletingTeam && (
        <DeleteTeamModal
          teamName={deletingTeam}
          count={countFor(deletingTeam)}
          otherTeams={teams.filter(t => t !== deletingTeam)}
          defaultReassign={HOME_TEAM !== deletingTeam ? HOME_TEAM : teams.find(t => t !== deletingTeam) ?? ''}
          onConfirm={handleDeleteTeam}
          onClose={() => setDeletingTeam(null)}
        />
      )}

      {/* Clear roster confirm */}
      {clearingRoster && (
        <ClearRosterModal
          count={athletes.length}
          onConfirm={handleClearRoster}
          onClose={() => setClearingRoster(false)}
        />
      )}

      {/* Import preview */}
      {importAthletes && (
        <ImportPreviewModal
          athletes={importAthletes}
          onConfirm={handleConfirmImport}
          onClose={() => setImportAthletes(null)}
        />
      )}

      {/* Roster report print modal */}
      {showPrint && (
        <PrintRosterModal
          athletes={athletes}
          teams={teams}
          homeTeam={HOME_TEAM}
          onClose={() => setShowPrint(false)}
        />
      )}

      {/* Athlete profile panel */}
      {viewing && (
        <AthleteProfilePanel
          athlete={viewing}
          profile={athleteProfile}
          loading={loadingProfile}
          onClose={() => setViewing(null)}
        />
      )}
    </div>
  )
}
