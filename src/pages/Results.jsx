import React, { useEffect, useState, useCallback } from 'react'
import {
  Trophy, Calendar, MapPin, Users, ChevronRight, X,
  List, Star, Printer,
} from 'lucide-react'
import { PrintAwardLabelsModal } from '../components/PrintAwardLabels.jsx'

// ─── Constants ────────────────────────────────────────────
const SCORE_TABLE = { 1: 8, 2: 6, 3: 5, 4: 4, 5: 3, 6: 2, 7: 1 }

const STATUS_CFG = {
  upcoming:  { label: 'Upcoming',  badge: 'badge-gold' },
  active:    { label: 'Active',    badge: 'badge-green' },
  completed: { label: 'Completed', badge: 'badge-neutral' },
  cancelled: { label: 'Cancelled', badge: 'badge-red' },
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

// ─── Browser fallback (read-only; real data comes from Electron) ──
const FALLBACK = {
  getMeets:            () => Promise.resolve([]),
  getMeetDetail:       () => Promise.resolve(null),
  getMeetEventEntries: () => Promise.resolve(null),
}

const api = new Proxy({}, {
  get(_, key) { return window.electronAPI?.[key] ?? FALLBACK[key] },
})

// ─── Helpers ─────────────────────────────────────────────
const isFoul = (v) => v && ['F', 'X', 'P', 'NH'].includes(String(v).trim().toUpperCase())
const parseAttempts = (json) => {
  const a = json ? (() => { try { return JSON.parse(json) } catch { return [] } })() : []
  while (a.length < 6) a.push('')
  return a.slice(0, 6)
}

// ─── Event Result Card ────────────────────────────────────
function EventResultCard({ ev, onPrint }) {
  const isField  = ev.category === 'field' || ev.category === 'combined'
  const showWind = ev.category === 'track'  || ev.category === 'relay'

  const sorted = [...(ev.entries ?? [])].sort((a, b) => {
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 8,
        padding: '11px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 14,
            fontWeight: 600, letterSpacing: '0.04em' }}>
            {ev.event_name}
          </div>
          <div style={{ display: 'flex', gap: 5, marginTop: 4, flexWrap: 'wrap' }}>
            <span className={`badge ${gBadge(ev.gender)}`} style={{ fontSize: 10 }}>{gLabel(ev.gender)}</span>
            {ev.age_group && <span className="badge badge-neutral" style={{ fontSize: 10 }}>{ev.age_group}</span>}
            <span className="badge badge-neutral" style={{ fontSize: 10, textTransform: 'capitalize' }}>{ev.round}</span>
            <span style={{ fontSize: 10, color: 'var(--text-muted)', alignSelf: 'center' }}>
              {sorted.length} athlete{sorted.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
        {hasResults ? (
          <button className="btn btn-ghost" style={{ fontSize: 11, padding: '4px 10px', flexShrink: 0 }}
            onClick={() => onPrint(ev)}>
            <Printer size={12} /> Print
          </button>
        ) : (
          <span className="badge badge-neutral" style={{ fontSize: 10 }}>No results yet</span>
        )}
      </div>

      {/* Results table */}
      {sorted.length === 0 ? (
        <div style={{ padding: '14px 20px', fontSize: 13, color: 'var(--text-muted)' }}>No entries</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: 'var(--bg-tertiary)' }}>
              <th style={thStyle({ width: 44 })}>Pl</th>
              <th style={thStyle()}>Athlete</th>
              {!isField && <th style={thStyle({ width: 90, textAlign: 'center' })}>Time</th>}
              {showWind && <th style={thStyle({ width: 56, textAlign: 'center' })}>Wind</th>}
              {isField  && <th style={thStyle({ width: 90, textAlign: 'center' })}>Best</th>}
              <th style={thStyle({ width: 50, textAlign: 'center' })}>Pts</th>
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
              const shade = i % 2 === 1 ? { background: 'var(--bg-secondary)' } : {}

              return (
                <tr key={en.id} style={{ borderTop: '1px solid var(--border)', ...shade }}>
                  <td style={{ padding: '7px 12px' }}>
                    {status
                      ? <span style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>{status}</span>
                      : en.place
                        ? <span className="badge" style={{ ...placeBadgeStyle(en.place),
                            fontSize: 11, fontWeight: 700, minWidth: 22, justifyContent: 'center' }}>
                            {en.place}
                          </span>
                        : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                  </td>
                  <td style={{ padding: '7px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div className={`avatar avatar-${en.athlete_gender === 'M' ? 'male' : 'female'}`}
                        style={{ width: 22, height: 22, fontSize: 9, flexShrink: 0 }}>
                        {en.first_name?.[0]}{en.last_name?.[0]}
                      </div>
                      <span style={{ fontWeight: 500 }}>{en.last_name}, {en.first_name}</span>
                      {!!en.is_pr && <span style={{ color: '#f59e0b', fontSize: 11, marginLeft: 4 }}>★ PR</span>}
                    </div>
                  </td>
                  {!isField && (
                    <td style={{ padding: '7px 12px', textAlign: 'center', fontFamily: 'monospace',
                      fontWeight: en.mark ? 600 : 400,
                      color: en.mark ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                      {status || en.mark || '—'}
                    </td>
                  )}
                  {showWind && (
                    <td style={{ padding: '7px 12px', textAlign: 'center',
                      fontFamily: 'monospace', fontSize: 11, color: 'var(--text-muted)' }}>
                      {en.wind || '—'}
                    </td>
                  )}
                  {isField && (
                    <td style={{ padding: '7px 12px', textAlign: 'center', fontFamily: 'monospace',
                      fontWeight: en.mark ? 600 : 400,
                      color: en.mark ? 'var(--text-primary)' : 'var(--text-muted)' }}>
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

// ─── Team Scoring Card ────────────────────────────────────
function TeamScoringCard({ eventsData }) {
  // Tally points per athlete across all events in the meet
  const rows = []
  for (const ev of eventsData) {
    for (const en of (ev.entries ?? [])) {
      if (!en.place || en.scratched || en.did_not_start || en.did_not_finish || en.disqualified) continue
      const pts = SCORE_TABLE[en.place]
      if (!pts) continue
      const key = `${en.athlete_id}`
      const existing = rows.find(r => r.key === key)
      if (existing) {
        existing.pts += pts
        existing.events.push({ event: ev.event_name, place: en.place, pts, is_pr: !!en.is_pr })
      } else {
        rows.push({
          key, pts,
          name: `${en.last_name}, ${en.first_name}`,
          gender: en.athlete_gender,
          events: [{ event: ev.event_name, place: en.place, pts, is_pr: !!en.is_pr }],
        })
      }
    }
  }
  rows.sort((a, b) => b.pts - a.pts)

  if (rows.length === 0) return null

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6,
        padding: '11px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
        <Star size={13} />
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 14,
          fontWeight: 600, letterSpacing: '0.04em' }}>Meet Scoring</span>
        <span className="badge badge-blue" style={{ fontSize: 10, marginLeft: 'auto' }}>
          8-6-5-4-3-2-1
        </span>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ background: 'var(--bg-tertiary)' }}>
            <th style={thStyle({ width: 36 })}>Rank</th>
            <th style={thStyle()}>Athlete</th>
            <th style={thStyle()}>Events</th>
            <th style={thStyle({ width: 56, textAlign: 'right' })}>Pts</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.key} style={{ borderTop: '1px solid var(--border)',
              background: i % 2 === 1 ? 'var(--bg-secondary)' : 'transparent' }}>
              <td style={{ padding: '7px 12px', textAlign: 'center' }}>
                <span className="badge" style={{ ...placeBadgeStyle(i + 1),
                  fontSize: 11, fontWeight: 700, minWidth: 22, justifyContent: 'center' }}>
                  {i + 1}
                </span>
              </td>
              <td style={{ padding: '7px 12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div className={`avatar avatar-${row.gender === 'M' ? 'male' : 'female'}`}
                    style={{ width: 22, height: 22, fontSize: 9, flexShrink: 0 }}>
                    {row.name.split(', ').map(p => p[0]).join('')}
                  </div>
                  <span style={{ fontWeight: 500 }}>{row.name}</span>
                </div>
              </td>
              <td style={{ padding: '7px 12px' }}>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {row.events.map((e, j) => (
                    <span key={j} className="badge badge-neutral"
                      style={{ fontSize: 9, gap: 3 }}>
                      {e.event} — {e.place === 1 ? '🥇' : e.place === 2 ? '🥈' : e.place === 3 ? '🥉' : `${e.place}th`}
                      {e.is_pr && ' ★'}
                    </span>
                  ))}
                </div>
              </td>
              <td style={{ padding: '7px 16px 7px 12px', textAlign: 'right',
                fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent)', fontSize: 13 }}>
                {row.pts}
              </td>
            </tr>
          ))}
          <tr style={{ borderTop: '2px solid var(--border)', background: 'var(--bg-tertiary)' }}>
            <td colSpan={3} style={{ padding: '7px 12px', fontWeight: 600, fontSize: 12,
              color: 'var(--text-secondary)' }}>
              Total Pegasus Points
            </td>
            <td style={{ padding: '7px 16px 7px 12px', textAlign: 'right',
              fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent)', fontSize: 14 }}>
              {rows.reduce((s, r) => s + r.pts, 0)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

function thStyle(extra = {}) {
  return {
    padding: '6px 12px', textAlign: 'left', fontWeight: 600,
    fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.05em',
    ...extra,
  }
}

// ─── Print Single Event Modal ─────────────────────────────
function PrintEventModal({ meet, ev, onClose }) {
  const isField  = ev.category === 'field' || ev.category === 'combined'
  const showWind = ev.category === 'track'  || ev.category === 'relay'

  const sorted = [...(ev.entries ?? [])].sort((a, b) => {
    const pa = a.place, pb = b.place
    if (pa && pb) return pa - pb
    if (pa) return -1
    if (pb) return 1
    return 0
  })

  const meetDate = new Date(meet.date + 'T00:00:00')
    .toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  const eventTitle = [
    ev.event_name.toUpperCase(),
    ev.gender === 'M' ? 'BOYS' : ev.gender === 'F' ? 'GIRLS' : 'MIXED',
    ev.age_group || null,
    (ev.round || 'FINAL').toUpperCase(),
  ].filter(Boolean).join(' · ')

  return (
    <div className="print-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="print-preview-container">
        <div className="print-toolbar no-print">
          <span style={{ fontWeight: 600, fontSize: 14 }}>Print Preview — {ev.event_name}</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" onClick={() => window.print()}>
              <Printer size={13} /> Print / Save PDF
            </button>
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
              <div style={{ textAlign: 'right' }}>
                <div className="ps-meet-date">{meetDate}</div>
                {meet.location && <div className="ps-meet-location">{meet.location}</div>}
              </div>
            </div>
            <div className="ps-divider" />
            <div className="ps-event-title">{eventTitle}</div>
          </div>

          <table className="ps-table">
            <thead>
              <tr>
                <th className="ps-th-place">Pl</th>
                <th className="ps-th-name">Athlete</th>
                <th className="ps-th-seed">Seed</th>
                {isField ? (
                  <>
                    <th className="ps-th-att">1st</th><th className="ps-th-att">2nd</th>
                    <th className="ps-th-att">3rd</th><th className="ps-th-att">4th</th>
                    <th className="ps-th-att">5th</th><th className="ps-th-att">6th</th>
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
                const status = en.scratched ? 'SCR'
                  : en.did_not_start  ? 'DNS'
                  : en.did_not_finish ? 'DNF'
                  : en.disqualified   ? 'DQ' : null
                const attempts = isField ? parseAttempts(en.attempts_json) : []
                const pts = (!status && en.place) ? (SCORE_TABLE[en.place] ?? null) : null
                const shade = i % 2 === 1 ? 'ps-row-shade' : ''
                return (
                  <tr key={en.id} className={shade}>
                    <td className="ps-td-place">{status || (en.place ?? '—')}</td>
                    <td className="ps-td-name">
                      {en.last_name}, {en.first_name}
                      {!!en.is_pr && <span className="ps-pr"> ★ PR</span>}
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
            Generated {new Date().toLocaleDateString('en-US')} · Pegasus Track Management · ★ = Personal Record
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Print Full Meet Modal ────────────────────────────────
function PrintMeetModal({ meet, eventsData, onClose }) {
  const meetDate = new Date(meet.date + 'T00:00:00')
    .toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  const events = eventsData.filter(ev => (ev.entries?.length ?? 0) > 0)

  return (
    <div className="print-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="print-preview-container">
        <div className="print-toolbar no-print">
          <span style={{ fontWeight: 600, fontSize: 14 }}>Full Meet Results — {meet.name}</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" onClick={() => window.print()}>
              <Printer size={13} /> Print / Save PDF
            </button>
            <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={15} /></button>
          </div>
        </div>

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
              if (pa) return -1; if (pb) return 1; return 0
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

                <table className="ps-table">
                  <thead>
                    <tr>
                      <th className="ps-th-place">Pl</th>
                      <th className="ps-th-name">Athlete</th>
                      <th className="ps-th-seed">Seed</th>
                      {isField ? (
                        <>
                          <th className="ps-th-att">1st</th><th className="ps-th-att">2nd</th>
                          <th className="ps-th-att">3rd</th><th className="ps-th-att">4th</th>
                          <th className="ps-th-att">5th</th><th className="ps-th-att">6th</th>
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
                      const status = en.scratched ? 'SCR'
                        : en.did_not_start  ? 'DNS'
                        : en.did_not_finish ? 'DNF'
                        : en.disqualified   ? 'DQ' : null
                      const attempts = isField ? parseAttempts(en.attempts_json) : []
                      const pts = (!status && en.place) ? (SCORE_TABLE[en.place] ?? null) : null
                      const shade = i % 2 === 1 ? 'ps-row-shade' : ''
                      return (
                        <tr key={en.id} className={shade}>
                          <td className="ps-td-place">{status || (en.place ?? '—')}</td>
                          <td className="ps-td-name">
                            {en.last_name}, {en.first_name}
                            {!!en.is_pr && <span className="ps-pr"> ★ PR</span>}
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
  )
}

// ─── Meet List Item ───────────────────────────────────────
function MeetListItem({ meet, selected, onSelect }) {
  const d   = new Date(meet.date + 'T00:00:00')
  const sc  = STATUS_CFG[meet.status] ?? STATUS_CFG.upcoming
  return (
    <button
      className={`meets-event-select${selected ? ' active' : ''}`}
      onClick={() => onSelect(meet)}
      style={{ textAlign: 'left', display: 'block', width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div className="meet-date-box" style={{ flexShrink: 0 }}>
          <span>{d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}</span>
          <span>{d.getDate()}</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 500, fontSize: 13, overflow: 'hidden',
            textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {meet.name}
          </div>
          <div style={{ display: 'flex', gap: 5, marginTop: 3, flexWrap: 'wrap' }}>
            <span className={`badge ${sc.badge}`} style={{ fontSize: 10 }}>{sc.label}</span>
            {meet.event_count > 0 && (
              <span style={{ fontSize: 10, color: 'var(--text-muted)', alignSelf: 'center' }}>
                {meet.event_count} event{meet.event_count !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
        <ChevronRight size={13} style={{ flexShrink: 0, color: 'var(--text-muted)' }} />
      </div>
    </button>
  )
}

// ─── Main Results Page ────────────────────────────────────
export default function ResultsPage() {
  const [meets,        setMeets]        = useState([])
  const [loadingMeets, setLoadingMeets] = useState(true)
  const [selectedMeet, setSelectedMeet] = useState(null)
  const [eventsData,   setEventsData]   = useState([])
  const [loadingEvts,  setLoadingEvts]  = useState(false)
  const [printEvent,   setPrintEvent]   = useState(null)  // single event print
  const [printMeet,    setPrintMeet]    = useState(false) // full meet print
  const [printLabels,  setPrintLabels]  = useState(false) // award labels

  // Load meet list
  useEffect(() => {
    api.getMeets()
      .then(ms => {
        // Sort: active first, then completed, then upcoming, cancelled last
        const order = { active: 0, completed: 1, upcoming: 2, cancelled: 3 }
        ms.sort((a, b) => {
          const od = (order[a.status] ?? 2) - (order[b.status] ?? 2)
          if (od !== 0) return od
          return b.date.localeCompare(a.date)  // newest first within group
        })
        setMeets(ms)
        setLoadingMeets(false)
      })
      .catch(() => setLoadingMeets(false))
  }, [])

  // Load event results when meet is selected
  const loadMeetResults = useCallback(async (meet) => {
    setSelectedMeet(meet)
    setEventsData([])
    setLoadingEvts(true)
    try {
      const detail = await api.getMeetDetail(meet.id)
      if (!detail?.events?.length) { setEventsData([]); setLoadingEvts(false); return }
      const results = await Promise.all(detail.events.map(ev => api.getMeetEventEntries(ev.id)))
      setEventsData(results.filter(Boolean))
    } catch { /* silent */ }
    setLoadingEvts(false)
  }, [])

  // Group meets
  const completedMeets = meets.filter(m => m.status === 'completed')
  const activeMeets    = meets.filter(m => m.status === 'active')
  const upcomingMeets  = meets.filter(m => m.status === 'upcoming')

  const totalPRs = eventsData.reduce((s, ev) =>
    s + (ev.entries ?? []).filter(en => en.is_pr).length, 0)
  const completedEvents = eventsData.filter(ev =>
    (ev.entries ?? []).some(en => en.place)).length

  return (
    <div className="meets-page">
      <div className="page-header">
        <div>
          <div className="page-title">RESULTS</div>
          <div className="page-subtitle">
            {meets.length} meet{meets.length !== 1 ? 's' : ''} on record
            {activeMeets.length > 0 && ` · ${activeMeets.length} active`}
            {completedMeets.length > 0 && ` · ${completedMeets.length} completed`}
          </div>
        </div>
        {selectedMeet && eventsData.length > 0 && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost" style={{ fontSize: 12 }}
              onClick={() => setPrintLabels(true)}>
              🏷 Award Labels
            </button>
            <button className="btn btn-primary" style={{ fontSize: 12 }}
              onClick={() => setPrintMeet(true)}>
              <Printer size={13} /> Print Full Meet
            </button>
          </div>
        )}
      </div>

      <div className="meets-two-col">
        {/* Left — meet list */}
        <div className="meets-col-left">
          <div className="meets-col-header"><List size={13} /> Meets</div>

          {loadingMeets ? (
            <div className="loading-container" style={{ padding: '32px 0' }}>
              <div className="loading-spinner" />
            </div>
          ) : meets.length === 0 ? (
            <div className="empty-state" style={{ padding: '32px 0' }}>
              <Calendar size={28} />
              <p style={{ fontSize: 13 }}>No meets yet</p>
            </div>
          ) : (
            <div className="meets-event-list">
              {activeMeets.length > 0 && (
                <div style={{ padding: '4px 12px 2px', fontSize: 10, fontWeight: 600,
                  letterSpacing: '0.08em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Active
                </div>
              )}
              {activeMeets.map(m => (
                <MeetListItem key={m.id} meet={m}
                  selected={selectedMeet?.id === m.id} onSelect={loadMeetResults} />
              ))}

              {completedMeets.length > 0 && (
                <div style={{ padding: '8px 12px 2px', fontSize: 10, fontWeight: 600,
                  letterSpacing: '0.08em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Completed
                </div>
              )}
              {completedMeets.map(m => (
                <MeetListItem key={m.id} meet={m}
                  selected={selectedMeet?.id === m.id} onSelect={loadMeetResults} />
              ))}

              {upcomingMeets.length > 0 && (
                <div style={{ padding: '8px 12px 2px', fontSize: 10, fontWeight: 600,
                  letterSpacing: '0.08em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Upcoming
                </div>
              )}
              {upcomingMeets.map(m => (
                <MeetListItem key={m.id} meet={m}
                  selected={selectedMeet?.id === m.id} onSelect={loadMeetResults} />
              ))}
            </div>
          )}
        </div>

        {/* Right — event results */}
        <div className="meets-col-right">
          {!selectedMeet ? (
            <div className="empty-state" style={{ padding: '56px 0' }}>
              <Trophy size={40} />
              <p style={{ fontSize: 13 }}>Select a meet to view results</p>
            </div>
          ) : loadingEvts ? (
            <div className="loading-container"><div className="loading-spinner" /></div>
          ) : (
            <>
              {/* Meet summary bar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12,
                marginBottom: 18, flexWrap: 'wrap' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 16,
                    fontWeight: 700, letterSpacing: '0.04em' }}>
                    {selectedMeet.name}
                  </div>
                  <div style={{ display: 'flex', gap: 12, marginTop: 4,
                    fontSize: 12, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Calendar size={11} />
                      {new Date(selectedMeet.date + 'T00:00:00')
                        .toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })}
                    </span>
                    {selectedMeet.location && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <MapPin size={11} /> {selectedMeet.location}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 20,
                      fontWeight: 700, color: 'var(--accent)' }}>{completedEvents}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase',
                      letterSpacing: '0.06em' }}>Events</div>
                  </div>
                  {totalPRs > 0 && (
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 20,
                        fontWeight: 700, color: '#f59e0b' }}>{totalPRs}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase',
                        letterSpacing: '0.06em' }}>PRs</div>
                    </div>
                  )}
                </div>
              </div>

              {eventsData.length === 0 ? (
                <div className="empty-state" style={{ padding: '40px 0' }}>
                  <Users size={32} />
                  <p style={{ fontSize: 13 }}>No events with entries in this meet</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {/* Team scoring summary */}
                  <TeamScoringCard eventsData={eventsData} />

                  {/* Individual event cards */}
                  {eventsData.map(ev => (
                    <EventResultCard key={ev.id} ev={ev} onPrint={setPrintEvent} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Print modals */}
      {printEvent && (
        <PrintEventModal
          meet={selectedMeet}
          ev={printEvent}
          onClose={() => setPrintEvent(null)}
        />
      )}
      {printMeet && (
        <PrintMeetModal
          meet={selectedMeet}
          eventsData={eventsData}
          onClose={() => setPrintMeet(false)}
        />
      )}
      {printLabels && (
        <PrintAwardLabelsModal
          meet={selectedMeet}
          eventsData={eventsData}
          onClose={() => setPrintLabels(false)}
        />
      )}
    </div>
  )
}
