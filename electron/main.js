const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron')
const path = require('path')
const fs   = require('fs')

const isDev = !app.isPackaged
let db

// ─── Shared mark parser (track: seconds; field: inches) ───
function parseMark(str, category) {
  if (!str) return null
  const s = String(str).trim()
  if (!s || s === 'F' || s === 'X' || s === 'P' || s === 'NH') return null
  const isField = category === 'field' || category === 'combined'
  if (isField) {
    if (s.includes('-')) {
      const [ft, inch] = s.split('-')
      return parseFloat(ft) * 12 + parseFloat(inch || 0)
    }
    return parseFloat(s) || null
  }
  // track / relay — convert to seconds
  if (s.includes(':')) {
    const parts = s.split(':')
    if (parts.length === 2) return parseFloat(parts[0]) * 60 + parseFloat(parts[1])
    return parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2])
  }
  return parseFloat(s) || null
}

function bestAttempt(attemptsJson, category) {
  if (!attemptsJson) return null
  let arr
  try { arr = JSON.parse(attemptsJson) } catch { return null }
  const isField = category === 'field' || category === 'combined'
  let best = null, bestVal = isField ? -Infinity : Infinity
  for (const a of arr) {
    const v = parseMark(a, category)
    if (v === null) continue
    if (isField ? v > bestVal : v < bestVal) { bestVal = v; best = a }
  }
  return best
}

// ═══════════════════════════════════════════════
// DATABASE INIT
// ═══════════════════════════════════════════════

function initDatabase() {
  const Database = require('better-sqlite3')
  const userDataPath = app.getPath('userData')
  const dbPath = path.join(userDataPath, 'pegasus-track.db')
  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  require('./database/db')(db)
}

// ═══════════════════════════════════════════════
// WINDOW
// ═══════════════════════════════════════════════

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    backgroundColor: '#08091a',
    show: false,
  })
  win.once('ready-to-show', () => win.show())
  if (isDev) {
    win.loadURL('http://localhost:5174')
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

// ═══════════════════════════════════════════════
// IPC — ATHLETES
// ═══════════════════════════════════════════════

function registerAthleteHandlers() {
  ipcMain.handle('athletes:getAll', () => {
    return db.prepare(`
      SELECT id, first_name, last_name, date_of_birth, gender,
        athlete_number, team, notes, active, created_at,
        CAST((julianday('now') - julianday(date_of_birth)) / 365.25 AS INTEGER) AS age
      FROM athletes WHERE active = 1 ORDER BY team, last_name, first_name
    `).all()
  })

  ipcMain.handle('athletes:getById', (_, id) => {
    return db.prepare(`
      SELECT *, CAST((julianday('now') - julianday(date_of_birth)) / 365.25 AS INTEGER) AS age
      FROM athletes WHERE id = ?
    `).get(id)
  })

  ipcMain.handle('athletes:create', (_, data) => {
    const result = db.prepare(`
      INSERT INTO athletes (first_name, last_name, date_of_birth, gender, athlete_number, team, notes)
      VALUES (@first_name, @last_name, @date_of_birth, @gender, @athlete_number, @team, @notes)
    `).run({
      first_name: data.first_name, last_name: data.last_name,
      date_of_birth: data.date_of_birth, gender: data.gender,
      athlete_number: data.athlete_number || null,
      team: data.team || 'Pegasus Track',
      notes: data.notes || null,
    })
    return db.prepare(`
      SELECT *, CAST((julianday('now') - julianday(date_of_birth)) / 365.25 AS INTEGER) AS age
      FROM athletes WHERE id = ?
    `).get(result.lastInsertRowid)
  })

  ipcMain.handle('athletes:update', (_, id, data) => {
    db.prepare(`
      UPDATE athletes SET first_name=@first_name, last_name=@last_name,
        date_of_birth=@date_of_birth, gender=@gender,
        athlete_number=@athlete_number, team=@team, notes=@notes, updated_at=datetime('now')
      WHERE id=@id
    `).run({
      ...data,
      athlete_number: data.athlete_number || null,
      team: data.team || 'Pegasus Track',
      notes: data.notes || null,
      id,
    })
    return db.prepare(`
      SELECT *, CAST((julianday('now') - julianday(date_of_birth)) / 365.25 AS INTEGER) AS age
      FROM athletes WHERE id = ?
    `).get(id)
  })

  ipcMain.handle('athletes:delete', (_, id) => {
    db.prepare("UPDATE athletes SET active=0, updated_at=datetime('now') WHERE id=?").run(id)
    return { success: true }
  })

  ipcMain.handle('athletes:clearAll', () => {
    db.prepare("UPDATE athletes SET active=0, updated_at=datetime('now') WHERE active=1").run()
    return { success: true }
  })

  ipcMain.handle('athletes:renameTeam', (_, { oldName, newName }) => {
    const trimmed = newName.trim()
    const result = db.prepare(
      "UPDATE athletes SET team=?, updated_at=datetime('now') WHERE team=? AND active=1"
    ).run(trimmed, oldName)
    db.prepare("UPDATE team_profiles SET name=? WHERE name=?").run(trimmed, oldName)
    return { success: true, count: result.changes }
  })

  ipcMain.handle('athletes:getPRs', (_, athleteId) => {
    return db.prepare(`
      SELECT pr.mark, pr.indoor, pr.updated_at,
        e.name AS event_name, e.abbreviation, e.category, e.measurement_unit
      FROM personal_records pr
      JOIN tf_events e ON pr.tf_event_id = e.id
      WHERE pr.athlete_id = ?
      ORDER BY e.sort_order
    `).all(athleteId)
  })
}

// ═══════════════════════════════════════════════
// IPC — DASHBOARD
// ═══════════════════════════════════════════════

function registerDashboardHandlers() {
  ipcMain.handle('dashboard:getStats', () => {
    const totalAthletes  = db.prepare("SELECT COUNT(*) AS c FROM athletes WHERE active=1").get().c
    const maleAthletes   = db.prepare("SELECT COUNT(*) AS c FROM athletes WHERE active=1 AND gender='M'").get().c
    const femaleAthletes = db.prepare("SELECT COUNT(*) AS c FROM athletes WHERE active=1 AND gender='F'").get().c
    const upcomingMeets  = db.prepare("SELECT COUNT(*) AS c FROM meets WHERE status='upcoming'").get().c
    const activeSeason   = db.prepare("SELECT * FROM seasons WHERE active=1 LIMIT 1").get()

    const ageDistribution = db.prepare(`
      SELECT
        CASE
          WHEN CAST((julianday('now')-julianday(date_of_birth))/365.25 AS INTEGER)<=6  THEN '5-6'
          WHEN CAST((julianday('now')-julianday(date_of_birth))/365.25 AS INTEGER)<=8  THEN '7-8'
          WHEN CAST((julianday('now')-julianday(date_of_birth))/365.25 AS INTEGER)<=10 THEN '9-10'
          WHEN CAST((julianday('now')-julianday(date_of_birth))/365.25 AS INTEGER)<=12 THEN '11-12'
          WHEN CAST((julianday('now')-julianday(date_of_birth))/365.25 AS INTEGER)<=14 THEN '13-14'
          WHEN CAST((julianday('now')-julianday(date_of_birth))/365.25 AS INTEGER)<=16 THEN '15-16'
          ELSE '17-18'
        END AS age_group, COUNT(*) AS count
      FROM athletes WHERE active=1 GROUP BY age_group
    `).all()

    const recentAthletes = db.prepare(`
      SELECT first_name, last_name, gender, date_of_birth, created_at,
        CAST((julianday('now')-julianday(date_of_birth))/365.25 AS INTEGER) AS age
      FROM athletes WHERE active=1 ORDER BY created_at DESC LIMIT 5
    `).all()

    const upcomingMeetsList = db.prepare(
      "SELECT * FROM meets WHERE status='upcoming' ORDER BY date ASC LIMIT 3"
    ).all()

    return { totalAthletes, maleAthletes, femaleAthletes, upcomingMeets, activeSeason,
             ageDistribution, recentAthletes, upcomingMeetsList }
  })
}

// ═══════════════════════════════════════════════
// IPC — SEASONS
// ═══════════════════════════════════════════════

function registerSeasonHandlers() {
  ipcMain.handle('seasons:getAll', () =>
    db.prepare('SELECT * FROM seasons ORDER BY year DESC, id DESC').all()
  )
  ipcMain.handle('seasons:create', (_, data) => {
    if (data.active) db.prepare('UPDATE seasons SET active=0').run()
    const result = db.prepare(`
      INSERT INTO seasons (name, year, type, start_date, end_date, active)
      VALUES (@name, @year, @type, @start_date, @end_date, @active)
    `).run({ name:data.name, year:data.year, type:data.type||'outdoor',
             start_date:data.start_date||null, end_date:data.end_date||null, active:data.active?1:0 })
    return db.prepare('SELECT * FROM seasons WHERE id=?').get(result.lastInsertRowid)
  })
  ipcMain.handle('seasons:setActive', (_, id) => {
    db.prepare('UPDATE seasons SET active=0').run()
    db.prepare('UPDATE seasons SET active=1 WHERE id=?').run(id)
    return { success: true }
  })
}

// ═══════════════════════════════════════════════
// IPC — EVENTS
// ═══════════════════════════════════════════════

function registerEventHandlers() {
  ipcMain.handle('tfEvents:getAll', () =>
    db.prepare('SELECT * FROM tf_events ORDER BY sort_order').all()
  )
}

// ═══════════════════════════════════════════════
// IPC — SETTINGS
// ═══════════════════════════════════════════════

function registerSettingsHandlers() {
  const { readSettings, writeSettings } = require('./settings')

  ipcMain.handle('settings:get', () => {
    const s = readSettings()
    return {
      supabaseUrl:     s.supabaseUrl     || '',
      supabaseAnonKey: s.supabaseAnonKey || '',
      parentEmail:     s.parentEmail     || '',
      hasServiceKey:   !!s.supabaseServiceKey,
      hasClaudeKey:    !!s.claudeApiKey,
      connected:       s.connected       || false,
      labelPrinter:    s.labelPrinter    || '',
      sheetPrinter:    s.sheetPrinter    || '',
    }
  })

  ipcMain.handle('settings:save', (_, data) => {
    const updates = {
      supabaseUrl:     data.supabaseUrl,
      supabaseAnonKey: data.supabaseAnonKey,
      parentEmail:     data.parentEmail,
    }
    if (data.supabaseServiceKey) updates.supabaseServiceKey = data.supabaseServiceKey
    if (data.claudeApiKey)       updates.claudeApiKey       = data.claudeApiKey
    if (data.labelPrinter  !== undefined) updates.labelPrinter  = data.labelPrinter
    if (data.sheetPrinter  !== undefined) updates.sheetPrinter  = data.sheetPrinter
    writeSettings(updates)
    return { success: true }
  })
}

// ═══════════════════════════════════════════════
// IPC — AI CHAT
// ═══════════════════════════════════════════════

function registerAiHandlers() {
  const { readSettings } = require('./settings')

  ipcMain.handle('ai:chat', async (_, { messages, systemPrompt }) => {
    const s = readSettings()
    if (!s.claudeApiKey) return { error: 'no_key' }
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'content-type':      'application/json',
          'x-api-key':         s.claudeApiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model:      'claude-haiku-4-5-20251001',
          max_tokens: 1024,
          system:     systemPrompt,
          messages,
        }),
      })
      if (!res.ok) return { error: `API ${res.status}: ${await res.text()}` }
      return await res.json()
    } catch (e) {
      return { error: e.message }
    }
  })
}

// ═══════════════════════════════════════════════
// IPC — SYNC
// ═══════════════════════════════════════════════

function registerSyncHandlers() {
  const { readSettings, writeSettings } = require('./settings')
  const syncModule = require('./sync')

  function getClient() {
    const s = readSettings()
    if (!s.supabaseUrl || !s.supabaseServiceKey)
      throw new Error('Supabase not configured. Open Settings to connect.')
    return syncModule.makeClient(s.supabaseUrl, s.supabaseServiceKey)
  }

  ipcMain.handle('sync:test', async (_, { url, serviceKey }) => {
    try {
      await syncModule.testConnection(url, serviceKey)
      writeSettings({ connected: true })
      return { success: true }
    } catch (err) {
      writeSettings({ connected: false })
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('sync:setupParentAccount', async (_, { url, serviceKey, email, password }) => {
    try {
      const s = readSettings()
      const resolvedUrl = url || s.supabaseUrl
      const resolvedKey = serviceKey || s.supabaseServiceKey
      const result = await syncModule.setupParentAccount(resolvedUrl, resolvedKey, email, password)
      return { success: true, ...result }
    } catch (err) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('sync:fullSync', async () => {
    try {
      const sb = getClient()
      const result = await syncModule.fullSync(db, sb)
      return { success: true, ...result }
    } catch (err) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('sync:publishMeet', async (_, meetId, options) => {
    try {
      const sb = getClient()
      await syncModule.publishMeet(db, sb, meetId, options)
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  })
}

// ═══════════════════════════════════════════════
// IPC — MEETS
// ═══════════════════════════════════════════════

function registerMeetHandlers() {

  ipcMain.handle('meets:getAll', () =>
    db.prepare(`
      SELECT m.*, s.name AS season_name,
        (SELECT COUNT(*) FROM meet_events WHERE meet_id = m.id) AS event_count
      FROM meets m LEFT JOIN seasons s ON m.season_id = s.id
      ORDER BY m.date DESC
    `).all()
  )

  ipcMain.handle('meets:create', (_, data) => {
    const r = db.prepare(`
      INSERT INTO meets (season_id, name, date, location, host, type, status, notes)
      VALUES (@season_id, @name, @date, @location, @host, @type, 'upcoming', @notes)
    `).run({
      season_id: data.season_id || null, name: data.name, date: data.date,
      location: data.location || null, host: data.host || null,
      type: data.type || 'invitational', notes: data.notes || null,
    })
    return db.prepare(`
      SELECT m.*, s.name AS season_name FROM meets m
      LEFT JOIN seasons s ON m.season_id = s.id WHERE m.id = ?
    `).get(r.lastInsertRowid)
  })

  ipcMain.handle('meets:update', (_, id, data) => {
    db.prepare(`
      UPDATE meets SET name=@name, date=@date, location=@location, host=@host,
        type=@type, status=@status, notes=@notes, season_id=@season_id WHERE id=@id
    `).run({
      name: data.name, date: data.date, location: data.location || null,
      host: data.host || null, type: data.type, status: data.status,
      notes: data.notes || null, season_id: data.season_id || null, id,
    })
    return db.prepare(`
      SELECT m.*, s.name AS season_name FROM meets m
      LEFT JOIN seasons s ON m.season_id = s.id WHERE m.id = ?
    `).get(id)
  })

  ipcMain.handle('meets:delete', (_, id) => {
    db.prepare('DELETE FROM meets WHERE id=?').run(id)
    return { success: true }
  })

  ipcMain.handle('meets:getDetail', (_, id) => {
    const meet = db.prepare(`
      SELECT m.*, s.name AS season_name FROM meets m
      LEFT JOIN seasons s ON m.season_id = s.id WHERE m.id = ?
    `).get(id)
    if (!meet) return null
    const events = db.prepare(`
      SELECT me.*, e.name AS event_name, e.abbreviation, e.category,
        e.measurement_unit, e.is_relay,
        (SELECT COUNT(*) FROM entries WHERE meet_event_id = me.id AND scratched = 0) AS entry_count
      FROM meet_events me JOIN tf_events e ON me.tf_event_id = e.id
      WHERE me.meet_id = ? ORDER BY e.sort_order, me.gender
    `).all(id)
    return { ...meet, events }
  })

  ipcMain.handle('meetEvents:add', (_, data) => {
    const existing = db.prepare(`
      SELECT id FROM meet_events
      WHERE meet_id=? AND tf_event_id=? AND gender=? AND age_group IS ?
    `).get(data.meet_id, data.tf_event_id, data.gender, data.age_group || null)
    if (existing) return { error: 'This event/gender/age group combination already exists.' }
    const r = db.prepare(`
      INSERT INTO meet_events (meet_id, tf_event_id, gender, age_group, round, sort_order)
      VALUES (@meet_id, @tf_event_id, @gender, @age_group, @round, @sort_order)
    `).run({
      meet_id: data.meet_id, tf_event_id: data.tf_event_id,
      gender: data.gender, age_group: data.age_group || null,
      round: data.round || 'final', sort_order: data.sort_order || 999,
    })
    return db.prepare(`
      SELECT me.*, e.name AS event_name, e.abbreviation, e.category, e.measurement_unit, e.is_relay,
        0 AS entry_count
      FROM meet_events me JOIN tf_events e ON me.tf_event_id = e.id WHERE me.id = ?
    `).get(r.lastInsertRowid)
  })

  ipcMain.handle('meetEvents:remove', (_, id) => {
    db.prepare('DELETE FROM meet_events WHERE id=?').run(id)
    return { success: true }
  })

  ipcMain.handle('meetEvents:getWithEntries', (_, meetEventId) => {
    const ev = db.prepare(`
      SELECT me.*, e.name AS event_name, e.abbreviation, e.category, e.measurement_unit, e.is_relay
      FROM meet_events me JOIN tf_events e ON me.tf_event_id = e.id WHERE me.id = ?
    `).get(meetEventId)
    if (!ev) return null
    const entries = db.prepare(`
      SELECT en.*,
        a.first_name, a.last_name, a.gender AS athlete_gender, a.team,
        CAST((julianday('now')-julianday(a.date_of_birth))/365.25 AS INTEGER) AS athlete_age,
        r.id AS result_id, r.mark, r.place, r.wind,
        r.disqualified, r.dq_reason, r.did_not_start, r.did_not_finish,
        r.hand_timed, r.attempts_json, r.is_pr
      FROM entries en
      LEFT JOIN athletes a ON en.athlete_id = a.id
      LEFT JOIN results r ON r.entry_id = en.id
      WHERE en.meet_event_id = ?
      ORDER BY en.heat NULLS LAST, en.lane NULLS LAST, a.last_name
    `).all(meetEventId)
    return { ...ev, entries }
  })

  ipcMain.handle('entries:add', (_, data) => {
    const dupe = db.prepare(
      'SELECT id FROM entries WHERE meet_event_id=? AND athlete_id=?'
    ).get(data.meet_event_id, data.athlete_id)
    if (dupe) return { error: 'Athlete already entered in this event.' }
    const r = db.prepare(`
      INSERT INTO entries (meet_event_id, athlete_id, seed_mark)
      VALUES (@meet_event_id, @athlete_id, @seed_mark)
    `).run({
      meet_event_id: data.meet_event_id,
      athlete_id: data.athlete_id,
      seed_mark: data.seed_mark || null,
    })
    return db.prepare(`
      SELECT en.*,
        a.first_name, a.last_name, a.gender AS athlete_gender, a.team,
        CAST((julianday('now')-julianday(a.date_of_birth))/365.25 AS INTEGER) AS athlete_age,
        NULL AS result_id, NULL AS mark, NULL AS place, NULL AS wind,
        0 AS disqualified, NULL AS dq_reason, 0 AS did_not_start, 0 AS did_not_finish,
        0 AS hand_timed, NULL AS attempts_json, 0 AS is_pr
      FROM entries en LEFT JOIN athletes a ON en.athlete_id = a.id WHERE en.id = ?
    `).get(r.lastInsertRowid)
  })

  ipcMain.handle('entries:remove', (_, id) => {
    db.prepare('DELETE FROM entries WHERE id=?').run(id)
    return { success: true }
  })

  ipcMain.handle('entries:updateSeed', (_, id, seedMark) => {
    db.prepare('UPDATE entries SET seed_mark=? WHERE id=?').run(seedMark || null, id)
    return { success: true }
  })

  ipcMain.handle('entries:scratch', (_, id, scratched) => {
    db.prepare('UPDATE entries SET scratched=? WHERE id=?').run(scratched ? 1 : 0, id)
    return { success: true }
  })

  ipcMain.handle('results:save', (_, entryId, data) => {
    // Resolve entry → event info for PR detection
    const entryInfo = db.prepare(`
      SELECT en.athlete_id, me.tf_event_id, e.category
      FROM entries en
      JOIN meet_events me ON en.meet_event_id = me.id
      JOIN tf_events e ON me.tf_event_id = e.id
      WHERE en.id = ?
    `).get(entryId)

    // For field events, best attempt becomes the mark
    let markToSave = data.mark || null
    if (data.attempts_json) {
      const best = bestAttempt(data.attempts_json, entryInfo?.category)
      if (best) markToSave = best
    }

    // ── PR detection ─────────────────────────────────────────
    let isPr = 0
    const isValid = markToSave && !data.disqualified && !data.did_not_start && !data.did_not_finish
    if (entryInfo && isValid) {
      const pr = db.prepare(
        'SELECT mark FROM personal_records WHERE athlete_id=? AND tf_event_id=? AND indoor=0'
      ).get(entryInfo.athlete_id, entryInfo.tf_event_id)
      const newVal = parseMark(markToSave, entryInfo.category)
      const prVal  = pr ? parseMark(pr.mark, entryInfo.category) : null
      const isField = entryInfo.category === 'field' || entryInfo.category === 'combined'
      if (newVal !== null && (prVal === null || (isField ? newVal > prVal : newVal < prVal))) {
        isPr = 1
        db.prepare(`
          INSERT INTO personal_records (athlete_id, tf_event_id, mark, indoor, updated_at)
          VALUES (?, ?, ?, 0, datetime('now'))
          ON CONFLICT(athlete_id, tf_event_id, indoor)
          DO UPDATE SET mark=excluded.mark, updated_at=datetime('now')
        `).run(entryInfo.athlete_id, entryInfo.tf_event_id, markToSave)
      }
    }

    const existing = db.prepare('SELECT id FROM results WHERE entry_id=?').get(entryId)
    const row = {
      mark:           markToSave,
      wind:           (data.wind !== '' && data.wind != null) ? data.wind : null,
      place:          data.place || null,
      disqualified:   data.disqualified   ? 1 : 0,
      dq_reason:      data.dq_reason      || null,
      did_not_start:  data.did_not_start  ? 1 : 0,
      did_not_finish: data.did_not_finish ? 1 : 0,
      hand_timed:     data.hand_timed     ? 1 : 0,
      attempts_json:  data.attempts_json  || null,
      is_pr:          isPr,
    }
    if (existing) {
      db.prepare(`
        UPDATE results SET mark=@mark, wind=@wind, place=@place,
          disqualified=@disqualified, dq_reason=@dq_reason,
          did_not_start=@did_not_start, did_not_finish=@did_not_finish,
          hand_timed=@hand_timed, attempts_json=@attempts_json, is_pr=@is_pr
        WHERE entry_id=@entry_id
      `).run({ ...row, entry_id: entryId })
    } else {
      db.prepare(`
        INSERT INTO results (entry_id, mark, wind, place, disqualified, dq_reason,
          did_not_start, did_not_finish, hand_timed, attempts_json, is_pr)
        VALUES (@entry_id, @mark, @wind, @place, @disqualified, @dq_reason,
          @did_not_start, @did_not_finish, @hand_timed, @attempts_json, @is_pr)
      `).run({ ...row, entry_id: entryId })
    }
    return { success: true, is_pr: isPr }
  })

  ipcMain.handle('results:autoRank', (_, meetEventId) => {
    const ev = db.prepare(`
      SELECT me.*, e.category FROM meet_events me
      JOIN tf_events e ON me.tf_event_id = e.id WHERE me.id = ?
    `).get(meetEventId)
    if (!ev) return { success: false }

    const isField = ev.category === 'field' || ev.category === 'combined'

    const rows = db.prepare(`
      SELECT en.id AS entry_id, en.scratched,
        r.id AS result_id, r.mark, r.disqualified, r.did_not_start, r.did_not_finish
      FROM entries en
      LEFT JOIN results r ON r.entry_id = en.id
      WHERE en.meet_event_id = ?
    `).all(meetEventId)

    const valid = rows.filter(r => !r.scratched && r.mark && !r.disqualified && !r.did_not_start && !r.did_not_finish)
    const invalid = rows.filter(r => r.result_id && (r.scratched || !r.mark || r.disqualified || r.did_not_start || r.did_not_finish))

    valid.sort((a, b) => {
      const pa = parseMark(a.mark, ev.category)
      const pb = parseMark(b.mark, ev.category)
      if (pa === null) return 1
      if (pb === null) return -1
      return isField ? pb - pa : pa - pb
    })

    const updatePlace = db.prepare('UPDATE results SET place=? WHERE id=?')
    const clearPlace  = db.prepare('UPDATE results SET place=NULL WHERE id=?')

    db.transaction(() => {
      let i = 0
      while (i < valid.length) {
        const markVal = parseMark(valid[i].mark, ev.category)
        let j = i + 1
        while (j < valid.length && parseMark(valid[j].mark, ev.category) === markVal) j++
        for (let k = i; k < j; k++) {
          if (valid[k].result_id) updatePlace.run(i + 1, valid[k].result_id)
        }
        i = j
      }
      for (const r of invalid) clearPlace.run(r.result_id)
    })()

    return { success: true }
  })

  ipcMain.handle('meets:seedEvent', (_, meetEventId) => {
    const ev = db.prepare(`
      SELECT me.*, e.category FROM meet_events me
      JOIN tf_events e ON me.tf_event_id = e.id WHERE me.id = ?
    `).get(meetEventId)
    if (!ev) return { success: false }

    const entries = db.prepare(`
      SELECT en.*, r.mark AS existing_mark
      FROM entries en
      LEFT JOIN results r ON r.entry_id = en.id
      WHERE en.meet_event_id = ? AND en.scratched = 0
      ORDER BY en.id
    `).all(meetEventId)

    const isField = ev.category === 'field' || ev.category === 'combined'
    const LANE_ORDER = [4, 5, 3, 6, 2, 7, 1, 8]
    const HEAT_SIZE = 8

    function parseSeed(str) {
      if (!str) return isField ? -Infinity : Infinity
      if (!isField) {
        if (str.includes(':')) {
          const [m, s] = str.split(':')
          return parseFloat(m) * 60 + parseFloat(s)
        }
        return parseFloat(str) || Infinity
      } else {
        if (str.includes('-')) {
          const [ft, inch] = str.split('-')
          return parseFloat(ft) * 12 + parseFloat(inch || 0)
        }
        return parseFloat(str) || -Infinity
      }
    }

    const seeded   = entries.filter(e => e.seed_mark).sort((a, b) => isField
      ? parseSeed(b.seed_mark) - parseSeed(a.seed_mark)
      : parseSeed(a.seed_mark) - parseSeed(b.seed_mark))
    const unseeded = entries.filter(e => !e.seed_mark)
    const ordered  = [...seeded, ...unseeded]

    const updateEntry = db.prepare('UPDATE entries SET heat=?, lane=? WHERE id=?')

    if (isField) {
      db.transaction(() => {
        ordered.forEach((e, i) => updateEntry.run(Math.floor(i / HEAT_SIZE) + 1, (i % HEAT_SIZE) + 1, e.id))
      })()
    } else {
      const heats = {}
      ordered.forEach((e, i) => {
        const h = Math.floor(i / HEAT_SIZE) + 1
        if (!heats[h]) heats[h] = []
        heats[h].push(e)
      })
      db.transaction(() => {
        Object.entries(heats).forEach(([h, hEntries]) => {
          hEntries
            .sort((a, b) => parseSeed(a.seed_mark) - parseSeed(b.seed_mark))
            .forEach((e, i) => updateEntry.run(Number(h), LANE_ORDER[i] ?? i + 1, e.id))
        })
      })()
    }

    return { success: true }
  })
}

// ═══════════════════════════════════════════════
// IPC — SCHEDULE (meets + practices combined)
// ═══════════════════════════════════════════════

function registerScheduleHandlers() {
  ipcMain.handle('schedule:getUpcoming', () => {
    const today = new Date().toISOString().slice(0, 10)
    const meets = db.prepare(`
      SELECT id, name AS title, date, location, NULL AS start_time, NULL AS end_time,
             NULL AS notes, 'meet' AS item_type, type, status
      FROM meets
      WHERE status IN ('upcoming','active') AND date >= ?
      ORDER BY date ASC LIMIT 10
    `).all(today)
    const pracs = db.prepare(`
      SELECT id, title, date, location, start_time, end_time, notes,
             'practice' AS item_type, NULL AS type, NULL AS status
      FROM practices
      WHERE date >= ?
      ORDER BY date ASC LIMIT 10
    `).all(today)
    return [...meets, ...pracs]
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 10)
  })

  ipcMain.handle('practices:create', (_, data) => {
    const r = db.prepare(`
      INSERT INTO practices (title, date, start_time, end_time, location, notes, type)
      VALUES (@title, @date, @start_time, @end_time, @location, @notes, @type)
    `).run({
      title:      data.title,
      date:       data.date,
      start_time: data.start_time || null,
      end_time:   data.end_time   || null,
      location:   data.location   || null,
      notes:      data.notes      || null,
      type:       data.type       || 'practice',
    })
    return db.prepare('SELECT * FROM practices WHERE id=?').get(r.lastInsertRowid)
  })

  ipcMain.handle('practices:getAll', () =>
    db.prepare('SELECT * FROM practices ORDER BY date ASC').all()
  )

  ipcMain.handle('practices:delete', (_, id) => {
    db.prepare('DELETE FROM practices WHERE id=?').run(id)
    return { success: true }
  })
}

// ═══════════════════════════════════════════════
// IPC — IMPORT
// ═══════════════════════════════════════════════

function parseTCLFile(filePath) {
  const raw   = fs.readFileSync(filePath, 'latin1')
  // Normalise all line-ending styles (\r\n, \r, \n) before splitting
  const lines = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')

  const dbg = { totalLines: lines.length, d1Lines: 0, genderSkip: 0, nameSkip: 0, dobSkip: 0, firstD1: null }
  const seen     = new Set()
  const athletes = []

  for (const rawLine of lines) {
    const line = rawLine.trimEnd()
    if (line.length < 62) continue
    if (line.slice(0, 2) !== 'D1') continue
    dbg.d1Lines++
    if (dbg.firstD1 === null) dbg.firstD1 = JSON.stringify({ len: line.length, col2: line[2], dob: line.slice(54, 62) })

    const gender = line[2]
    if (gender !== 'M' && gender !== 'F') { dbg.genderSkip++; continue }

    const athleteNum = line.slice(3, 8).trim() || null
    const lastName   = line.slice(8, 23).trim()
    const firstName  = line.slice(23, 35).trim()

    if (!lastName || !firstName) { dbg.nameSkip++; continue }

    // Scan the back half of the line for MM/DD-YY — avoids fixed-column fragility
    const m = line.slice(40).match(/(\d{2})\/(\d{2})-(\d{2})/)
    if (!m) { dbg.dobSkip++; continue }

    const [, mm, dd, yy] = m
    const dob = `20${yy}-${mm}-${dd}`
    const key = `${firstName}|${lastName}|${dob}`
    if (seen.has(key)) continue
    seen.add(key)

    athletes.push({ first_name: firstName, last_name: lastName, gender, date_of_birth: dob, athlete_number: athleteNum, team: 'Pegasus Track' })
  }

  return { athletes, dbg }
}

function registerImportHandlers() {
  ipcMain.handle('import:tcl', async () => {
    try {
      const result = await dialog.showOpenDialog({
        title: 'Import Hy-tek TCL Roster',
        filters: [
          { name: 'Hy-tek TCL Files', extensions: ['TCL', 'tcl', 'txt'] },
          { name: 'All Files', extensions: ['*'] },
        ],
        properties: ['openFile'],
      })
      if (result.canceled || !result.filePaths.length) return null

      const { athletes, dbg } = parseTCLFile(result.filePaths[0])
      console.log('TCL import diagnostics:', JSON.stringify(dbg))
      if (!athletes.length) {
        return { error: `No athletes found in the file.\n\nDiagnostics: ${JSON.stringify(dbg)}` }
      }

      const existingKeys = new Set(
        db.prepare('SELECT first_name, last_name, date_of_birth FROM athletes WHERE active=1')
          .all()
          .map(a => `${a.first_name}|${a.last_name}|${a.date_of_birth}`)
      )

      return athletes.map(a => ({
        ...a,
        duplicate: existingKeys.has(`${a.first_name}|${a.last_name}|${a.date_of_birth}`),
      }))
    } catch (err) {
      return { error: err.message }
    }
  })
}

// ═══════════════════════════════════════════════
// APP LIFECYCLE
// ═══════════════════════════════════════════════

function registerPrintHandlers() {
  const os = require('os')

  ipcMain.handle('print:thermal', async (event, { html, css, widthMicrons, heightMicrons }) => {
    const wIn = widthMicrons / 25400
    const hIn = heightMicrons / 25400

    // Safety overrides at the end ensure nothing from collected CSS can hide content
    const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
${css}
@page { size: ${wIn}in ${hIn}in; margin: 0; }
body { margin: 0; padding: 0; }
* { visibility: visible !important; color: #000 !important; }
</style></head><body>${html}</body></html>`

    // Write to a temp file — avoids URL-encoding size limits on large HTML
    const tmpFile = path.join(os.tmpdir(), `pegasus-labels-${Date.now()}.html`)
    fs.writeFileSync(tmpFile, fullHtml, 'utf8')

    const printWin = new BrowserWindow({
      show: false,
      width:  Math.round(wIn * 96),
      height: Math.round(hIn * 96),
      webPreferences: { nodeIntegration: false, contextIsolation: true },
    })

    await printWin.loadURL(`file:///${tmpFile.replace(/\\/g, '/')}`)

    const { readSettings } = require('./settings')
    const labelPrinter = readSettings().labelPrinter || ''

    return new Promise(resolve => {
      const opts = {
        silent: !!labelPrinter,
        printBackground: true,
        pageSize: { width: widthMicrons, height: heightMicrons },
        margins: { marginType: 'none' },
      }
      if (labelPrinter) opts.deviceName = labelPrinter
      printWin.webContents.print(opts, (success, reason) => {
        printWin.close()
        try { fs.unlinkSync(tmpFile) } catch {}
        resolve({ success, reason: reason ?? null })
      })
    })
  })

  // ── List available printers ──
  ipcMain.handle('printers:list', async (event) => {
    try {
      const printers = await event.sender.getPrintersAsync()
      return printers.map(p => ({ name: p.name, isDefault: p.isDefault, description: p.description || '' }))
    } catch {
      return []
    }
  })

  // ── Print letter-size sheet (heat sheets / results) ──
  ipcMain.handle('print:sheet', async (_, { html, css }) => {
    const os = require('os')
    const { readSettings } = require('./settings')
    const sheetPrinter = readSettings().sheetPrinter || ''

    const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
${css}
@page { size: 8.5in 11in; margin: 0; }
body  { margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; }
* { visibility: visible !important; }
</style></head><body>${html}</body></html>`

    const tmpHtml = path.join(os.tmpdir(), `pegasus-sheet-${Date.now()}.html`)
    fs.writeFileSync(tmpHtml, fullHtml, 'utf8')

    // Use a very tall window so multi-page content fully renders
    const printWin = new BrowserWindow({
      show: false,
      width: 816,
      height: 30000,
      webPreferences: { nodeIntegration: false, contextIsolation: true },
    })
    await printWin.loadURL(`file:///${tmpHtml.replace(/\\/g, '/')}`)
    // Brief pause to allow full layout
    await new Promise(r => setTimeout(r, 200))

    // If a specific printer is configured, print directly to it
    if (sheetPrinter) {
      return new Promise(resolve => {
        const opts = {
          silent: true,
          printBackground: true,
          pageSize: { width: 215900, height: 279400 },
          margins: { marginType: 'none' },
          deviceName: sheetPrinter,
        }
        printWin.webContents.print(opts, (success, reason) => {
          printWin.close()
          try { fs.unlinkSync(tmpHtml) } catch {}
          resolve({ success, reason: reason ?? null })
        })
      })
    }

    // No printer configured: generate a PDF and open it in the system viewer
    try {
      const pdfData = await printWin.webContents.printToPDF({
        printBackground: true,
        preferCSSPageSize: true,
      })
      printWin.close()
      try { fs.unlinkSync(tmpHtml) } catch {}
      const tmpPdf = path.join(os.tmpdir(), `pegasus-results-${Date.now()}.pdf`)
      fs.writeFileSync(tmpPdf, pdfData)
      const openErr = await shell.openPath(tmpPdf)
      return { success: !openErr, reason: openErr || null }
    } catch (e) {
      printWin.close()
      try { fs.unlinkSync(tmpHtml) } catch {}
      return { success: false, reason: e.message }
    }
  })
}

function registerTeamHandlers() {
  ipcMain.handle('teams:getProfiles', () => {
    return db.prepare('SELECT * FROM team_profiles ORDER BY name').all()
  })

  ipcMain.handle('teams:saveProfile', (_, data) => {
    const { name, location, head_coach, description, founded, logo } = data
    db.prepare(`
      INSERT INTO team_profiles (name, location, head_coach, description, founded, logo)
      VALUES (@name, @location, @head_coach, @description, @founded, @logo)
      ON CONFLICT(name) DO UPDATE SET
        location    = excluded.location,
        head_coach  = excluded.head_coach,
        description = excluded.description,
        founded     = excluded.founded,
        logo        = excluded.logo
    `).run({
      name,
      location:    location    || null,
      head_coach:  head_coach  || null,
      description: description || null,
      founded:     founded     || null,
      logo:        logo        ?? null,
    })
    return db.prepare('SELECT * FROM team_profiles WHERE name = ?').get(name)
  })
}

app.whenReady().then(() => {
  initDatabase()
  registerAthleteHandlers()
  registerDashboardHandlers()
  registerSeasonHandlers()
  registerEventHandlers()
  registerSettingsHandlers()
  registerTeamHandlers()
  registerSyncHandlers()
  registerMeetHandlers()
  registerScheduleHandlers()
  registerImportHandlers()
  registerPrintHandlers()
  registerAiHandlers()
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
