import React, { useState, useMemo, useRef } from 'react'
import { X } from 'lucide-react'

// ─── Shared API shim ─────────────────────────────────────────
const labelsApi = new Proxy({}, {
  get(_, key) { return window.electronAPI?.[key] ?? (() => Promise.resolve(null)) },
})

// ─── Constants ───────────────────────────────────────────────
export const PLACE_SUFFIX = ['','ST','ND','RD','TH','TH','TH','TH','TH']
export const PLACE_MEDAL  = { 1: '#d97706', 2: '#9ca3af', 3: '#b45309' }

export const LABEL_FORMATS = [
  { id:'avery5163',  label:'Avery 5163 — 2″ × 4″',   sub:'10 per sheet',  isSheet:true,  perSheet:10,  sheetClass:'al-sheet-avery5163', labelVariant:'lg'      },
  { id:'avery5160',  label:'Avery 5160 — 1″ × 2⅝″',  sub:'30 per sheet',  isSheet:true,  perSheet:30,  sheetClass:'al-sheet-avery5160', labelVariant:'sm'      },
  { id:'thermal4x2', label:'Thermal — 4″ × 2″',       sub:'one per page',  isSheet:false, perSheet:1,   pageSize:'4in 2in',              labelVariant:'lg'      },
  { id:'thermal2x4', label:'Thermal — 2″ × 4″',       sub:'one per page',  isSheet:false, perSheet:1,   pageSize:'2in 4in',              labelVariant:'tall'    },
  { id:'thermal1x4', label:'Thermal — 1″ × 4″',       sub:'one per page',  isSheet:false, perSheet:1,   pageSize:'4in 1in',              labelVariant:'wide-sm' },
]

// ─── LabelContent ─────────────────────────────────────────────
export function LabelContent({ lbl, variant, includeMark, meetDateStr }) {
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
        <div className="al-wsm-left">
          <div className="al-wsm-row">
            <span className="al-wsm-place" style={{ color: placeColor }}>{ordinal} PLACE</span>
            <span className="al-wsm-name">{lastName}, {firstName}</span>
          </div>
          <div className="al-wsm-row">
            <span className="al-wsm-event">{eventLine}</span>
            {includeMark && mark && <span className="al-wsm-mark">{mark}</span>}
          </div>
          <div className="al-wsm-row">
            <span className="al-wsm-meta">{meetName} · {meetDateStr}</span>
          </div>
        </div>
        <div className="al-wsm-right">
          <svg className="al-wsm-watermark" viewBox="0 0 200 80" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M100 28 L112 40 L100 52 L88 40 Z"/>
            <path d="M91 37 Q68 22 38 14 Q20 9 4 12 Q24 20 52 28 Q74 33 91 37 Z"/>
            <path d="M91 43 Q66 50 36 57 Q18 61 2 58 Q22 52 50 46 Q72 43 91 43 Z"/>
            <path d="M109 37 Q132 22 162 14 Q180 9 196 12 Q176 20 148 28 Q126 33 109 37 Z"/>
            <path d="M109 43 Q134 50 164 57 Q182 61 198 58 Q178 52 150 46 Q128 43 109 43 Z"/>
          </svg>
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

  // Default: large landscape (lg) — all text left, watermark right
  return (
    <div className="al-label al-label-lg">
      <div className="al-lg-left">
        <div>
          <div className="al-club">Pegasus Track</div>
          <div className="al-meet-sub">{meetName} · {meetDateStr}</div>
        </div>
        <div className="al-rule" />
        <div className="al-place" style={{ color: placeColor }}>{ordinal} PLACE</div>
        <div className="al-name">{lastName}, {firstName}</div>
        <div className="al-event">{eventLine}</div>
        {includeMark && mark && <div className="al-mark-standalone">{mark}</div>}
      </div>
      <div className="al-lg-right">
        <svg className="al-lg-watermark" viewBox="0 0 200 160" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M100 28 L112 40 L100 52 L88 40 Z"/>
          <path d="M91 37 Q68 22 38 14 Q20 9 4 12 Q24 20 52 28 Q74 33 91 37 Z"/>
          <path d="M91 43 Q66 50 36 57 Q18 61 2 58 Q22 52 50 46 Q72 43 91 43 Z"/>
          <path d="M109 37 Q132 22 162 14 Q180 9 196 12 Q176 20 148 28 Q126 33 109 37 Z"/>
          <path d="M109 43 Q134 50 164 57 Q182 61 198 58 Q178 52 150 46 Q128 43 109 43 Z"/>
        </svg>
      </div>
    </div>
  )
}

// ─── PrintAwardLabelsModal ────────────────────────────────────
export function PrintAwardLabelsModal({ meet, eventsData, onClose, initialSelectedIds }) {
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
        out.push({
          place: en.place, firstName: en.first_name, lastName: en.last_name,
          eventName: ev.event_name, gender: ev.gender, ageGroup: ev.age_group,
          mark: en.mark, meetName: meet.name, meetDate: meet.date,
        })
      }
    }
    return out
  }, [localData, selectedIds, maxPlace, meet])

  const handlePrint = () => {
    if (labels.length === 0) {
      alert('No labels to print yet.\n\nScore your events first, then come back here.')
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

      if (labelsApi.printThermal && widthMicrons && heightMicrons) {
        const css = Array.from(document.styleSheets).flatMap(sheet => {
          try { return Array.from(sheet.cssRules).map(r => r.cssText) }
          catch { return [] }
        }).filter(t => t.includes('.al-') && !t.trimStart().startsWith('@media') && !t.trimStart().startsWith('@font-face')).join('\n')

        const tmp = document.createElement('div')
        tmp.innerHTML = previewRef.current?.innerHTML ?? ''
        const html = Array.from(tmp.querySelectorAll('.al-label')).map((el, i) => {
          if (i > 0) el.style.pageBreakBefore = 'always'
          return el.outerHTML
        }).join('\n')

        labelsApi.printThermal({ html, css, widthMicrons, heightMicrons })
          .then(r => { if (r && !r.success) alert(`Print failed: ${r.reason}`) })
          .catch(err => alert(`Print error: ${err?.message ?? err}`))
      } else {
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
        if ((ev.entries ?? []).some(en => !en.scratched && en.mark)) await labelsApi.autoRank(ev.id)
      }
      const refreshed = await Promise.all(localData.map(ev => labelsApi.getMeetEventEntries(ev.id)))
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
          style={{ height: 'auto', padding: '12px 20px', flexWrap: 'wrap', gap: 14, alignItems: 'flex-end' }}>
          <span style={{ fontWeight: 600, fontSize: 14, alignSelf: 'center', marginRight: 4 }}>🏷 Award Labels</span>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#aaa' }}>Format</span>
            <select className="input" style={{ fontSize: 12, padding: '4px 8px', minWidth: 220 }}
              value={formatId} onChange={e => setFormatId(e.target.value)}>
              {LABEL_FORMATS.map(f => <option key={f.id} value={f.id}>{f.label} ({f.sub})</option>)}
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#aaa' }}>Award Places</span>
            <select className="input" style={{ fontSize: 12, padding: '4px 8px', width: 110 }}
              value={maxPlace} onChange={e => setMaxPlace(Number(e.target.value))}>
              <option value={1}>1st only</option>
              <option value={3}>Top 3</option>
              <option value={5}>Top 5</option>
              <option value={8}>Top 8</option>
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#aaa' }}>Performance</span>
            <div style={{ display: 'flex', gap: 4 }}>
              {[true, false].map(v => (
                <button key={String(v)} className={`btn ${includeMark === v ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ fontSize: 11, padding: '4px 12px' }}
                  onClick={() => setIncludeMark(v)}>
                  {v ? 'Include' : 'Omit'}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: '#999' }}>{labels.length} label{labels.length !== 1 ? 's' : ''}</span>
            <button className="btn btn-primary" onClick={handlePrint}>
              🖨 Print Labels
            </button>
            <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={15} /></button>
          </div>
        </div>

        {/* Event filter */}
        {eventsWithResults.length > 1 && (
          <div className="no-print" style={{
            padding: '8px 20px', display: 'flex', gap: 6, flexWrap: 'wrap',
            background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid rgba(255,255,255,0.08)',
          }}>
            <span style={{ fontSize: 11, color: '#aaa', alignSelf: 'center', marginRight: 4 }}>Events:</span>
            <button className="btn btn-ghost" style={{ fontSize: 10, padding: '2px 7px' }}
              onClick={() => setSelectedIds(new Set(eventsWithResults.map(e => e.id)))}>All</button>
            <button className="btn btn-ghost" style={{ fontSize: 10, padding: '2px 7px' }}
              onClick={() => setSelectedIds(new Set())}>None</button>
            {eventsWithResults.map(ev => {
              const on = selectedIds.has(ev.id)
              const g  = ev.gender === 'M' ? 'B' : ev.gender === 'F' ? 'G' : 'M'
              return (
                <button key={ev.id} className={`btn ${on ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ fontSize: 10, padding: '2px 8px' }}
                  onClick={() => setSelectedIds(s => { const n = new Set(s); n.has(ev.id) ? n.delete(ev.id) : n.add(ev.id); return n })}>
                  {g} {ev.event_name}{ev.age_group ? ` ${ev.age_group}` : ''}
                </button>
              )
            })}
          </div>
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
