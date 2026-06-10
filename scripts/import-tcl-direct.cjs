#!/usr/bin/env node
/**
 * Direct TCL meet import — bypasses Electron, writes straight to the SQLite DB.
 * Usage:  node scripts/import-tcl-direct.cjs [path/to/file.tcl]
 *
 * If no file argument is given, defaults to the known meet file.
 */
'use strict'

const path    = require('path')
const fs      = require('fs')
const Database = require('better-sqlite3')

const DB_PATH  = path.join(process.env.APPDATA, 'pegasus-track', 'pegasus-track.db')
const TCL_FILE = process.argv[2] || 'H:\\Meet Results-PEGASUS TRACK CLUB-27May2026-001\\TCL01-01.tcl'

console.log('DB :', DB_PATH)
console.log('TCL:', TCL_FILE)

if (!fs.existsSync(DB_PATH))  { console.error('DB not found!');  process.exit(1) }
if (!fs.existsSync(TCL_FILE)) { console.error('TCL not found!'); process.exit(1) }

// ── Parser ────────────────────────────────────────────────────────────────────
function parseE2(line) {
  if (line.length < 14) return { mark: null, wind: null, place: null }
  const rawMark = parseFloat(line.slice(3, 11)) || 0
  const unit    = line[11] || 'M'
  const qual    = line[12] || ' '
  const dataRegion = line.slice(0, 60)
  const allNums = [...dataRegion.matchAll(/\d+/g)]
  const lastNum = allNums.length ? parseInt(allNums[allNums.length - 1][0]) : null
  const place   = lastNum || null
  if (!rawMark || qual !== ' ') return { mark: null, wind: null, place: null }
  const windM   = line.slice(14).match(/^([+-]?[\d.]+)/)
  const windVal = windM ? parseFloat(windM[1]) : null
  const wind    = windVal !== null && !isNaN(windVal) ? windVal.toFixed(1) : null
  let mark
  if (unit === 'E') {
    const totalInches = Math.round(rawMark)
    mark = `${Math.floor(totalInches / 12)}-${totalInches % 12}`
  } else {
    if (rawMark >= 60) {
      const mins = Math.floor(rawMark / 60)
      const secs = (rawMark % 60).toFixed(2).padStart(5, '0')
      mark = `${mins}:${secs}`
    } else {
      mark = rawMark.toFixed(2)
    }
  }
  return { mark, wind, place }
}

function parseE6(line) {
  const m = line.match(/^E6\s*(\d+)\s+(Boys|Girls)\s+([\d-]+)\s+(.+?)(?:\s{3,}|$)/)
  if (!m) return null
  const [, numStr, genderStr, ageGroup, rawName] = m
  let name = rawName.trim()
  if (/^Other\s+SOFTBALL$/i.test(name)) name = 'Softball Throw'
  else if (/^Other\s+/i.test(name)) name = name.replace(/^Other\s+/i, '').trim()
  return { num: parseInt(numStr), name, gender: genderStr === 'Girls' ? 'F' : 'M', ageGroup }
}

function normEventName(n) {
  return n
    .replace(/\b(\d+)\s*m\b/i, '$1 meter')
    .replace(/\bmeter\s+dash\b/i, 'meter dash')
    .replace(/\brun\b/i, 'run')
    .replace(/\bhurdles?\b/i, 'hurdles')
    .replace(/\bjump\b/i, 'jump')
    .replace(/\bvault\b/i, 'vault')
    .replace(/\bthrow\b/i, 'throw')
    .replace(/\bput\b/i, 'put')
    .replace(/\bpentathlon\b/i, 'pentathlon')
    .replace(/\bheptathlon\b/i, 'heptathlon')
    .replace(/\bdecathlon\b/i, 'decathlon')
    .replace(/\brelay\b/i, 'relay')
    .trim()
}

function parseTCL(filePath) {
  const raw   = fs.readFileSync(filePath, 'latin1')
  const lines = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')

  let meetName = 'Imported Meet', meetDate = new Date().toISOString().slice(0, 10), meetLocation = ''
  const athleteMap   = new Map()
  const eventDescMap = new Map()
  const entries      = []
  let currentTeam = '', currentTeamCode = '', pendingEntry = null, pendingResult = null

  for (const rawLine of lines) {
    const line = rawLine.trimEnd()
    const type = line.length >= 2 ? line.slice(0, 2) : ''

    if (type === 'B1' && line.length >= 90) {
      meetName     = line.slice(47, 87).trim() || line.slice(2, 47).trim() || 'Imported Meet'
      meetLocation = line.slice(2, 47).trim()
      const dm = line.match(/(\d{2})\/(\d{2})-(\d{2})/)
      if (dm) meetDate = `20${dm[3]}-${dm[1]}-${dm[2]}`
    }

    if (type === 'C1') {
      const rest = line.slice(2)
      const cm   = rest.match(/^([A-Z0-9]{2,5})\s+(.+?)\s{3,}/)
      if (cm) { currentTeamCode = cm[1].trim(); currentTeam = cm[2].trim() }
      else {
        currentTeamCode = rest.match(/^([A-Z0-9]{2,5})/)?.[1] || ''
        currentTeam     = rest.replace(/^[A-Z0-9]{2,5}\s+/, '').split(/\s{3,}/)[0].trim()
      }
    }

    if (type === 'D1') {
      if (line.length < 40) continue
      const gender = line[2]
      if (gender !== 'M' && gender !== 'F') continue
      const num   = line.slice(3, 8).trim()
      const last  = line.slice(8, 23).trim()
      const first = line.slice(23, 35).trim()
      if (!last || !first) continue
      const dm  = line.slice(40).match(/(\d{2})\/(\d{2})-(\d{2})/)
      const dob = dm ? `20${dm[3]}-${dm[1]}-${dm[2]}` : ''
      if (num) athleteMap.set(num, { firstName: first, lastName: last, gender, dob, team: currentTeam, teamCode: currentTeamCode })
    }

    if (type === 'E1') {
      pendingEntry  = { athleteNum: line.slice(3, 8).trim() }
      pendingResult = null
    }
    if (type === 'E2') pendingResult = parseE2(line)
    if (type === 'E6') {
      const ev = parseE6(line)
      if (ev) {
        eventDescMap.set(ev.num, ev)
        if (pendingEntry && pendingResult) {
          entries.push({ athleteNum: pendingEntry.athleteNum, eventNum: ev.num, ...pendingResult })
        }
      }
      pendingEntry = pendingResult = null
    }
  }
  return { meetName, meetDate, meetLocation, athleteMap, eventDescMap, entries }
}

// ── Import ────────────────────────────────────────────────────────────────────
const db = new Database(DB_PATH)

const { meetName, meetDate, meetLocation, athleteMap, eventDescMap, entries } = parseTCL(TCL_FILE)

// Team breakdown
const teamCounts = {}
for (const a of athleteMap.values()) teamCounts[a.team || 'Unknown'] = (teamCounts[a.team || 'Unknown'] || 0) + 1
console.log('\nParsed athletes by team:')
for (const [t, n] of Object.entries(teamCounts)) console.log(`  ${t}: ${n}`)
console.log('Total athletes:', athleteMap.size)
console.log('Total entries:', entries.length)
console.log('Total events:', eventDescMap.size)

// Home team
const homeRow = db.prepare(
  `SELECT team, COUNT(*) cnt FROM athletes WHERE active=1 AND team!='' GROUP BY team ORDER BY cnt DESC LIMIT 1`
).get()
const homeTeamName = homeRow?.team || 'Pegasus Track'
console.log('\nHome team name (from DB):', homeTeamName)

// tf_events
const tfEventRows = db.prepare('SELECT id, name, category FROM tf_events').all()
console.log('tf_events in DB:', tfEventRows.length)
const tfByNorm = new Map()
for (const e of tfEventRows) {
  tfByNorm.set(e.name.toLowerCase(), e)
  tfByNorm.set(normEventName(e.name.toLowerCase()), e)
}

const importFn = db.transaction(() => {
  // Create meet
  const meetIns = db.prepare(
    `INSERT INTO meets (name, date, location, status) VALUES (?,?,?,'completed')`
  ).run(meetName, meetDate, meetLocation || '')
  const meetId = meetIns.lastInsertRowid
  console.log('\nCreated meet id:', meetId, 'name:', meetName, 'date:', meetDate)

  // Meet events
  const stmtME = db.prepare(
    `INSERT INTO meet_events (meet_id, tf_event_id, gender, age_group, round, tcl_event_num)
     VALUES (?,?,?,?,?,?)`
  )
  const comboToMeid = new Map()
  const meetEventMap = new Map()
  const skippedEvents = []

  for (const [evNum, evDesc] of eventDescMap) {
    const key = evDesc.name.toLowerCase()
    const tfEvent = tfByNorm.get(key) || tfByNorm.get(normEventName(key))
    if (!tfEvent) { skippedEvents.push(evDesc.name); continue }
    const ck = `${tfEvent.id}_${evDesc.gender}_${evDesc.ageGroup}`
    if (!comboToMeid.has(ck)) {
      const r = stmtME.run(meetId, tfEvent.id, evDesc.gender, evDesc.ageGroup, 'final', evNum)
      comboToMeid.set(ck, r.lastInsertRowid)
    }
    meetEventMap.set(evNum, { meid: comboToMeid.get(ck), tfEvent })
  }
  console.log('Meet events created:', comboToMeid.size, '  Unmatched event names:', [...new Set(skippedEvents)].join(', ') || 'none')

  // Athletes
  const findByNum    = db.prepare('SELECT id, active FROM athletes WHERE athlete_number=? LIMIT 1')
  const findByNameCI = db.prepare(
    `SELECT id, active FROM athletes WHERE lower(first_name)=lower(?) AND lower(last_name)=lower(?) AND date_of_birth=? LIMIT 1`
  )
  const reactivate = db.prepare("UPDATE athletes SET active=1, updated_at=datetime('now') WHERE id=?")
  const insertAth  = db.prepare(
    `INSERT INTO athletes (first_name, last_name, date_of_birth, gender, athlete_number, team, active)
     VALUES (@fn, @ln, @dob, @g, @num, @team, 1)`
  )
  const athIdCache = new Map()
  let athFound = 0, athInserted = 0, athNotInMap = 0
  const insertErrors = []

  function resolveAthlete(num) {
    if (athIdCache.has(num)) return athIdCache.get(num)
    const info = athleteMap.get(num)
    if (!info) { athNotInMap++; return null }
    const isHomeTeam = /pegasus/i.test(info.team || '') || info.teamCode === 'PTC'
    const teamName   = isHomeTeam ? homeTeamName : (info.team || 'Unknown')

    let row = null
    if (isHomeTeam && num) row = findByNum.get(num)
    if (!row && info.dob)  row = findByNameCI.get(info.firstName, info.lastName, info.dob)

    if (row) {
      if (!row.active) reactivate.run(row.id)
      athFound++
      athIdCache.set(num, row.id)
      return row.id
    }

    try {
      const ins = insertAth.run({ fn: info.firstName, ln: info.lastName, dob: info.dob || '0000-00-00', g: info.gender, num: num || null, team: teamName })
      athInserted++
      athIdCache.set(num, ins.lastInsertRowid)
      return ins.lastInsertRowid
    } catch (e) {
      insertErrors.push(`${info.firstName} ${info.lastName}: ${e.message}`)
      return null
    }
  }

  // Entries + Results
  const checkDupe = db.prepare('SELECT id FROM entries WHERE meet_event_id=? AND athlete_id=? LIMIT 1')
  const stmtEntry = db.prepare(
    `INSERT INTO entries (meet_event_id, athlete_id, seed_mark, heat, lane) VALUES (?,?,?,1,0)`
  )
  const stmtRes = db.prepare(
    `INSERT INTO results (entry_id, mark, wind, place, dns, dnf, dq) VALUES (?,?,?,?,0,0,0)`
  )

  let entriesAdded = 0, resultsAdded = 0, skippedNoEvent = 0, skippedNoAthlete = 0, skippedDupe = 0
  for (const en of entries) {
    const ev = meetEventMap.get(en.eventNum)
    if (!ev) { skippedNoEvent++; continue }
    const athleteId = resolveAthlete(en.athleteNum)
    if (!athleteId) { skippedNoAthlete++; continue }
    if (checkDupe.get(ev.meid, athleteId)) { skippedDupe++; continue }
    const entryRow = stmtEntry.run(ev.meid, athleteId, en.mark || null)
    entriesAdded++
    if (en.mark) {
      stmtRes.run(entryRow.lastInsertRowid, en.mark, en.wind || null, en.place || null)
      resultsAdded++
    }
  }

  return { meetId, eventsAdded: comboToMeid.size, entriesAdded, resultsAdded,
           athFound, athInserted, athNotInMap, insertErrors,
           skippedNoEvent, skippedNoAthlete, skippedDupe }
})

const r = importFn()

console.log('\n=== IMPORT RESULT ===')
console.log(`Events:   ${r.eventsAdded}`)
console.log(`Entries:  ${r.entriesAdded}`)
console.log(`Results:  ${r.resultsAdded}`)
console.log(`Athletes: found=${r.athFound}  inserted=${r.athInserted}  notInMap=${r.athNotInMap}`)
console.log(`Skipped:  noEvent=${r.skippedNoEvent}  noAthlete=${r.skippedNoAthlete}  dupe=${r.skippedDupe}`)
if (r.insertErrors.length) console.log('INSERT ERRORS:', r.insertErrors)

// Verify: what teams are in DB now?
const teamsInDB = db.prepare(
  `SELECT team, COUNT(*) cnt FROM athletes WHERE active=1 GROUP BY team ORDER BY cnt DESC`
).all()
console.log('\nTeams in DB after import:')
for (const t of teamsInDB) console.log(`  "${t.team}": ${t.cnt} athletes`)
