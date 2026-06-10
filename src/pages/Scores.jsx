import React, { useEffect, useState, useMemo } from 'react'
import { TrendingUp, Medal } from 'lucide-react'

const SCORE_TABLE = { 1: 8, 2: 6, 3: 5, 4: 4, 5: 3, 6: 2, 7: 1 }
const CAT_COLORS  = { track: 'var(--accent)', relay: '#a78bfa', field: '#34d399', combined: '#f59e0b' }
const CAT_LABELS  = { track: 'Track', relay: 'Relay', field: 'Field', combined: 'Combined' }

const FALLBACK = {
  getScoreSeasons:     async () => [],
  getSeasonScoreboard: async () => null,
}
const api = (typeof window !== 'undefined' && window.electronAPI) ? window.electronAPI : FALLBACK

function medalStyle(rank) {
  if (rank === 1) return { background: '#d97706', color: '#fff' }
  if (rank === 2) return { background: '#6b7280', color: '#fff' }
  if (rank === 3) return { background: '#92400e', color: '#fff' }
  return { background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }
}

function fmtDate(d) {
  if (!d) return ''
  try { return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }
  catch { return d }
}

function MeetBreakdownRow({ team, meets }) {
  const cols = meets.map(m => ({ meetId: m.id, pts: team.byMeet[m.id] || 0 }))
  return (
    <tr className="scores-meet-row">
      <td />
      <td colSpan={5} style={{ padding: '4px 16px 8px' }}>
        <div className="scores-meet-cells">
          {cols.map(({ meetId, pts }, i) => (
            <div key={meetId} className="scores-meet-cell">
              <span className="scores-meet-label">{meets[i].name}</span>
              <span className="scores-meet-pts">{pts > 0 ? pts : '—'}</span>
            </div>
          ))}
        </div>
      </td>
    </tr>
  )
}

export default function Scores() {
  const [seasons,     setSeasons]     = useState([])
  const [seasonId,    setSeasonId]    = useState(null)
  const [data,        setData]        = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [dataLoading, setDataLoading] = useState(false)
  const [expanded,    setExpanded]    = useState(new Set())
  const [error,       setError]       = useState(null)

  useEffect(() => {
    const fn = api.getScoreSeasons
    if (typeof fn !== 'function') { setLoading(false); return }
    fn().then(s => {
      setSeasons(s ?? [])
      if (s?.length > 0) setSeasonId(s[0].id)
    }).catch(err => {
      setError(err?.message ?? String(err))
    }).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!seasonId) return
    setDataLoading(true)
    setData(null)
    const fn = api.getSeasonScoreboard
    if (typeof fn !== 'function') { setDataLoading(false); return }
    fn(seasonId).then(d => {
      setData(d)
    }).catch(err => {
      setError(err?.message ?? String(err))
    }).finally(() => setDataLoading(false))
  }, [seasonId])

  const toggleExpand = (name) =>
    setExpanded(s => { const n = new Set(s); n.has(name) ? n.delete(name) : n.add(name); return n })

  const cats = useMemo(() => {
    if (!data?.teams) return []
    const used = new Set()
    for (const t of data.teams) Object.keys(t.byCategory).forEach(c => { if (t.byCategory[c] > 0) used.add(c) })
    return ['track', 'relay', 'field', 'combined'].filter(c => used.has(c))
  }, [data])

  if (loading) return <div className="loading-container"><div className="loading-spinner" /></div>
  if (error) return (
    <div className="scores-page">
      <div className="scores-empty" style={{ color: 'var(--red)', fontSize: 13 }}>
        Error loading scores: {error}<br />
        <span style={{ color: 'var(--text-muted)' }}>Restart the Electron app to pick up the latest changes.</span>
      </div>
    </div>
  )

  return (
    <div className="scores-page">
      <div className="scores-header">
        <div>
          <div className="scores-title">Season Scores</div>
          <div className="scores-sub">Team points accumulated across all meets in the season</div>
        </div>
      </div>

      {/* Season tabs */}
      {seasons.length === 0 ? (
        <div className="scores-empty">
          <TrendingUp size={44} style={{ color: 'var(--text-muted)', opacity: 0.3, marginBottom: 14 }} />
          <div style={{ color: 'var(--text-secondary)', fontWeight: 600, fontSize: 15, marginBottom: 6 }}>No seasons yet</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>
            Create a season in Settings, then add meets to it and enter results.
          </div>
        </div>
      ) : (
        <>
          <div className="scores-season-tabs">
            {seasons.map(s => (
              <button key={s.id}
                className={`scores-season-tab${seasonId === s.id ? ' active' : ''}`}
                onClick={() => setSeasonId(s.id)}>
                {s.name}
                <span className="scores-season-year">{s.year}</span>
              </button>
            ))}
          </div>

          {dataLoading ? (
            <div className="loading-container"><div className="loading-spinner" /></div>
          ) : !data || data.teams.length === 0 ? (
            <div className="scores-empty">
              <Medal size={44} style={{ color: 'var(--text-muted)', opacity: 0.3, marginBottom: 14 }} />
              <div style={{ color: 'var(--text-secondary)', fontWeight: 600, fontSize: 15, marginBottom: 6 }}>No scored results yet</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 13, maxWidth: 340, textAlign: 'center', lineHeight: 1.6 }}>
                Enter results in meets that belong to this season, use Auto-Rank to assign places,
                and scores will appear here automatically.
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
                Scoring: 1st=8 · 2nd=6 · 3rd=5 · 4th=4 · 5th=3 · 6th=2 · 7th=1
              </div>
            </div>
          ) : (
            <>
              {/* Meets in this season */}
              {data.meets.length > 0 && (
                <div className="scores-meets-strip">
                  {data.meets.map(m => (
                    <div key={m.id} className="scores-meet-chip">
                      <span className="scores-meet-chip-name">{m.name}</span>
                      <span className="scores-meet-chip-date">{fmtDate(m.date)}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Leaderboard */}
              <div className="scores-table-wrap">
                <table className="scores-table">
                  <thead>
                    <tr>
                      <th style={{ width: 44 }}>#</th>
                      <th style={{ textAlign: 'left' }}>Team</th>
                      {cats.map(c => (
                        <th key={c} style={{ width: 80 }}>
                          <span style={{ color: CAT_COLORS[c] }}>{CAT_LABELS[c]}</span>
                        </th>
                      ))}
                      <th style={{ width: 90 }}>Total</th>
                      <th style={{ width: 36 }} />
                    </tr>
                  </thead>
                  <tbody>
                    {data.teams.map((team, idx) => {
                      const rank = idx + 1
                      const isExpanded = expanded.has(team.name)
                      return (
                        <React.Fragment key={team.name}>
                          <tr className={`scores-team-row${rank <= 3 ? ' top-three' : ''}`}>
                            <td>
                              <span className="scores-rank-badge" style={medalStyle(rank)}>{rank}</span>
                            </td>
                            <td className="scores-team-name">{team.name}</td>
                            {cats.map(c => (
                              <td key={c} className="scores-cat-pts">
                                {team.byCategory[c] > 0
                                  ? <span style={{ color: CAT_COLORS[c] }}>{team.byCategory[c]}</span>
                                  : <span className="muted-val">—</span>}
                              </td>
                            ))}
                            <td className="scores-total">{team.total}</td>
                            <td>
                              {data.meets.length > 0 && (
                                <button className="btn btn-ghost btn-icon"
                                  style={{ padding: '2px 4px', fontSize: 11 }}
                                  title={isExpanded ? 'Hide per-meet breakdown' : 'Show per-meet breakdown'}
                                  onClick={() => toggleExpand(team.name)}>
                                  {isExpanded ? '▲' : '▼'}
                                </button>
                              )}
                            </td>
                          </tr>
                          {isExpanded && <MeetBreakdownRow team={team} meets={data.meets} />}
                        </React.Fragment>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Scoring key */}
              <div className="scores-key">
                {Object.entries(SCORE_TABLE).map(([pl, pts]) => (
                  <span key={pl} className="scores-key-item">
                    {pl === '1' ? '🥇' : pl === '2' ? '🥈' : pl === '3' ? '🥉' : `${pl}th`} = {pts} pts
                  </span>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
