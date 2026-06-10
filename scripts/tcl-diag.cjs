#!/usr/bin/env node
// Quick TCL parser diagnostic — run with:  node scripts/tcl-diag.cjs
'use strict'
const fs = require('fs')
const FILE = 'H:\\Meet Results-PEGASUS TRACK CLUB-27May2026-001\\TCL01-01.tcl'

function _parseE2(line) {
  if (line.length < 14) return { mark: null, wind: null, place: null }
  const rawMark = parseFloat(line.slice(3, 11)) || 0
  const unit    = line[11] || 'M'
  const qual    = line[12] || ' '
  const dataRegion = line.slice(0, 60)
  const allNums = [...dataRegion.matchAll(/\d+/g)]
  const lastNum = allNums.length ? parseInt(allNums[allNums.length - 1][0]) : null
  const place   = lastNum || null
  if (!rawMark || qual !== ' ') return { mark: null, wind: null, place: null, isDNS: qual === 'Q' }
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

function _parseE6(line) {
  const m = line.match(/^E6\s*(\d+)\s+(Boys|Girls)\s+([\d-]+)\s+(.+?)(?:\s{3,}|$)/)
  if (!m) return null
  const [, numStr, genderStr, ageGroup, rawName] = m
  let name = rawName.trim()
  if (/^Other\s+SOFTBALL$/i.test(name)) name = 'Softball Throw'
  else if (/^Other\s+/i.test(name)) name = name.replace(/^Other\s+/i, '').trim()
  return { num: parseInt(numStr), name, gender: genderStr === 'Girls' ? 'F' : 'M', ageGroup }
}

const raw   = fs.readFileSync(FILE, 'latin1')
const lines = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')

const athleteMap   = new Map()
const eventDescMap = new Map()
const entries      = []
let currentTeam = '', currentTeamCode = '', pendingEntry = null, pendingResult = null

for (const rawLine of lines) {
  const line = rawLine.trimEnd()
  const type = line.length >= 2 ? line.slice(0, 2) : ''

  if (type === 'C1') {
    const rest = line.slice(2)
    const cm   = rest.match(/^([A-Z0-9]{2,5})\s+(.+?)\s{3,}/)
    if (cm) { currentTeamCode = cm[1].trim(); currentTeam = cm[2].trim() }
    else {
      currentTeamCode = rest.match(/^([A-Z0-9]{2,5})/)?.[1] || ''
      currentTeam     = rest.replace(/^[A-Z0-9]{2,5}\s+/, '').split(/\s{3,}/)[0].trim()
    }
    console.log(`  C1 → team="${currentTeam}" code="${currentTeamCode}"`)
  }

  if (type === 'D1') {
    if (line.length < 40) { console.log(`  D1 SKIP short: ${line.slice(0,30)}`); continue }
    const gender = line[2]
    if (gender !== 'M' && gender !== 'F') { console.log(`  D1 SKIP gender="${gender}": ${line.slice(0,30)}`); continue }
    const num   = line.slice(3, 8).trim()
    const last  = line.slice(8, 23).trim()
    const first = line.slice(23, 35).trim()
    if (!last || !first) { console.log(`  D1 SKIP no name: num="${num}"`); continue }
    const dm  = line.slice(40).match(/(\d{2})\/(\d{2})-(\d{2})/)
    const dob = dm ? `20${dm[3]}-${dm[1]}-${dm[2]}` : ''
    if (!num) { console.log(`  D1 SKIP no num: ${first} ${last}`); continue }
    athleteMap.set(num, { firstName: first, lastName: last, gender, dob, team: currentTeam, teamCode: currentTeamCode })
  }

  if (type === 'E1') {
    const num = line.slice(3, 8).trim()
    pendingEntry  = { athleteNum: num }
    pendingResult = null
  }

  if (type === 'E2') pendingResult = _parseE2(line)

  if (type === 'E6') {
    const ev = _parseE6(line)
    if (ev) {
      eventDescMap.set(ev.num, ev)
      if (pendingEntry && pendingResult) {
        entries.push({ athleteNum: pendingEntry.athleteNum, eventNum: ev.num, ...pendingResult })
      }
    }
    pendingEntry  = null
    pendingResult = null
  }
}

// ── Summary ──
console.log('\n=== PARSE SUMMARY ===')
console.log('Athletes in map:', athleteMap.size)
console.log('Events in map:', eventDescMap.size)
console.log('Entries in array:', entries.length)

// Athletes by team
const teamCounts = {}
for (const a of athleteMap.values()) teamCounts[a.team] = (teamCounts[a.team] || 0) + 1
console.log('\nAthletes per team:')
for (const [t, n] of Object.entries(teamCounts)) console.log(`  ${t}: ${n}`)

// Entries by team (using athlete's team from athleteMap)
const entryTeamCounts = {}
let entryNoMap = 0
for (const en of entries) {
  const info = athleteMap.get(en.athleteNum)
  if (!info) { entryNoMap++; continue }
  entryTeamCounts[info.team] = (entryTeamCounts[info.team] || 0) + 1
}
console.log('\nEntries per team:')
for (const [t, n] of Object.entries(entryTeamCounts)) console.log(`  ${t}: ${n}`)
if (entryNoMap) console.log(`  [num not in athleteMap]: ${entryNoMap}`)

// Sample non-Pegasus entries
console.log('\nFirst 3 non-Pegasus entries:')
let shown = 0
for (const en of entries) {
  const info = athleteMap.get(en.athleteNum)
  if (!info || /pegasus/i.test(info.team)) continue
  console.log(`  num=${en.athleteNum} event=${en.eventNum} mark=${en.mark} team=${info.team}`)
  if (++shown >= 3) break
}

// Sample events
console.log('\nFirst 5 events:')
for (const [n, ev] of [...eventDescMap.entries()].slice(0, 5))
  console.log(`  num=${n} name="${ev.name}" gender=${ev.gender} ag=${ev.ageGroup}`)
