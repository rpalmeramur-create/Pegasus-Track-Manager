const { app, BrowserWindow, ipcMain, dialog, shell, session } = require('electron')
const path = require('path')
const fs   = require('fs')

// Prevent Chromium from caching HTTP responses — this app is offline/local
// and the cache only accumulates stale AI/sync responses over time.
app.commandLine.appendSwitch('disable-http-cache')

const isDev = !app.isPackaged
let db

// ─── Shared mark parser (track: seconds; field: inches) ───
// Ceiling a track seed mark to the nearest tenth of a second.
// Field/combined marks (feet-inches or meters) are returned unchanged.
function ceilTrackSeed(str, category) {
  if (!str) return str
  if (category === 'field' || category === 'combined') return str
  const s = String(str).trim()
  if (!s) return str
  const hasColon = s.includes(':')
  let secs
  if (hasColon) {
    const parts = s.split(':')
    secs = parts.length === 2
      ? parseFloat(parts[0]) * 60 + parseFloat(parts[1])
      : parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2])
  } else {
    secs = parseFloat(s)
  }
  if (!secs || isNaN(secs) || secs <= 0) return str
  // Round to ms first to eliminate float drift, then ceiling to tenth
  const ceiled = Math.ceil(Math.round(secs * 1000) / 100) / 10
  if (hasColon || ceiled >= 60) {
    const m = Math.floor(ceiled / 60)
    const r = ceiled - m * 60
    return `${m}:${r.toFixed(1).padStart(4, '0')}`
  }
  return ceiled.toFixed(1)
}

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

function parseLif(content) {
  const rows = []
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith(';') || line.startsWith('#')) continue

    const parts = line.split(',').map(p => p.trim().replace(/^"|"$/g, ''))
    if (parts.length < 7) continue

    // LIF: EventHeat, Place, Lane, LastName, FirstName, Affil, Seed, Final, Wind, ...
    const [evtHeat, place, lane, lastName, firstName, affiliation,, final, wind] = parts
    if (!lastName && !firstName) continue

    const evtStr  = (evtHeat || '').trim()
    const heatNum = evtStr.length >= 3 ? (parseInt(evtStr.slice(-2), 10) || 0) : 0
    const evtNum  = evtStr.length >= 3 ? (parseInt(evtStr.slice(0, -2), 10) || 0) : 0

    const finalMark = (final || '').trim()
    const dns = !finalMark || finalMark.toUpperCase() === 'DNS'
    const dnf = finalMark.toUpperCase() === 'DNF'
    const dq  = finalMark.toUpperCase() === 'DQ'

    rows.push({
      evtNum,
      heatNum,
      lane:        parseInt(lane,  10) || null,
      place:       parseInt(place, 10) || null,
      lastName:    (lastName    || '').trim(),
      firstName:   (firstName   || '').trim(),
      affiliation: (affiliation || '').trim(),
      mark:        (dns || dnf || dq) ? null : (finalMark || null),
      wind:        (wind || '').trim() || null,
      dns: dns ? 1 : 0,
      dnf: dnf ? 1 : 0,
      dq:  dq  ? 1 : 0,
    })
  }
  return rows
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
  const iconPath = path.join(__dirname, '../assets/icon.ico')
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
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
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
        ec1_name, ec1_rel, ec1_ph, ec1_ph2,
        ec2_name, ec2_rel, ec2_ph, medical,
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
      INSERT INTO athletes (first_name, last_name, date_of_birth, gender, athlete_number, team, notes,
        ec1_name, ec1_rel, ec1_ph, ec1_ph2, ec2_name, ec2_rel, ec2_ph, medical)
      VALUES (@first_name, @last_name, @date_of_birth, @gender, @athlete_number, @team, @notes,
        @ec1_name, @ec1_rel, @ec1_ph, @ec1_ph2, @ec2_name, @ec2_rel, @ec2_ph, @medical)
    `).run({
      first_name: data.first_name, last_name: data.last_name,
      date_of_birth: data.date_of_birth, gender: data.gender,
      athlete_number: data.athlete_number || null,
      team: data.team || 'Pegasus Track',
      notes: data.notes || null,
      ec1_name: data.ec1_name || null, ec1_rel: data.ec1_rel || null,
      ec1_ph:   data.ec1_ph   || null, ec1_ph2: data.ec1_ph2 || null,
      ec2_name: data.ec2_name || null, ec2_rel: data.ec2_rel || null,
      ec2_ph:   data.ec2_ph   || null, medical: data.medical || null,
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
        athlete_number=@athlete_number, team=@team, notes=@notes,
        ec1_name=@ec1_name, ec1_rel=@ec1_rel, ec1_ph=@ec1_ph, ec1_ph2=@ec1_ph2,
        ec2_name=@ec2_name, ec2_rel=@ec2_rel, ec2_ph=@ec2_ph, medical=@medical,
        updated_at=datetime('now')
      WHERE id=@id
    `).run({
      ...data,
      athlete_number: data.athlete_number || null,
      team: data.team || 'Pegasus Track',
      notes: data.notes || null,
      ec1_name: data.ec1_name || null, ec1_rel: data.ec1_rel || null,
      ec1_ph:   data.ec1_ph   || null, ec1_ph2: data.ec1_ph2 || null,
      ec2_name: data.ec2_name || null, ec2_rel: data.ec2_rel || null,
      ec2_ph:   data.ec2_ph   || null, medical: data.medical || null,
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

  ipcMain.handle('athletes:deduplicate', () => {
    // Find groups sharing the same name+DOB (case-insensitive). Keep the
    // lowest-id athlete in each group; re-point entries then soft-delete dupes.
    // Require a non-null, non-empty DOB to avoid merging unrelated athletes
    // who share a common name but have no date of birth on file.
    const dedupFn = db.transaction(() => {
      const groups = db.prepare(`
        SELECT lower(first_name) fn, lower(last_name) ln, date_of_birth dob,
               COUNT(*) cnt, MIN(id) keep_id, GROUP_CONCAT(id) ids
        FROM athletes
        WHERE active = 1
          AND date_of_birth IS NOT NULL
          AND date_of_birth != ''
        GROUP BY lower(first_name), lower(last_name), date_of_birth
        HAVING cnt > 1
      `).all()

      let merged = 0
      const updateEntry  = db.prepare('UPDATE entries SET athlete_id=? WHERE athlete_id=?')
      const updatePR     = db.prepare('UPDATE OR IGNORE personal_records SET athlete_id=? WHERE athlete_id=?')
      const softDelete   = db.prepare("UPDATE athletes SET active=0, updated_at=datetime('now') WHERE id=?")

      for (const g of groups) {
        const dupeIds = g.ids.split(',').map(Number).filter(id => id !== g.keep_id)
        for (const dupeId of dupeIds) {
          updateEntry.run(g.keep_id, dupeId)
          updatePR.run(g.keep_id, dupeId)
          softDelete.run(dupeId)
          merged++
        }
        // Make sure the kept athlete has the home-team name if it is a Pegasus athlete
        const kept = db.prepare('SELECT team FROM athletes WHERE id=?').get(g.keep_id)
        if (kept && /pegasus track club/i.test(kept.team)) {
          const homeRow = db.prepare(
            `SELECT team FROM athletes WHERE active=1 AND lower(team) LIKE '%pegasus%' AND id!=? ORDER BY id LIMIT 1`
          ).get(g.keep_id)
          const homeName = homeRow?.team || 'Pegasus Track'
          db.prepare("UPDATE athletes SET team=? WHERE id=?").run(homeName, g.keep_id)
        }
      }

      return { merged, groups: groups.length }
    })
    return dedupFn()
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

  ipcMain.handle('athletes:getProfile', (_, athleteId) => {
    const prs = db.prepare(`
      SELECT pr.mark, pr.indoor, pr.date, pr.updated_at,
        tfe.name AS event_name, tfe.abbreviation, tfe.category,
        tfe.measurement_unit, tfe.sort_order,
        m.name AS meet_name, m.date AS meet_date
      FROM personal_records pr
      JOIN tf_events tfe ON pr.tf_event_id = tfe.id
      LEFT JOIN meets m ON pr.meet_id = m.id
      WHERE pr.athlete_id = ?
      ORDER BY tfe.sort_order
    `).all(athleteId)

    const rows = db.prepare(`
      SELECT r.mark, r.place, r.is_pr, r.wind,
        tfe.name AS event_name, tfe.abbreviation, tfe.category, tfe.measurement_unit,
        m.id AS meet_id, m.name AS meet_name, m.date AS meet_date, m.type AS meet_type
      FROM results r
      JOIN entries e ON r.entry_id = e.id
      JOIN meet_events me ON e.meet_event_id = me.id
      JOIN tf_events tfe ON me.tf_event_id = tfe.id
      JOIN meets m ON me.meet_id = m.id
      WHERE e.athlete_id = ?
        AND r.mark IS NOT NULL AND r.mark != ''
        AND (r.disqualified IS NULL OR r.disqualified = 0)
        AND (r.did_not_start IS NULL OR r.did_not_start = 0)
        AND (r.did_not_finish IS NULL OR r.did_not_finish = 0)
      ORDER BY m.date DESC, tfe.sort_order
    `).all(athleteId)

    const meetMap = new Map()
    for (const row of rows) {
      if (!meetMap.has(row.meet_id)) {
        meetMap.set(row.meet_id, {
          meet_id: row.meet_id,
          meet_name: row.meet_name,
          meet_date: row.meet_date,
          meet_type: row.meet_type,
          results: [],
        })
      }
      meetMap.get(row.meet_id).results.push({
        event_name: row.event_name,
        abbreviation: row.abbreviation,
        category: row.category,
        measurement_unit: row.measurement_unit,
        mark: row.mark,
        place: row.place,
        is_pr: row.is_pr,
        wind: row.wind,
      })
    }

    const history = Array.from(meetMap.values())
    const stats = {
      meets: history.length,
      events: new Set(rows.map(r => r.event_name)).size,
      prs: prs.length,
    }

    return { prs, history, stats }
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
    db.prepare('SELECT * FROM tf_events ORDER BY is_custom, sort_order, name').all()
  )

  ipcMain.handle('tfEvents:create', (_, data) => {
    const maxOrder = db.prepare('SELECT MAX(sort_order) AS m FROM tf_events WHERE is_custom=1').get().m ?? 9000
    const result = db.prepare(`
      INSERT INTO tf_events (name, abbreviation, category, measurement_unit, is_relay, is_adaptive, is_custom, sort_order)
      VALUES (@name, @abbreviation, @category, @measurement_unit, @is_relay, @is_adaptive, 1, @sort_order)
    `).run({
      name:             data.name.trim(),
      abbreviation:     data.abbreviation?.trim() || null,
      category:         data.category         || 'track',
      measurement_unit: data.measurement_unit || 'time',
      is_relay:         data.is_relay         ? 1 : 0,
      is_adaptive:      data.is_adaptive      ? 1 : 0,
      sort_order:       maxOrder + 1,
    })
    return db.prepare('SELECT * FROM tf_events WHERE id=?').get(result.lastInsertRowid)
  })

  ipcMain.handle('tfEvents:update', (_, id, data) => {
    db.prepare(`
      UPDATE tf_events SET name=@name, abbreviation=@abbreviation, category=@category,
        measurement_unit=@measurement_unit, is_relay=@is_relay, is_adaptive=@is_adaptive
      WHERE id=@id AND is_custom=1
    `).run({
      name:             data.name.trim(),
      abbreviation:     data.abbreviation?.trim() || null,
      category:         data.category,
      measurement_unit: data.measurement_unit,
      is_relay:         data.is_relay    ? 1 : 0,
      is_adaptive:      data.is_adaptive ? 1 : 0,
      id,
    })
    return db.prepare('SELECT * FROM tf_events WHERE id=?').get(id)
  })

  ipcMain.handle('tfEvents:delete', (_, id) => {
    const inUse = db.prepare('SELECT COUNT(*) AS c FROM meet_events WHERE tf_event_id=?').get(id).c
    if (inUse > 0) return { success: false, error: 'This event is used in one or more meets and cannot be deleted.' }
    db.prepare('DELETE FROM tf_events WHERE id=? AND is_custom=1').run(id)
    return { success: true }
  })
}

// ═══════════════════════════════════════════════
// IPC — AUTH
// ═══════════════════════════════════════════════

function hashPassword(password) {
  const crypto = require('crypto')
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

function verifyPassword(password, stored) {
  try {
    const crypto = require('crypto')
    const [salt, hash] = stored.split(':')
    const verify = crypto.scryptSync(password, salt, 64).toString('hex')
    return verify === hash
  } catch { return false }
}

// In-memory session — persists for app lifetime; auto-restored from settings
let currentSession = null

function registerAuthHandlers() {
  const { readSettings, writeSettings } = require('./settings')

  // Restore saved session on startup
  const saved = readSettings().savedSession
  if (saved?.id) {
    const u = db.prepare('SELECT id, username, role, display_name FROM users WHERE id=? AND active=1').get(saved.id)
    if (u) currentSession = u
  }

  ipcMain.handle('auth:getSession', () => currentSession)

  ipcMain.handle('auth:login', (_, { username, password }) => {
    const user = db.prepare(
      'SELECT id, username, password_hash, role, display_name FROM users WHERE username=? AND active=1'
    ).get(username)
    if (!user) return { error: 'Invalid username or password' }
    if (!verifyPassword(password, user.password_hash)) return { error: 'Invalid username or password' }
    db.prepare("UPDATE users SET last_login=datetime('now') WHERE id=?").run(user.id)
    const session = { id: user.id, username: user.username, role: user.role, display_name: user.display_name }
    currentSession = session
    writeSettings({ savedSession: session })
    return session
  })

  ipcMain.handle('auth:logout', () => {
    currentSession = null
    const { readSettings: rs, writeSettings: ws } = require('./settings')
    const s = rs()
    delete s.savedSession
    const fs = require('fs')
    const path = require('path')
    const { app: _app } = require('electron')
    fs.writeFileSync(path.join(_app.getPath('userData'), 'settings.json'), JSON.stringify(s, null, 2), 'utf8')
    return { success: true }
  })

  ipcMain.handle('auth:listUsers', () => {
    return db.prepare('SELECT id, username, role, display_name, active, last_login, created_at FROM users ORDER BY role DESC, username').all()
  })

  ipcMain.handle('auth:createUser', (_, { username, password, role, display_name }) => {
    if (!username?.trim()) return { error: 'Username is required' }
    if (!password || password.length < 4) return { error: 'Password must be at least 4 characters' }
    const exists = db.prepare('SELECT id FROM users WHERE username=?').get(username.trim())
    if (exists) return { error: 'Username already exists' }
    const r = db.prepare(
      'INSERT INTO users (username, password_hash, role, display_name) VALUES (?,?,?,?)'
    ).run(username.trim(), hashPassword(password), role || 'parent', display_name?.trim() || null)
    return { id: r.lastInsertRowid }
  })

  ipcMain.handle('auth:updatePassword', (_, { userId, newPassword }) => {
    if (!newPassword || newPassword.length < 4) return { error: 'Password must be at least 4 characters' }
    db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(hashPassword(newPassword), userId)
    return { success: true }
  })

  ipcMain.handle('auth:updateUser', (_, { id, display_name, role }) => {
    db.prepare('UPDATE users SET display_name=?, role=? WHERE id=?').run(display_name || null, role, id)
    return { success: true }
  })

  ipcMain.handle('auth:deleteUser', (_, userId) => {
    // Prevent deleting the last admin
    const admins = db.prepare("SELECT COUNT(*) as n FROM users WHERE role='admin' AND active=1").get()
    const target = db.prepare('SELECT role FROM users WHERE id=?').get(userId)
    if (target?.role === 'admin' && admins.n <= 1) return { error: 'Cannot delete the last admin account' }
    db.prepare('UPDATE users SET active=0 WHERE id=?').run(userId)
    return { success: true }
  })
}

// ═══════════════════════════════════════════════
// IPC — SETTINGS
// ═══════════════════════════════════════════════

function registerSettingsHandlers() {
  const { readSettings, writeSettings } = require('./settings')

  ipcMain.handle('updates:check', async () => {
    const https = require('https')
    const current = app.getVersion()
    return new Promise(resolve => {
      const req = https.get(
        'https://api.github.com/repos/rpalmeramur-create/Pegasus-Track-Manager/releases/latest',
        { headers: { 'User-Agent': 'pegasus-track-app' } },
        res => {
          let body = ''
          res.on('data', d => { body += d })
          res.on('end', () => {
            try {
              const data = JSON.parse(body)
              const latest = (data.tag_name || '').replace(/^v/, '')
              const releaseUrl = data.html_url || ''
              const hasUpdate = latest && latest !== current &&
                latest.split('.').map(Number).join('') > current.split('.').map(Number).join('')
              resolve({ current, latest: latest || null, hasUpdate: !!hasUpdate, releaseUrl, error: null })
            } catch {
              resolve({ current, latest: null, hasUpdate: false, releaseUrl: '', error: 'Could not parse release info' })
            }
          })
        }
      )
      req.on('error', err => resolve({ current, latest: null, hasUpdate: false, releaseUrl: '', error: err.message }))
      req.setTimeout(8000, () => { req.destroy(); resolve({ current, latest: null, hasUpdate: false, releaseUrl: '', error: 'Request timed out' }) })
    })
  })

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
      homeTeam:             s.homeTeam             || 'Pegasus Track',
      attendanceThreshold:  s.attendanceThreshold  ?? 3,
    }
  })

  ipcMain.handle('db:backup', async () => {
    const { filePath, canceled } = await dialog.showSaveDialog({
      title: 'Save Pegasus Track Backup',
      defaultPath: path.join(app.getPath('documents'), `pegasus-backup-${new Date().toISOString().slice(0,10)}.db`),
      filters: [{ name: 'Pegasus Backup', extensions: ['db'] }],
    })
    if (canceled || !filePath) return { canceled: true }
    // Checkpoint WAL so the backup file is self-contained
    db.pragma('wal_checkpoint(TRUNCATE)')
    fs.copyFileSync(path.join(app.getPath('userData'), 'pegasus-track.db'), filePath)
    return { success: true, filePath }
  })

  ipcMain.handle('db:restore', async () => {
    const { filePaths, canceled } = await dialog.showOpenDialog({
      title: 'Restore Pegasus Track Backup',
      filters: [{ name: 'Pegasus Backup', extensions: ['db'] }],
      properties: ['openFile'],
    })
    if (canceled || !filePaths.length) return { canceled: true }
    const dest = path.join(app.getPath('userData'), 'pegasus-track.db')
    db.close()
    fs.copyFileSync(filePaths[0], dest)
    app.relaunch()
    app.exit(0)
    return { success: true }
  })

  ipcMain.handle('settings:save', (_, data) => {
    const updates = {
      supabaseUrl:     data.supabaseUrl,
      supabaseAnonKey: data.supabaseAnonKey,
      parentEmail:     data.parentEmail,
    }
    if (data.supabaseServiceKey)          updates.supabaseServiceKey  = data.supabaseServiceKey
    if (data.claudeApiKey)                updates.claudeApiKey        = data.claudeApiKey
    if (data.labelPrinter  !== undefined) updates.labelPrinter        = data.labelPrinter
    if (data.sheetPrinter  !== undefined) updates.sheetPrinter        = data.sheetPrinter
    if (data.homeTeam      !== undefined) updates.homeTeam            = data.homeTeam
    if (data.attendanceThreshold !== undefined) updates.attendanceThreshold = Number(data.attendanceThreshold) || 3
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
    db.transaction(() => {
      // Delete in FK dependency order
      db.prepare('DELETE FROM personal_records WHERE meet_id=?').run(id)
      db.prepare('DELETE FROM attendance WHERE meet_id=?').run(id)
      db.prepare('DELETE FROM records WHERE meet_id=?').run(id)
      const evIds = db.prepare('SELECT id FROM meet_events WHERE meet_id=?').all(id).map(r => r.id)
      for (const evId of evIds) {
        const entryIds = db.prepare('SELECT id FROM entries WHERE meet_event_id=?').all(evId).map(r => r.id)
        for (const entId of entryIds) {
          db.prepare('DELETE FROM results WHERE entry_id=?').run(entId)
        }
        db.prepare('DELETE FROM entries WHERE meet_event_id=?').run(evId)
      }
      db.prepare('DELETE FROM meet_events WHERE meet_id=?').run(id)
      db.prepare('DELETE FROM meets WHERE id=?').run(id)
    })()
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

  ipcMain.handle('meetEvents:advance', (_, { fromEventId, toEventId, topN }) => {
    const toAdvance = db.prepare(`
      SELECT e.athlete_id, r.mark
      FROM entries e
      JOIN results r ON r.entry_id = e.id
      WHERE e.meet_event_id = ?
        AND e.scratched = 0
        AND (r.disqualified IS NULL OR r.disqualified = 0)
        AND (r.did_not_start IS NULL OR r.did_not_start = 0)
        AND (r.did_not_finish IS NULL OR r.did_not_finish = 0)
        AND r.place IS NOT NULL
      ORDER BY r.place ASC
      LIMIT ?
    `).all(fromEventId, topN)

    const checkEntry  = db.prepare('SELECT id FROM entries WHERE meet_event_id=? AND athlete_id=?')
    const insertEntry = db.prepare('INSERT INTO entries (meet_event_id, athlete_id, seed_mark) VALUES (?,?,?)')

    let advanced = 0, alreadyInEvent = 0
    db.transaction(() => {
      for (const row of toAdvance) {
        if (checkEntry.get(toEventId, row.athlete_id)) {
          alreadyInEvent++
        } else {
          insertEntry.run(toEventId, row.athlete_id, row.mark || null)
          advanced++
        }
      }
    })()

    return { advanced, alreadyInEvent }
  })

  ipcMain.handle('meetEvents:getWithEntries', (_, meetEventId) => {
    const ev = db.prepare(`
      SELECT me.*, e.name AS event_name, e.abbreviation, e.category, e.measurement_unit, e.is_relay
      FROM meet_events me JOIN tf_events e ON me.tf_event_id = e.id WHERE me.id = ?
    `).get(meetEventId)
    if (!ev) return null
    const entries = db.prepare(`
      SELECT en.*,
        a.first_name, a.last_name, a.gender AS athlete_gender, a.team, a.athlete_number,
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

    // Auto-fill seed_mark from prior meet results for entries that have none
    try {
      const needsSeed = entries.filter(e => !e.seed_mark && e.athlete_id)
      if (needsSeed.length > 0) {
        const meetDate = db.prepare('SELECT date FROM meets WHERE id=?').get(ev.meet_id)?.date
        const isField = ev.category === 'field' || ev.category === 'combined'
        const priorMarks = db.prepare(`
          SELECT e2.athlete_id, r2.mark
          FROM results r2
          JOIN entries e2      ON r2.entry_id        = e2.id
          JOIN meet_events me2 ON e2.meet_event_id   = me2.id
          JOIN meets m2        ON me2.meet_id         = m2.id
          WHERE e2.athlete_id IN (${needsSeed.map(() => '?').join(',')})
            AND me2.tf_event_id = ?
            AND r2.mark IS NOT NULL AND r2.mark != ''
            AND r2.did_not_start = 0 AND r2.did_not_finish = 0 AND r2.disqualified = 0
            ${meetDate ? 'AND m2.date < ?' : ''}
        `).all(...needsSeed.map(e => e.athlete_id), ev.tf_event_id, ...(meetDate ? [meetDate] : []))

        const bestByAthlete = {}
        for (const row of priorMarks) {
          const v = parseMark(row.mark, ev.category)
          if (v === null) continue
          const cur = bestByAthlete[row.athlete_id]
          if (!cur || (isField ? v > cur.v : v < cur.v)) {
            bestByAthlete[row.athlete_id] = { mark: row.mark, v }
          }
        }

        const updateSeed = db.prepare('UPDATE entries SET seed_mark=? WHERE id=?')
        for (const entry of needsSeed) {
          const best = bestByAthlete[entry.athlete_id]
          if (best) {
            const seeded = ceilTrackSeed(best.mark, ev.category)
            updateSeed.run(seeded, entry.id)
            entry.seed_mark = seeded
          }
        }
      }
    } catch (e) {
      console.error('[seed-fill] failed for meetEventId', meetEventId, e.message)
    }

    return { ...ev, entries }
  })

  ipcMain.handle('entries:add', (_, data) => {
    const dupe = db.prepare(
      'SELECT id FROM entries WHERE meet_event_id=? AND athlete_id=?'
    ).get(data.meet_event_id, data.athlete_id)
    if (dupe) return { error: 'Athlete already entered in this event.' }
    const evCat = db.prepare('SELECT e.category FROM meet_events me JOIN tf_events e ON me.tf_event_id = e.id WHERE me.id = ?').get(data.meet_event_id)
    const r = db.prepare(`
      INSERT INTO entries (meet_event_id, athlete_id, seed_mark)
      VALUES (@meet_event_id, @athlete_id, @seed_mark)
    `).run({
      meet_event_id: data.meet_event_id,
      athlete_id: data.athlete_id,
      seed_mark: ceilTrackSeed(data.seed_mark, evCat?.category) || null,
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

  ipcMain.handle('entries:getAthleteBestMark', (_, athleteId, tfEventId) => {
    // Pull all valid marks from results (not just PRs — import may skip place-less results)
    const rows = db.prepare(`
      SELECT r.mark, tfe.category
      FROM results r
      JOIN entries e   ON r.entry_id       = e.id
      JOIN meet_events me ON e.meet_event_id = me.id
      JOIN tf_events tfe  ON me.tf_event_id  = tfe.id
      WHERE e.athlete_id = ?
        AND me.tf_event_id = ?
        AND r.mark IS NOT NULL AND r.mark != ''
        AND r.did_not_start = 0 AND r.did_not_finish = 0 AND r.disqualified = 0
    `).all(athleteId, tfEventId)

    if (!rows.length) return null
    const isField = rows[0].category === 'field' || rows[0].category === 'combined'
    let best = null, bestVal = null
    for (const row of rows) {
      const v = parseMark(row.mark, rows[0].category)
      if (v === null) continue
      if (bestVal === null || (isField ? v > bestVal : v < bestVal)) {
        best = row.mark
        bestVal = v
      }
    }
    return best
  })

  ipcMain.handle('entries:updateSeed', (_, id, seedMark) => {
    const row = db.prepare('SELECT e.category FROM entries en JOIN meet_events me ON me.id = en.meet_event_id JOIN tf_events e ON e.id = me.tf_event_id WHERE en.id = ?').get(id)
    const mark = ceilTrackSeed(seedMark, row?.category)
    db.prepare('UPDATE entries SET seed_mark=? WHERE id=?').run(mark || null, id)
    return { success: true }
  })

  ipcMain.handle('entries:scratch', (_, id, scratched) => {
    db.prepare('UPDATE entries SET scratched=? WHERE id=?').run(scratched ? 1 : 0, id)
    return { success: true }
  })

  ipcMain.handle('results:save', (_, entryId, data) => {
    try {
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
    } catch (err) {
      console.error('[results:save] error:', err.message)
      return { success: false, error: err.message }
    }
  })

  // Clear DNS/DNF/DQ flags for all entries in a meet event (fix bad imports)
  ipcMain.handle('results:clearStatusFlags', (_, meetEventId) => {
    const entries = db.prepare('SELECT id FROM entries WHERE meet_event_id=?').all(meetEventId)
    // For entries with a mark: clear DNS/DNF only (a mark proves the athlete competed)
    const stmtWithMark = db.prepare(`
      UPDATE results SET did_not_start=0, did_not_finish=0
      WHERE entry_id=? AND mark IS NOT NULL AND mark != '' AND (did_not_start=1 OR did_not_finish=1)
    `)
    // For entries without a mark: clear all status flags (bad import artifact)
    const stmtNoMark = db.prepare(`
      UPDATE results SET did_not_start=0, did_not_finish=0, disqualified=0
      WHERE entry_id=? AND (mark IS NULL OR mark = '')
    `)
    let cleared = 0
    for (const en of entries) {
      cleared += stmtWithMark.run(en.id).changes
      cleared += stmtNoMark.run(en.id).changes
    }
    return { success: true, cleared }
  })

  // Clear DNS/DNF/DQ across every event in a meet (one-click import fix)
  ipcMain.handle('results:clearAllStatusFlags', (_, meetId) => {
    const entries = db.prepare(`
      SELECT e.id FROM entries e
      JOIN meet_events me ON me.id = e.meet_event_id
      WHERE me.meet_id = ?
    `).all(meetId)
    const stmtWithMark = db.prepare(`
      UPDATE results SET did_not_start=0, did_not_finish=0
      WHERE entry_id=? AND mark IS NOT NULL AND mark != '' AND (did_not_start=1 OR did_not_finish=1)
    `)
    const stmtNoMark = db.prepare(`
      UPDATE results SET did_not_start=0, did_not_finish=0, disqualified=0
      WHERE entry_id=? AND (mark IS NULL OR mark = '')
    `)
    let cleared = 0
    for (const en of entries) {
      cleared += stmtWithMark.run(en.id).changes
      cleared += stmtNoMark.run(en.id).changes
    }
    return { success: true, cleared }
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

  ipcMain.handle('meets:seedEvent', (_, meetEventId, heatSize, options = {}) => {
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
    const HEAT_SIZE = isField ? 8 : (Math.max(2, Math.min(10, Number(heatSize) || 8)))

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

    // Slowest/shortest first so Heat/Flight 1 runs first, fastest/best heat last
    const seeded   = entries.filter(e => e.seed_mark).sort((a, b) => isField
      ? parseSeed(a.seed_mark) - parseSeed(b.seed_mark)
      : parseSeed(b.seed_mark) - parseSeed(a.seed_mark))
    const unseeded = entries.filter(e => !e.seed_mark)
    // Unseeded athletes go first so they land in the slow/short heats, not the fast ones
    const ordered  = [...unseeded, ...seeded]

    const updateEntry = db.prepare('UPDATE entries SET heat=?, lane=? WHERE id=?')

    if (isField && options.noFlights) {
      db.transaction(() => {
        ordered.forEach((e, i) => updateEntry.run(null, i + 1, e.id))
      })()
    } else if (isField) {
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
// IPC — PARENT PORTAL
// ═══════════════════════════════════════════════

function registerPortalHandlers() {
  ipcMain.handle('portal:getMeetResults', () => {
    const meets = db.prepare(`
      SELECT id, name, date, location, type
      FROM meets
      WHERE status = 'completed'
      ORDER BY date DESC
      LIMIT 10
    `).all()

    for (const meet of meets) {
      meet.events = db.prepare(`
        SELECT me.id, me.gender, me.age_group, me.round,
               e.name AS event_name, e.category, e.measurement_unit, e.sort_order
        FROM meet_events me
        JOIN tf_events e ON me.tf_event_id = e.id
        WHERE me.meet_id = ?
          AND EXISTS (
            SELECT 1 FROM entries en
            JOIN results r ON r.entry_id = en.id
            WHERE en.meet_event_id = me.id
              AND r.place IS NOT NULL AND r.place > 0
          )
        ORDER BY e.sort_order, me.gender
      `).all(meet.id)

      for (const ev of meet.events) {
        ev.results = db.prepare(`
          SELECT r.place, r.mark, r.wind, r.is_pr,
                 a.first_name, a.last_name, a.team
          FROM entries en
          JOIN results r ON r.entry_id = en.id
          LEFT JOIN athletes a ON en.athlete_id = a.id
          WHERE en.meet_event_id = ?
            AND r.place IS NOT NULL AND r.place > 0
            AND en.scratched = 0
            AND COALESCE(r.did_not_start, 0) = 0
            AND COALESCE(r.did_not_finish, 0) = 0
            AND COALESCE(r.disqualified, 0) = 0
          ORDER BY r.place ASC
          LIMIT 20
        `).all(ev.id)
      }
    }

    return meets
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

// ─── TCL full-meet parser helpers ──────────────────────────────────
function _parseE2(line) {
  // E2F  102.00E A          0.00  0.00        2  7  5   10                ... 80  ← trailing checksum
  // E2F   16.50M A-0.0     16.51 63.58        4  2  4    5                ... 51
  // E2F    0.00MQA-0.0      0.00  0.00        2  2  0    0                ... 11  ← DNS/no-mark
  // Data ends by column ~55; trailing two-digit checksum must be excluded.
  if (line.length < 14) return { mark: null, wind: null, place: null }
  const rawMark = parseFloat(line.slice(3, 11)) || 0
  const unit    = line[11] || 'M'   // 'E'=English inches, 'M'=Metric seconds
  const qual    = line[12] || ' '   // ' '=valid, 'Q'=no mark, 'N'=no attempt

  const dataRegion = line.slice(0, 60)              // exclude trailing checksum
  const allNums = [...dataRegion.matchAll(/\d+/g)]
  const lastNum = allNums.length ? parseInt(allNums[allNums.length - 1][0]) : null
  const place   = lastNum || null

  if (!rawMark || qual !== ' ') {
    return { mark: null, wind: null, place: null, isDNS: qual === 'Q' }
  }

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
  // E6  7 Girls 9-10 Long Jump                                            34 ← trailing checksum
  // E6 78 Girls 9-10 100 Meter Dash                                       05
  // Stop capture at the first run of 3+ spaces so the checksum is excluded.
  const m = line.match(/^E6\s*(\d+)\s+(Boys|Girls)\s+([\d-]+)\s+(.+?)(?:\s{3,}|$)/)
  if (!m) return null
  const [, numStr, genderStr, ageGroup, rawName] = m
  let name = rawName.trim()
  if (/^Other\s+SOFTBALL$/i.test(name)) name = 'Softball Throw'
  else if (/^Other\s+/i.test(name)) name = name.replace(/^Other\s+/i, '').trim()
  return {
    num:      parseInt(numStr),
    name,
    gender:   genderStr === 'Girls' ? 'F' : 'M',
    ageGroup,
    category: _classifyTCLEvent(name),
  }
}

function _classifyTCLEvent(name) {
  const n = name.toLowerCase()
  if (/relay/.test(n)) return 'relay'
  if (/jump|vault/.test(n)) return 'field'
  if (/throw|put|discus|javelin|hammer|softball/.test(n)) return 'field'
  if (/pentathlon|heptathlon|decathlon/.test(n)) return 'combined'
  return 'track'
}

function _normEventName(raw) {
  const n = (raw || '').toLowerCase().trim()

  // Relay: compact "4x100" / "4 x 100 meter relay" → canonical catalog name
  const relayLeg = { 100: '4 x 100 meter relay', 200: '4 x 200 meter relay',
                     400: '4 x 400 meter relay', 800: '4 x 800 meter relay' }
  const m4x = n.match(/^4\s*[x×]\s*(\d+)\s*(?:m(?:eter)?\s*)?(?:relay)?$/)
  if (m4x) { const r = relayLeg[parseInt(m4x[1])]; if (r) return r }
  // "400 meter relay" (total distance) → "4 x 100 meter relay"
  const mTot = n.match(/^(\d+)\s*(?:m(?:eter)?\s+)?relay$/)
  if (mTot) { const leg = parseInt(mTot[1]) / 4; const r = relayLeg[leg]; if (r) return r }
  if (/sprint\s*medley/.test(n)) return 'sprint medley relay'
  if (/distance\s*medley/.test(n)) return 'distance medley relay'

  // Throws — with or without "throw" suffix
  if (/^discus(\s+throw)?$/.test(n)) return 'discus'
  if (/^hammer(\s+throw)?$/.test(n)) return 'hammer'
  if (/^javelin(\s+throw)?$/.test(n)) return 'javelin'
  if (/turbo.*jav|jav.*turbo/.test(n)) return 'turbo javelin'
  if (/^shot(\s+put)?$/.test(n)) return 'shot put'
  if (/softball(\s+throw)?/.test(n)) return 'softball throw'

  // Standing Long Jump → Long Jump (youth variant, no separate catalog entry)
  if (/standing.*long.*jump|long.*jump.*standing/.test(n)) return 'long jump'

  // Mile variations
  if (/^(?:1\s+)?mile(?:\s+run)?$/.test(n)) return 'mile run'

  // Steeplechase short forms
  if (/^2000\s*m(?:eters?)?\s*(?:s(?:teeple(?:chase)?)?)?$/.test(n)) return '2000m steeplechase'
  if (/^3000\s*m(?:eters?)?\s*(?:s(?:teeple(?:chase)?)?)?$/.test(n)) return '3000m steeplechase'

  return n
}

function parseTCLAsMeet(filePath) {
  const raw   = fs.readFileSync(filePath, 'latin1')
  const lines = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')

  let meetName = 'Imported Meet', meetDate = new Date().toISOString().slice(0, 10), meetLocation = ''
  const athleteMap   = new Map()  // num → { firstName, lastName, gender, dob, team }
  const eventDescMap = new Map()  // eventNum → { name, gender, ageGroup, category }
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
      const num = line.slice(3, 8).trim()
      pendingEntry  = { athleteNum: num }
      pendingResult = null
    }

    if (type === 'E2') {
      pendingResult = _parseE2(line)
    }

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

  return { meetName, meetDate, meetLocation, eventDescMap, athleteMap, entries }
}

// ── Hy-Tek MDB helpers ────────────────────────────────────────────────

function _htekEventName(ev) {
  if (ev.Trk_Field === 'F') {
    const note = (ev.event_note || '').trim()
    if (note) return note.charAt(0).toUpperCase() + note.slice(1).toLowerCase()
    const s = ev.Event_stroke
    if (s === 'M' || s === 'L' || s === 'R') return 'Long Jump'   // M=standing LJ, L/R=running LJ
    if (s === 'T') return 'Triple Jump'   // T=Triple Jump (Hy-Tek standard code)
    if (s === 'K' || s === 'V') return 'High Jump'
    if (s === 'P') return 'Pole Vault'
    if (s === 'S') return 'Shot Put'
    if (s === 'D') return 'Discus'
    if (s === 'J') return 'Javelin'
    if (s === 'H') return 'Hammer'
    if (s === 'O') return (ev.Low_age || 0) >= 11 ? 'Discus' : 'Shot Put'
    return 'Field Event'
  }
  if (ev.Trk_Field === 'T') {
    const dist = ev.Event_dist
    const s = ev.Event_stroke
    if (s === 'E') return `${dist} Meter Hurdles`
    if (s === 'W') return `${dist} Meter Race Walk`
    if (s === 'G') return `${dist}m Steeplechase`
    if (dist >= 800 || s === 'B' || s === 'D' || s === 'C') return `${dist} Meter Run`
    return `${dist} Meter Dash`
  }
  if (ev.Ind_rel === 'R') {
    // Convert total relay distance to canonical "4 x N Meter Relay" name
    const legMap = { 400: '4 x 100 Meter Relay', 800: '4 x 200 Meter Relay',
                     1600: '4 x 400 Meter Relay', 3200: '4 x 800 Meter Relay' }
    return legMap[ev.Event_dist] || `${ev.Event_dist} Meter Relay`
  }
  return 'Unknown Event'
}

function _htekFormatTime(secs) {
  if (!secs || secs <= 0) return null
  // Truncate (not round) to match Hy-Tek display — e.g. 11.699... → 11.69
  const t = Math.trunc(secs * 100) / 100
  const mins = Math.floor(t / 60)
  const rem = t - mins * 60
  if (mins > 0) return `${mins}:${rem.toFixed(2).padStart(5, '0')}`
  return rem.toFixed(2)
}

function _htekFormatField(totalUnits, resMeas) {
  if (!totalUnits || totalUnits <= 0) return null
  if ((resMeas || 'E') === 'M') {
    // Stored in centimeters → convert to meters string
    const m = Math.trunc(totalUnits) / 100
    return m.toFixed(2)
  }
  // English: stored in inches → convert to feet-inches (e.g. "13-02.50")
  const ft = Math.floor(totalUnits / 12)
  const inches = Math.trunc((totalUnits - ft * 12) * 100) / 100
  return `${ft}-${inches.toFixed(2)}`
}

function parseHytekMDB(filePath) {
  try {
    const { default: MDBReader } = require('./mdb-reader-bundle.cjs')
    const buf = require('fs').readFileSync(filePath)
    const mdb = new MDBReader(buf)

    const meetRows  = mdb.getTable('Meet').getData()
    const eventRows = mdb.getTable('Event').getData()
    const athRows   = mdb.getTable('Athlete').getData()
    const teamRows  = mdb.getTable('Team').getData()
    const entryRows = mdb.getTable('Entry').getData()

    const meetRow = meetRows[0] || {}
    // Meet_name1 often stores the host club name, not the event name.
    // Use the filename (without extension) when the name looks like a club
    // (doesn't contain meet-specific keywords).
    const rawName1 = (meetRow.Meet_name1 || '').trim()
    const fileBaseName = require('path').basename(filePath, require('path').extname(filePath))
    const looksLikeMeetName = /\b(meet|invitational|championship|classic|memorial|cup|relay|open|dual|games|festival)\b/i.test(rawName1)
    const meetName = looksLikeMeetName ? rawName1 : (fileBaseName || rawName1 || 'Imported Meet')
    const meetDate = meetRow.Meet_start
      ? new Date(meetRow.Meet_start).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10)
    const meetLocation = (meetRow.Meet_location || '').trim()

    // Team map: Team_no → { name, abbr }
    const teamMap = new Map()
    for (const t of teamRows) {
      teamMap.set(t.Team_no, { name: (t.Team_name || '').trim(), abbr: (t.Team_abbr || '').trim() })
    }

    // Determine home team number: whichever team has the most athletes
    const teamCounts = {}
    for (const a of athRows) teamCounts[a.Team_no] = (teamCounts[a.Team_no] || 0) + 1
    let homeTeamNo = null
    let maxCount = 0
    for (const [no, cnt] of Object.entries(teamCounts)) {
      if (cnt > maxCount) { maxCount = cnt; homeTeamNo = Number(no) }
    }

    // Athlete map: Ath_no → info
    const athleteMap = new Map()
    for (const a of athRows) {
      const dob = a.Birth_date ? new Date(a.Birth_date).toISOString().slice(0, 10) : '0000-00-00'
      const team = teamMap.get(a.Team_no)
      athleteMap.set(a.Ath_no, {
        firstName: (a.First_name || '').trim(),
        lastName:  (a.Last_name  || '').trim(),
        gender:    a.Ath_Sex === 'F' ? 'F' : 'M',
        dob,
        teamNo:    a.Team_no,
        team:      team ? team.name : 'Unknown',
        compNo:    a.Comp_no || null,
      })
    }

    // Event map: Event_ptr → detail
    const events = new Map()
    for (const ev of eventRows) {
      const name = _htekEventName(ev)
      const gender = ev.Event_gender === 'F' ? 'F' : (ev.Event_gender === 'M' ? 'M' : 'mixed')
      const ageGroup = (ev.High_Age && ev.High_Age < 99) ? `${ev.Low_age}-${ev.High_Age}` : null
      const category = ev.Ind_rel === 'R' ? 'relay'
                     : ev.Trk_Field === 'T' ? 'track' : 'field'
      const measurementUnit = category === 'track' || category === 'relay' ? 'time' : 'distance'
      events.set(ev.Event_ptr, { name, gender, ageGroup, category, measurementUnit, resMeas: ev.Res_Meas || 'E' })
    }

    // Filter and build entries
    const entries = []
    for (const en of entryRows) {
      // Skip if not assigned to a heat (never competed)
      if (!en.Fin_heat && en.Fin_place === 0 && !en.Fin_Time) continue
      const evDetail = events.get(en.Event_ptr)
      if (!evDetail) continue

      const scratched = en.Scr_stat ? 1 : 0
      const isDQ  = en.Fin_stat === 'Q' || !!en.dq_type
      const isDNS = !scratched && !isDQ && (!en.Fin_Time || en.Fin_Time <= 0) && (!en.Fin_place || en.Fin_place <= 0)

      let mark = null
      if (!scratched && !isDNS && !isDQ && en.Fin_Time && en.Fin_Time > 0) {
        mark = evDetail.category === 'track' || evDetail.category === 'relay'
          ? _htekFormatTime(en.Fin_Time)
          : _htekFormatField(en.Fin_Time, evDetail.resMeas)
      }

      entries.push({
        eventPtr: en.Event_ptr,
        athNo:    en.Ath_no,
        heat:     en.Fin_heat || null,
        lane:     en.Fin_lane || null,
        place:    en.Fin_place > 0 ? en.Fin_place : null,
        mark,
        wind:     en.Fin_wind || null,
        scratched,
        isDNS,
        isDQ,
        dqReason: en.dq_type || null,
      })
    }

    return { meetName, meetDate, meetLocation, events, athleteMap, entries, homeTeamNo, teamMap }
  } catch (err) {
    return { error: err.message }
  }
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

  ipcMain.handle('import:tclMeet', async (_, filePath) => {
    try {
      let resolvedPath = filePath
      if (!resolvedPath) {
        const res = await dialog.showOpenDialog({
          title: 'Import Hy-tek TCL Results File',
          filters: [
            { name: 'Hy-tek TCL Files', extensions: ['TCL', 'tcl', 'txt'] },
            { name: 'All Files', extensions: ['*'] },
          ],
          properties: ['openFile'],
        })
        if (res.canceled || !res.filePaths.length) return null
        resolvedPath = res.filePaths[0]
      }

      const { meetName, meetDate, meetLocation, eventDescMap, athleteMap, entries } = parseTCLAsMeet(resolvedPath)
      // team breakdown in parsed data
      const teamCounts = {}
      for (const a of athleteMap.values()) teamCounts[a.team || 'Unknown'] = (teamCounts[a.team || 'Unknown'] || 0) + 1
      // first 5 athletes whose team is NOT pegasus (for diagnostic)
      const sampleNonPegasus = [...athleteMap.entries()]
        .filter(([,a]) => !/pegasus/i.test(a.team || '') && a.teamCode !== 'PTC')
        .slice(0, 5)
        .map(([num, a]) => `${num}=${a.firstName} ${a.lastName} team="${a.team}" code="${a.teamCode}"`)
      console.log('[TCL import] parsed:', {
        meetName, meetDate,
        events: eventDescMap.size,
        athletes: athleteMap.size,
        entries: entries.length,
        teamCounts,
        sampleNonPegasus,
        sampleEvents: [...eventDescMap.values()].slice(0, 5).map(e => e.name),
      })
      if (!eventDescMap.size) return { error: 'No events found in the TCL file.' }
      if (!entries.length) return { error: 'No entries found in the TCL file.' }

      const tfEventRows = db.prepare('SELECT id, name, category FROM tf_events').all()
      console.log('[TCL import] tf_events in DB:', tfEventRows.length, tfEventRows.slice(0,5).map(e=>e.name))
      const tfByNorm    = new Map()
      for (const e of tfEventRows) {
        tfByNorm.set(e.name.toLowerCase(), e)
        tfByNorm.set(_normEventName(e.name.toLowerCase()), e)
      }

      // Determine canonical home-team name from existing roster
      const homeTeamRow = db.prepare(
        `SELECT team, COUNT(*) cnt FROM athletes WHERE active=1 AND team!='' GROUP BY team ORDER BY cnt DESC LIMIT 1`
      ).get()
      const homeTeamName = homeTeamRow?.team || 'Pegasus Track'
      console.log('[TCL import] home team name:', homeTeamName)

      const importFn = db.transaction(() => {
        // ── Meet ──────────────────────────────────────────────────
        const meetRow = db.prepare(
          `INSERT INTO meets (name, date, type, status, location) VALUES (?,?,?,?,?)`
        ).run(meetName, meetDate, 'invitational', 'completed', meetLocation || '')
        const meetId = meetRow.lastInsertRowid

        // ── Meet events ───────────────────────────────────────────
        const meetEventMap = new Map()  // tcl eventNum → { meid, tfEvent }
        const comboToMeid  = new Map()  // "tfId_gender_ag" → meid
        const skippedEvents = []
        const stmtME = db.prepare(
          `INSERT INTO meet_events (meet_id, tf_event_id, gender, age_group, round, sort_order) VALUES (?,?,?,?,?,?)`
        )
        for (const [evNum, evDesc] of eventDescMap) {
          const tfEvent = tfByNorm.get(evDesc.name.toLowerCase())
                       ?? tfByNorm.get(_normEventName(evDesc.name.toLowerCase()))
          if (!tfEvent) { skippedEvents.push(evDesc.name); continue }
          const ck = `${tfEvent.id}_${evDesc.gender}_${evDesc.ageGroup}`
          if (!comboToMeid.has(ck)) {
            const r = stmtME.run(meetId, tfEvent.id, evDesc.gender, evDesc.ageGroup, 'final', evNum)
            comboToMeid.set(ck, r.lastInsertRowid)
          }
          meetEventMap.set(evNum, { meid: comboToMeid.get(ck), tfEvent })
        }
        console.log('[TCL import] meet events matched:', comboToMeid.size, '| skipped:', skippedEvents)
        console.log('[TCL import] meetEventMap size:', meetEventMap.size, '| entries to process:', entries.length)

        // ── Athletes (match or insert) ─────────────────────────────
        const findByNum = db.prepare('SELECT id, active FROM athletes WHERE athlete_number=? LIMIT 1')
        // Look up by name only (no DOB) so DOB format mismatches don't cause duplicate inserts.
        // Returns the EARLIEST inserted row (lowest id) which is most likely the original correct record.
        const findByName = db.prepare(
          `SELECT id, active, team FROM athletes
           WHERE lower(first_name)=lower(?) AND lower(last_name)=lower(?)
           ORDER BY id LIMIT 1`
        )
        const fixAndActivate = db.prepare(
          "UPDATE athletes SET active=1, team=?, updated_at=datetime('now') WHERE id=?"
        )
        const insertAth = db.prepare(
          `INSERT INTO athletes (first_name,last_name,date_of_birth,gender,athlete_number,team,active)
           VALUES (@fn,@ln,@dob,@g,@num,@team,1)`
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
          if (isHomeTeam && num) row = findByNum.get(num)   // bib lookup only for home team
          if (!row) row = findByName.get(info.firstName, info.lastName)

          if (row) {
            // Always fix the team and ensure active — handles previously-misnamed athletes
            fixAndActivate.run(teamName, row.id)
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
            console.error('[TCL INSERT athlete FAILED]', { num, info, teamName, error: e.message })
            insertErrors.push(`${info.firstName} ${info.lastName}: ${e.message}`)
            return null
          }
        }

        // ── Entries and results ───────────────────────────────────
        const stmtEntry  = db.prepare('INSERT INTO entries (meet_event_id, athlete_id, seed_mark) VALUES (?,?,NULL)')
        const checkDupe  = db.prepare('SELECT id FROM entries WHERE meet_event_id=? AND athlete_id=?')
        const stmtRes    = db.prepare(
          `INSERT INTO results (entry_id,mark,wind,place,disqualified,dq_reason,did_not_start,did_not_finish,hand_timed,attempts_json,is_pr)
           VALUES (?,?,?,?,0,NULL,?,0,0,NULL,0)`
        )
        const stmtGetPR  = db.prepare('SELECT mark FROM personal_records WHERE athlete_id=? AND tf_event_id=? AND indoor=0')
        const stmtSetPR  = db.prepare('UPDATE results SET is_pr=1 WHERE entry_id=?')
        const stmtUpsert = db.prepare(
          `INSERT INTO personal_records (athlete_id,tf_event_id,mark,indoor,updated_at) VALUES (?,?,?,0,datetime('now'))
           ON CONFLICT(athlete_id,tf_event_id,indoor) DO UPDATE SET mark=excluded.mark,updated_at=datetime('now')`
        )

        // If no entry in the file has a mark, this is a pre-meet entries file.
        // Don't infer DNS from absent marks in that case — athletes just haven't raced yet.
        const isResultsFile = entries.some(e => e.mark)

        let entriesAdded = 0, resultsAdded = 0, skippedNoEvent = 0, skippedNoAthlete = 0, skippedDupe = 0
        for (const en of entries) {
          const ev = meetEventMap.get(en.eventNum)
          if (!ev) { skippedNoEvent++; continue }
          const athleteId = resolveAthlete(en.athleteNum)
          if (!athleteId) { skippedNoAthlete++; continue }
          if (checkDupe.get(ev.meid, athleteId)) { skippedDupe++; continue }

          const entryId = stmtEntry.run(ev.meid, athleteId).lastInsertRowid
          entriesAdded++

          // Only insert a result row when there is actual result data to record.
          // For entries-only imports, skip creating result rows so athletes remain editable.
          const isDNS = isResultsFile && en.isDNS
          if (en.mark || isDNS || en.isDQ || en.place) {
            stmtRes.run(entryId, en.mark || null, en.wind || null, en.place || null, isDNS ? 1 : 0)
            resultsAdded++
          }

          if (en.mark && !isDNS) {
            const newVal = parseMark(en.mark, ev.tfEvent.category)
            if (newVal !== null) {
              const existing = stmtGetPR.get(athleteId, ev.tfEvent.id)
              const prVal    = existing ? parseMark(existing.mark, ev.tfEvent.category) : null
              const isField  = ev.tfEvent.category === 'field' || ev.tfEvent.category === 'combined'
              if (prVal === null || (isField ? newVal > prVal : newVal < prVal)) {
                stmtSetPR.run(entryId)
                stmtUpsert.run(athleteId, ev.tfEvent.id, en.mark)
              }
            }
          }
        }

        console.log('[TCL import] DONE — entriesAdded:', entriesAdded, 'resultsAdded:', resultsAdded,
          '| skipped noEvent:', skippedNoEvent, 'noAthlete:', skippedNoAthlete, 'dupe:', skippedDupe,
          '| athletes found:', athFound, 'inserted:', athInserted, 'notInMap:', athNotInMap)
        return { meetId, eventsAdded: comboToMeid.size, entriesAdded, resultsAdded, skippedEvents,
                 skippedNoEvent, skippedNoAthlete, skippedDupe, athFound, athInserted, athNotInMap, teamCounts, insertErrors, sampleNonPegasus }
      })

      const result = importFn()
      // post-transaction: see what non-Pegasus teams are actually in DB
      const visitingInDB = db.prepare(
        `SELECT team, COUNT(*) cnt FROM athletes WHERE active=1 AND lower(team) NOT LIKE '%pegasus%' GROUP BY team`
      ).all()
      console.log('[TCL import] transaction result:', result)
      console.log('[TCL import] non-Pegasus in DB after import:', visitingInDB)
      return { ...result, visitingInDB }
    } catch (err) {
      console.error('TCL meet import error:', err)
      return { error: err.message }
    }
  })

  ipcMain.handle('import:hytek', async (_, filePath) => {
    try {
      let resolvedPath = filePath
      if (!resolvedPath) {
        const res = await dialog.showOpenDialog({
          title: 'Import Hy-Tek Meet Database',
          filters: [
            { name: 'Hy-Tek Meet Database', extensions: ['mdb', 'MDB'] },
            { name: 'All Files', extensions: ['*'] },
          ],
          properties: ['openFile'],
        })
        if (res.canceled || !res.filePaths.length) return null
        resolvedPath = res.filePaths[0]
      }

      const parsed = parseHytekMDB(resolvedPath)
      if (parsed.error) return { error: parsed.error }

      const { meetName, meetDate, meetLocation, events, athleteMap, entries, homeTeamNo, teamMap } = parsed

      // Determine home team name from existing Pegasus DB
      const homeTeamRow = db.prepare(
        `SELECT team, COUNT(*) cnt FROM athletes WHERE active=1 AND team!='' GROUP BY team ORDER BY cnt DESC LIMIT 1`
      ).get()
      const homeTeamName = homeTeamRow?.team || 'Pegasus Track'
      console.log('[Hy-Tek import] home team:', homeTeamName, '| MDB home team no:', homeTeamNo, teamMap.get(homeTeamNo)?.name)

      // tf_events cache — find or create
      const tfEventRows = db.prepare('SELECT id, name, category, measurement_unit FROM tf_events').all()
      const tfByName = new Map(tfEventRows.map(e => [e.name.toLowerCase(), e]))

      // Build a normalized lookup map so _normEventName variants also find catalog entries
      const tfByNormMDB = new Map()
      for (const e of tfEventRows) {
        tfByNormMDB.set(e.name.toLowerCase(), e)
        tfByNormMDB.set(_normEventName(e.name.toLowerCase()), e)
      }

      const importFn = db.transaction(() => {
        function getOrCreateTfEvent(name, category, measurementUnit) {
          const key = name.toLowerCase()
          // 1. exact match, 2. normalized match — avoids creating custom events for known variants
          const found = tfByNormMDB.get(key) ?? tfByNormMDB.get(_normEventName(key))
          if (found) return found
          const abbr = name.replace(/\s+/g, '').slice(0, 8)
          const r = db.prepare(
            `INSERT INTO tf_events (name, abbreviation, category, measurement_unit, is_custom, sort_order)
             VALUES (?, ?, ?, ?, 1, 999)`
          ).run(name, abbr, category, measurementUnit)
          const newEvt = { id: r.lastInsertRowid, name, category, measurement_unit: measurementUnit }
          tfByNormMDB.set(key, newEvt)
          return newEvt
        }

        // ── Meet ──────────────────────────────────────────────────
        const meetRow = db.prepare(
          `INSERT INTO meets (name, date, type, status, location) VALUES (?,?,?,?,?)`
        ).run(meetName, meetDate, 'invitational', 'completed', meetLocation)
        const meetId = meetRow.lastInsertRowid

        // ── Meet events ───────────────────────────────────────────
        const meetEventMap = new Map()   // Event_ptr → { meid, tfEvent }
        const comboToMeid  = new Map()   // "tfId_gender_ag" → meid
        const stmtME = db.prepare(
          `INSERT INTO meet_events (meet_id, tf_event_id, gender, age_group, round, sort_order) VALUES (?,?,?,?,?,?)`
        )
        for (const [evPtr, evDetail] of events) {
          const tfEvent = getOrCreateTfEvent(evDetail.name, evDetail.category, evDetail.measurementUnit)
          const ck = `${tfEvent.id}_${evDetail.gender}_${evDetail.ageGroup || ''}`
          if (!comboToMeid.has(ck)) {
            const r = stmtME.run(meetId, tfEvent.id, evDetail.gender, evDetail.ageGroup || null, 'final', evPtr)
            comboToMeid.set(ck, r.lastInsertRowid)
          }
          meetEventMap.set(evPtr, { meid: comboToMeid.get(ck), tfEvent })
        }

        // ── Athletes (match or create) ─────────────────────────────
        const findByNameDob = db.prepare(
          `SELECT id, team, active FROM athletes
           WHERE lower(first_name)=lower(?) AND lower(last_name)=lower(?) AND date_of_birth=?
           ORDER BY id LIMIT 1`
        )
        const findByName = db.prepare(
          `SELECT id, active, team FROM athletes
           WHERE lower(first_name)=lower(?) AND lower(last_name)=lower(?)
           ORDER BY id LIMIT 1`
        )
        const fixAndActivate = db.prepare(
          "UPDATE athletes SET active=1, team=?, updated_at=datetime('now') WHERE id=?"
        )
        const fixVisitorTeam = db.prepare(
          "UPDATE athletes SET team=?, active=1, updated_at=datetime('now') WHERE id=?"
        )
        const insertAth = db.prepare(
          `INSERT INTO athletes (first_name, last_name, date_of_birth, gender, team, active)
           VALUES (@fn, @ln, @dob, @g, @team, 1)`
        )
        const athIdCache = new Map()
        let athFound = 0, athCreated = 0

        function resolveAthlete(athNo) {
          if (athIdCache.has(athNo)) return athIdCache.get(athNo)
          const info = athleteMap.get(athNo)
          if (!info) return null

          const isHome   = info.teamNo === homeTeamNo
          const teamName = isHome ? homeTeamName : info.team

          // Try exact name+DOB match first (preferred), then name-only
          let row = info.dob && info.dob !== '0000-00-00'
            ? findByNameDob.get(info.firstName, info.lastName, info.dob)
            : null
          if (!row) row = findByName.get(info.firstName, info.lastName)

          if (row) {
            if (isHome) {
              // Home athlete — ensure active + correct team name
              fixAndActivate.run(teamName, row.id)
              athFound++
              athIdCache.set(athNo, row.id)
              return row.id
            }

            // Visiting athlete: only reuse this record if it belongs to the same team.
            // A home-team (Pegasus) athlete with the same name is a different person —
            // don't steal that record.
            const rowTeam = (row.team || '').toLowerCase()
            if (rowTeam === teamName.toLowerCase()) {
              // Same team — ensure active=1 so they appear in the Teams tab
              if (!row.active) fixVisitorTeam.run(teamName, row.id)
              athFound++
              athIdCache.set(athNo, row.id)
              return row.id
            }

            // Team mismatch on an inactive record (stale from a previous buggy import) —
            // correct the team and activate so the athlete appears in the Teams tab.
            if (row.active === 0) {
              fixVisitorTeam.run(teamName, row.id)
              athFound++
              athIdCache.set(athNo, row.id)
              return row.id
            }

            // Active record with a different team (a home athlete with the same name) —
            // fall through to create a new visitor record.
          }

          try {
            const ins = insertAth.run({ fn: info.firstName, ln: info.lastName, dob: info.dob, g: info.gender, team: teamName })
            athCreated++
            athIdCache.set(athNo, ins.lastInsertRowid)
            return ins.lastInsertRowid
          } catch (e) {
            console.error('[Hy-Tek] insert athlete failed', info, e.message)
            return null
          }
        }

        // ── Entries and results ───────────────────────────────────
        const stmtEntry = db.prepare(
          `INSERT INTO entries (meet_event_id, athlete_id, heat, lane, scratched) VALUES (?,?,?,?,?)`
        )
        const checkDupe = db.prepare('SELECT id FROM entries WHERE meet_event_id=? AND athlete_id=?')
        const stmtRes   = db.prepare(
          `INSERT INTO results (entry_id, mark, wind, place, disqualified, dq_reason, did_not_start, did_not_finish, hand_timed, is_pr)
           VALUES (?,?,?,?,?,?,?,0,0,0)`
        )
        const stmtGetPR  = db.prepare('SELECT mark FROM personal_records WHERE athlete_id=? AND tf_event_id=? AND indoor=0')
        const stmtSetPR  = db.prepare('UPDATE results SET is_pr=1 WHERE id=?')
        const stmtUpsert = db.prepare(
          `INSERT INTO personal_records (athlete_id, tf_event_id, mark, indoor, updated_at) VALUES (?,?,?,0,datetime('now'))
           ON CONFLICT(athlete_id,tf_event_id,indoor) DO UPDATE SET mark=excluded.mark, updated_at=datetime('now')`
        )

        let entriesAdded = 0, resultsAdded = 0
        let skippedNoEvent = 0, skippedNoAthlete = 0, skippedDupe = 0

        for (const en of entries) {
          const ev = meetEventMap.get(en.eventPtr)
          if (!ev) { skippedNoEvent++; continue }

          const athleteId = resolveAthlete(en.athNo)
          if (!athleteId) { skippedNoAthlete++; continue }

          if (checkDupe.get(ev.meid, athleteId)) { skippedDupe++; continue }

          const entryId = stmtEntry.run(ev.meid, athleteId, en.heat, en.lane, en.scratched).lastInsertRowid
          entriesAdded++

          const resultId = stmtRes.run(
            entryId, en.mark, en.wind, en.place,
            en.isDQ ? 1 : 0, en.dqReason,
            en.isDNS ? 1 : 0
          ).lastInsertRowid
          resultsAdded++

          if (en.mark && !en.isDNS && !en.isDQ && en.place) {
            try {
              const newVal = parseMark(en.mark, ev.tfEvent.category)
              if (newVal !== null) {
                const existing = stmtGetPR.get(athleteId, ev.tfEvent.id)
                const prVal    = existing ? parseMark(existing.mark, ev.tfEvent.category) : null
                const isField  = ev.tfEvent.category === 'field'
                if (prVal === null || (isField ? newVal > prVal : newVal < prVal)) {
                  stmtSetPR.run(resultId)
                  stmtUpsert.run(athleteId, ev.tfEvent.id, en.mark)
                }
              }
            } catch (_) {}
          }
        }

        console.log('[Hy-Tek import] DONE', { eventsAdded: comboToMeid.size, entriesAdded, resultsAdded, athFound, athCreated })
        return {
          meetId, meetName, eventsAdded: comboToMeid.size,
          entriesAdded, resultsAdded,
          skippedNoEvent, skippedNoAthlete, skippedDupe,
          athFound, athCreated,
        }
      })

      return importFn()
    } catch (err) {
      console.error('[Hy-Tek import] error:', err)
      return { error: err.message }
    }
  })

  // ── FinishLynx .lif results import ──
  ipcMain.handle('import:finishlynx', async (_, meetId) => {
    const { filePath, canceled } = await dialog.showOpenDialog({
      title: 'Import FinishLynx Results',
      filters: [
        { name: 'FinishLynx LIF', extensions: ['lif', 'txt', 'LIF'] },
        { name: 'All Files', extensions: ['*'] },
      ],
      properties: ['openFile'],
    })
    if (canceled || !filePath) return { canceled: true }

    let content
    try { content = fs.readFileSync(filePath, 'latin1') }
    catch (e) { return { error: `Cannot read file: ${e.message}` } }

    const parsed = parseLif(content)
    if (parsed.length === 0) return { error: 'No valid data rows found. Make sure this is a FinishLynx LIF export.' }

    const meetEntries = db.prepare(`
      SELECT e.id AS entry_id, e.heat, e.lane,
        a.first_name, a.last_name
      FROM entries e
      JOIN athletes a   ON e.athlete_id    = a.id
      JOIN meet_events me ON e.meet_event_id = me.id
      WHERE me.meet_id = ? AND e.scratched = 0
    `).all(meetId)

    const matched   = []
    const unmatched = []

    for (const row of parsed) {
      if (!row.lastName && !row.firstName) continue

      const lLast  = row.lastName.toLowerCase()
      const lFirst = row.firstName.toLowerCase()

      const nameMatches = meetEntries.filter(e =>
        e.last_name.toLowerCase()  === lLast &&
        e.first_name.toLowerCase() === lFirst
      )

      let entry = null
      if (nameMatches.length === 1) {
        entry = nameMatches[0]
      } else if (nameMatches.length > 1) {
        // Narrow by heat+lane when name appears multiple times
        entry = nameMatches.find(e => e.heat === row.heatNum && e.lane === row.lane)
              ?? nameMatches[0]
      }

      if (entry) {
        matched.push({
          entry_id:  entry.entry_id,
          last_name: entry.last_name,
          first_name: entry.first_name,
          place: row.place,
          mark:  row.mark,
          wind:  row.wind,
          dns:   row.dns,
          dnf:   row.dnf,
          dq:    row.dq,
        })
      } else {
        unmatched.push({
          lastName:  row.lastName,
          firstName: row.firstName,
          mark: row.mark || (row.dns ? 'DNS' : row.dnf ? 'DNF' : row.dq ? 'DQ' : null),
        })
      }
    }

    return { matched, unmatched, total: parsed.length }
  })

  ipcMain.handle('import:finishlynx:apply', (_, rows) => {
    if (!rows?.length) return { success: true, updated: 0, inserted: 0, count: 0 }

    const entryIds  = rows.map(r => r.entry_id)
    const existing  = db.prepare(
      `SELECT id, entry_id FROM results WHERE entry_id IN (${entryIds.map(() => '?').join(',')})`
    ).all(...entryIds)
    const byEntry = Object.fromEntries(existing.map(r => [r.entry_id, r.id]))

    const upd = db.prepare(`
      UPDATE results
      SET place=@place, mark=@mark, wind=@wind,
          did_not_start=@dns, did_not_finish=@dnf, disqualified=@dq
      WHERE id=@id
    `)
    const ins = db.prepare(`
      INSERT INTO results (entry_id, place, mark, wind, did_not_start, did_not_finish, disqualified)
      VALUES (@entry_id, @place, @mark, @wind, @dns, @dnf, @dq)
    `)

    let updated = 0, inserted = 0
    db.transaction(() => {
      for (const r of rows) {
        const p = {
          place: r.place ?? null, mark: r.mark ?? null, wind: r.wind ?? null,
          dns: r.dns ?? 0, dnf: r.dnf ?? 0, dq: r.dq ?? 0,
        }
        const existId = byEntry[r.entry_id]
        if (existId) { upd.run({ ...p, id: existId }); updated++ }
        else         { ins.run({ ...p, entry_id: r.entry_id }); inserted++ }
      }
    })()

    return { success: true, updated, inserted, count: rows.length }
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
  ipcMain.handle('print:sheet', async (_, { html, css, landscape }) => {
    const os = require('os')
    const { readSettings } = require('./settings')
    const sheetPrinter = readSettings().sheetPrinter || ''

    const pageW = landscape ? '11in' : '8.5in'
    const pageH = landscape ? '8.5in' : '11in'
    const winW  = landscape ? 1056 : 816
    const winH  = landscape ? 816  : 1100

    const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
${css}
@page { size: ${pageW} ${pageH}; margin: 0; }
body  { margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; }
* { visibility: visible !important; }
.print-sheet { box-shadow: none !important; border-radius: 0 !important; }
</style></head><body>${html}</body></html>`

    const tmpHtml = path.join(os.tmpdir(), `pegasus-sheet-${Date.now()}.html`)
    fs.writeFileSync(tmpHtml, fullHtml, 'utf8')

    const printWin = new BrowserWindow({
      show: false,
      width: winW,
      height: winH,
      webPreferences: { nodeIntegration: false, contextIsolation: true },
    })

    try {
      await printWin.loadURL(`file:///${tmpHtml.replace(/\\/g, '/')}`)
      // Allow CSS layout to settle after DOM load
      await new Promise(r => setTimeout(r, 400))

      // Use webContents.print() directly — much faster than printToPDF + PowerShell PrintTo verb
      // (the PrintTo verb launches a PDF viewer app, causing multi-second delays)
      const printOpts = {
        silent: !!sheetPrinter,
        printBackground: true,
        pageSize: landscape ? { width: 279400, height: 215900 } : 'Letter',
      }
      if (sheetPrinter) printOpts.deviceName = sheetPrinter
      if (!sheetPrinter) { printWin.show(); printWin.focus() }

      return new Promise(resolve => {
        printWin.webContents.print(printOpts, (success, reason) => {
          if (!printWin.isDestroyed()) printWin.close()
          try { fs.unlinkSync(tmpHtml) } catch {}
          resolve({ success, reason: reason ?? null })
        })
      })
    } catch (e) {
      if (!printWin.isDestroyed()) printWin.close()
      try { fs.unlinkSync(tmpHtml) } catch {}
      return { success: false, reason: e.message }
    }
  })

  ipcMain.handle('print:savePDF', async (event, { html, css, filename }) => {
    const os = require('os')
    const win = BrowserWindow.getFocusedWindow()

    const { filePath, canceled } = await dialog.showSaveDialog(win, {
      title: 'Save PDF',
      defaultPath: path.join(app.getPath('documents'), filename || 'pegasus-sheet.pdf'),
      filters: [{ name: 'PDF Document', extensions: ['pdf'] }],
    })
    if (canceled || !filePath) return { success: false, canceled: true }

    const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
${css}
@page { size: 8.5in 11in; margin: 0; }
body  { margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; }
* { visibility: visible !important; }
</style></head><body>${html}</body></html>`

    const tmpHtml = path.join(os.tmpdir(), `pegasus-save-${Date.now()}.html`)
    fs.writeFileSync(tmpHtml, fullHtml, 'utf8')

    const printWin = new BrowserWindow({
      show: false, width: 816, height: 30000,
      webPreferences: { nodeIntegration: false, contextIsolation: true },
    })
    await printWin.loadURL(`file:///${tmpHtml.replace(/\\/g, '/')}`)
    await new Promise(r => setTimeout(r, 200))

    try {
      const pdfData = await printWin.webContents.printToPDF({
        printBackground: true,
        preferCSSPageSize: true,
      })
      printWin.close()
      try { fs.unlinkSync(tmpHtml) } catch {}
      fs.writeFileSync(filePath, pdfData)
      await shell.openPath(filePath)
      return { success: true, filePath }
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

  ipcMain.handle('teams:merge', (_, { fromTeam, toTeam }) => {
    const to = toTeam.trim()
    const result = db.prepare(
      "UPDATE athletes SET team=?, updated_at=datetime('now') WHERE team=? AND active=1"
    ).run(to, fromTeam)
    db.prepare('DELETE FROM team_profiles WHERE name=?').run(fromTeam)
    return { success: true, count: result.changes }
  })

  ipcMain.handle('teams:delete', (_, { teamName, reassignTo }) => {
    const target = (reassignTo || 'Pegasus Track').trim()
    const result = db.prepare(
      "UPDATE athletes SET team=?, updated_at=datetime('now') WHERE team=? AND active=1"
    ).run(target, teamName)
    db.prepare('DELETE FROM team_profiles WHERE name=?').run(teamName)
    return { success: true, count: result.changes }
  })
}

function registerRunathonHandlers() {
  const JOIN_SQL = `
    SELECT re.*, a.first_name, a.last_name, a.gender, a.team,
      CAST((julianday('now') - julianday(a.date_of_birth)) / 365.25 AS INTEGER) AS age
    FROM runathon_entries re
    LEFT JOIN athletes a ON re.athlete_id = a.id
  `

  ipcMain.handle('runathon:getEntries', (_, meetId) =>
    db.prepare(`${JOIN_SQL} WHERE re.meet_id = ?
      ORDER BY COALESCE(a.last_name || ' ' || a.first_name, re.guest_name) ASC`).all(meetId)
  )

  ipcMain.handle('runathon:upsertEntry', (_, data) => {
    const { id, meet_id, athlete_id, guest_name, guest_team, laps, best_distance, pledge_per_lap, flat_pledges, notes } = data
    const byId = db.prepare(`${JOIN_SQL} WHERE re.id = ?`)

    if (id) {
      db.prepare(`
        UPDATE runathon_entries
        SET laps=@laps, best_distance=@best_distance,
            pledge_per_lap=@pledge_per_lap, flat_pledges=@flat_pledges, notes=@notes
        WHERE id=@id
      `).run({
        id,
        laps: laps ?? null, best_distance: best_distance || null,
        pledge_per_lap: pledge_per_lap ?? null, flat_pledges: flat_pledges ?? null,
        notes: notes || null,
      })
      return byId.get(id)
    }

    const r = db.prepare(`
      INSERT INTO runathon_entries (meet_id, athlete_id, guest_name, guest_team, laps, best_distance, pledge_per_lap, flat_pledges, notes)
      VALUES (@meet_id, @athlete_id, @guest_name, @guest_team, @laps, @best_distance, @pledge_per_lap, @flat_pledges, @notes)
    `).run({
      meet_id, athlete_id: athlete_id || null,
      guest_name: guest_name || null, guest_team: guest_team || null,
      laps: laps ?? null, best_distance: best_distance || null,
      pledge_per_lap: pledge_per_lap ?? null, flat_pledges: flat_pledges ?? null,
      notes: notes || null,
    })
    return byId.get(r.lastInsertRowid)
  })

  ipcMain.handle('runathon:removeEntry', (_, id) => {
    db.prepare('DELETE FROM runathon_entries WHERE id=?').run(id)
    return { success: true }
  })

  ipcMain.handle('runathon:bulkAddRoster', (_, { meetId, athleteIds }) => {
    const stmt = db.prepare('INSERT OR IGNORE INTO runathon_entries (meet_id, athlete_id) VALUES (?, ?)')
    db.transaction((ids) => { for (const aid of ids) stmt.run(meetId, aid) })(athleteIds)
    return db.prepare(`${JOIN_SQL} WHERE re.meet_id = ?
      ORDER BY COALESCE(a.last_name || ' ' || a.first_name, re.guest_name) ASC`).all(meetId)
  })
}

// ═══════════════════════════════════════════════
// IPC — RELAY LEGS
// ═══════════════════════════════════════════════

function registerRelayHandlers() {
  ipcMain.handle('relay:getLegs', (_, entryId) =>
    db.prepare(`
      SELECT rl.leg, rl.athlete_id,
        a.first_name, a.last_name, a.team, a.gender AS athlete_gender
      FROM relay_legs rl
      LEFT JOIN athletes a ON rl.athlete_id = a.id
      WHERE rl.entry_id = ?
      ORDER BY rl.leg
    `).all(entryId)
  )

  ipcMain.handle('relay:saveLeg', (_, { entryId, leg, athleteId }) => {
    if (athleteId) {
      db.prepare(`
        INSERT INTO relay_legs (entry_id, leg, athlete_id)
        VALUES (?, ?, ?)
        ON CONFLICT(entry_id, leg) DO UPDATE SET athlete_id = excluded.athlete_id
      `).run(entryId, leg, athleteId)
    } else {
      db.prepare('DELETE FROM relay_legs WHERE entry_id = ? AND leg = ?').run(entryId, leg)
    }
    return { success: true }
  })

  ipcMain.handle('relay:getLegsForMeet', (_, meetId) => {
    const rows = db.prepare(`
      SELECT rl.entry_id, rl.leg, rl.athlete_id,
        a.first_name, a.last_name, a.team, a.gender AS athlete_gender
      FROM relay_legs rl
      JOIN athletes a ON rl.athlete_id = a.id
      JOIN entries e ON rl.entry_id = e.id
      JOIN meet_events me ON e.meet_event_id = me.id
      WHERE me.meet_id = ?
      ORDER BY rl.entry_id, rl.leg
    `).all(meetId)
    const byEntry = {}
    for (const row of rows) {
      if (!byEntry[row.entry_id]) byEntry[row.entry_id] = []
      byEntry[row.entry_id].push(row)
    }
    return byEntry
  })
}

// ═══════════════════════════════════════════════
// IPC — SEASON SCORING
// ═══════════════════════════════════════════════

function registerScoresHandlers() {
  ipcMain.handle('scores:getSeasons', () =>
    db.prepare('SELECT * FROM seasons ORDER BY year DESC, id DESC').all()
  )

  ipcMain.handle('scores:getSeasonal', (_, seasonId) => {
    const season = db.prepare('SELECT * FROM seasons WHERE id = ?').get(seasonId)
    if (!season) return null

    const meets = db.prepare(
      "SELECT id, name, date FROM meets WHERE season_id = ? AND status != 'cancelled' ORDER BY date"
    ).all(seasonId)

    const rows = db.prepare(`
      SELECT
        a.team,
        m.id   AS meet_id,
        te.category,
        r.place
      FROM results r
      JOIN entries     e  ON r.entry_id      = e.id
      JOIN meet_events me ON e.meet_event_id = me.id
      JOIN meets       m  ON me.meet_id      = m.id
      JOIN tf_events   te ON me.tf_event_id  = te.id
      JOIN athletes    a  ON e.athlete_id    = a.id
      WHERE m.season_id      = ?
        AND r.place          IS NOT NULL
        AND r.disqualified   = 0
        AND r.did_not_start  = 0
        AND r.did_not_finish = 0
        AND e.scratched      = 0
        AND a.team IS NOT NULL
        AND a.team != ''
    `).all(seasonId)

    const SCORES = { 1: 8, 2: 6, 3: 5, 4: 4, 5: 3, 6: 2, 7: 1 }
    const teams = {}

    for (const row of rows) {
      const pts = SCORES[row.place]
      if (!pts) continue
      if (!teams[row.team]) teams[row.team] = {
        name: row.team, total: 0,
        byMeet: {},
        byCategory: { track: 0, relay: 0, field: 0, combined: 0 },
      }
      const t = teams[row.team]
      t.total += pts
      t.byMeet[row.meet_id] = (t.byMeet[row.meet_id] || 0) + pts
      t.byCategory[row.category] = (t.byCategory[row.category] || 0) + pts
    }

    return {
      season,
      meets,
      teams: Object.values(teams).sort((a, b) => b.total - a.total),
    }
  })
}

// ═══════════════════════════════════════════════
// IPC — RECORDS
// ═══════════════════════════════════════════════

function registerRecordsHandlers() {
  ipcMain.handle('records:getAll', (_, scope) => {
    if (scope) {
      return db.prepare(
        'SELECT * FROM records WHERE scope = ? ORDER BY event_category, event_name, gender, age_group'
      ).all(scope)
    }
    return db.prepare(
      'SELECT * FROM records ORDER BY scope, event_category, event_name, gender, age_group'
    ).all()
  })

  ipcMain.handle('records:save', (_, data) => {
    if (data.id) {
      db.prepare(`
        UPDATE records SET
          scope=@scope, event_name=@event_name, event_category=@event_category,
          gender=@gender, age_group=@age_group, mark=@mark, mark_value=@mark_value,
          wind=@wind, athlete_name=@athlete_name, athlete_id=@athlete_id,
          team=@team, meet_name=@meet_name, meet_id=@meet_id,
          meet_date=@meet_date, notes=@notes, is_auto=0,
          updated_at=datetime('now')
        WHERE id=@id
      `).run({ ...data, mark_value: data.mark_value ?? null, athlete_id: data.athlete_id ?? null, meet_id: data.meet_id ?? null })
      return { success: true }
    }
    const r = db.prepare(`
      INSERT INTO records
        (scope, event_name, event_category, gender, age_group, mark, mark_value,
         wind, athlete_name, athlete_id, team, meet_name, meet_id, meet_date, notes, is_auto)
      VALUES
        (@scope, @event_name, @event_category, @gender, @age_group, @mark, @mark_value,
         @wind, @athlete_name, @athlete_id, @team, @meet_name, @meet_id, @meet_date, @notes, 0)
    `).run({ ...data, mark_value: data.mark_value ?? null, athlete_id: data.athlete_id ?? null, meet_id: data.meet_id ?? null })
    return { id: r.lastInsertRowid }
  })

  ipcMain.handle('records:delete', (_, id) => {
    db.prepare('DELETE FROM records WHERE id = ?').run(id)
    return { success: true }
  })

  ipcMain.handle('records:syncFromResults', () => {
    const { readSettings } = require('./settings')
    const homeTeam = readSettings().homeTeam || 'Pegasus Track'

    const rows = db.prepare(`
      SELECT
        r.mark, r.wind,
        te.name     AS event_name,
        te.category AS event_category,
        me.gender,
        COALESCE(me.age_group, '') AS age_group,
        a.first_name || ' ' || a.last_name AS athlete_name,
        a.id   AS athlete_id,
        a.team AS team,
        m.name AS meet_name,
        m.id   AS meet_id,
        m.date AS meet_date
      FROM results r
      JOIN entries     e  ON r.entry_id       = e.id
      JOIN meet_events me ON e.meet_event_id  = me.id
      JOIN meets       m  ON me.meet_id        = m.id
      JOIN tf_events   te ON me.tf_event_id   = te.id
      JOIN athletes    a  ON e.athlete_id      = a.id
      WHERE r.disqualified   = 0
        AND r.did_not_start  = 0
        AND r.did_not_finish = 0
        AND r.mark IS NOT NULL
        AND r.mark != ''
    `).all()

    const isBetter = (newVal, oldVal, cat) => {
      if (oldVal == null) return true
      return (cat === 'field' || cat === 'combined') ? newVal > oldVal : newVal < oldVal
    }

    const clubBests = {}
    const openBests = {}

    for (const row of rows) {
      const val = parseMark(row.mark, row.event_category)
      if (val === null) continue
      const key = `${row.event_name}|${row.gender}|${row.age_group}`
      const rec = { ...row, mark_value: val, wind: row.wind != null ? String(row.wind) : '' }

      if (!openBests[key] || isBetter(val, openBests[key].mark_value, row.event_category))
        openBests[key] = rec

      if (row.team === homeTeam &&
          (!clubBests[key] || isBetter(val, clubBests[key].mark_value, row.event_category)))
        clubBests[key] = rec
    }

    db.prepare('DELETE FROM records WHERE is_auto = 1').run()

    const ins = db.prepare(`
      INSERT INTO records
        (scope, event_name, event_category, gender, age_group, mark, mark_value,
         wind, athlete_name, athlete_id, team, meet_name, meet_id, meet_date, is_auto)
      VALUES
        (@scope, @event_name, @event_category, @gender, @age_group, @mark, @mark_value,
         @wind, @athlete_name, @athlete_id, @team, @meet_name, @meet_id, @meet_date, 1)
    `)
    const bulkIns = db.transaction((bests, scope) => {
      for (const rec of Object.values(bests)) ins.run({ ...rec, scope })
    })
    bulkIns(clubBests, 'club')
    bulkIns(openBests, 'open')

    return { club: Object.keys(clubBests).length, open: Object.keys(openBests).length }
  })
}

function registerAttendanceHandlers() {
  // Sync attendance from entries for a meet (non-override rows only)
  ipcMain.handle('attendance:syncFromEntries', (_, meetId) => {
    const { readSettings } = require('./settings')
    const homeTeam = readSettings().homeTeam || 'Pegasus Track'
    const athletes = db.prepare(`
      SELECT DISTINCT e.athlete_id
      FROM entries e
      JOIN meet_events me ON me.id = e.meet_event_id
      JOIN athletes a ON a.id = e.athlete_id
      WHERE me.meet_id = ? AND e.athlete_id IS NOT NULL AND e.scratched = 0 AND a.team = ?
    `).all(meetId, homeTeam)

    const upsert = db.prepare(`
      INSERT INTO attendance (athlete_id, meet_id, present, is_override)
      VALUES (?, ?, 1, 0)
      ON CONFLICT(athlete_id, meet_id) DO UPDATE SET
        present = CASE WHEN is_override = 0 THEN 1 ELSE present END
    `)
    const sync = db.transaction(() => {
      let count = 0
      for (const { athlete_id } of athletes) {
        upsert.run(athlete_id, meetId)
        count++
      }
      return count
    })
    return { synced: sync() }
  })

  // Get home-team athletes with their attendance for a specific meet
  ipcMain.handle('attendance:getForMeet', (_, meetId) => {
    const { readSettings } = require('./settings')
    const homeTeam = readSettings().homeTeam || 'Pegasus Track'

    // Auto-derive from entries (any non-scratched entry = attended)
    const fromEntries = new Set(
      db.prepare(`
        SELECT DISTINCT e.athlete_id
        FROM entries e JOIN meet_events me ON me.id = e.meet_event_id
        WHERE me.meet_id = ? AND e.athlete_id IS NOT NULL AND e.scratched = 0
      `).all(meetId).map(r => r.athlete_id)
    )

    const athletes = db.prepare(`
      SELECT a.id, a.first_name, a.last_name, a.team, a.gender, a.athlete_number,
             att.present, att.is_override, att.notes
      FROM athletes a
      LEFT JOIN attendance att ON att.athlete_id = a.id AND att.meet_id = ?
      WHERE a.active = 1 AND a.team = ?
      ORDER BY a.last_name, a.first_name
    `).all(meetId, homeTeam)

    return athletes.map(a => ({
      ...a,
      // Override takes precedence; otherwise derive from entries
      present: a.is_override ? !!a.present : fromEntries.has(a.id),
      is_override: !!a.is_override,
    }))
  })

  // Set attendance for one athlete at one meet (manual override)
  ipcMain.handle('attendance:set', (_, { athleteId, meetId, present, notes }) => {
    db.prepare(`
      INSERT INTO attendance (athlete_id, meet_id, present, is_override, notes)
      VALUES (?, ?, ?, 1, ?)
      ON CONFLICT(athlete_id, meet_id) DO UPDATE SET
        present = excluded.present, is_override = 1, notes = excluded.notes
    `).run(athleteId, meetId, present ? 1 : 0, notes || null)
    return { success: true }
  })

  // Clear override (revert to auto-derived from entries)
  ipcMain.handle('attendance:clearOverride', (_, { athleteId, meetId }) => {
    db.prepare(`DELETE FROM attendance WHERE athlete_id = ? AND meet_id = ?`).run(athleteId, meetId)
    return { success: true }
  })

  // Season summary: per athlete, count meets attended across a season
  ipcMain.handle('attendance:getSeasonSummary', (_, seasonId) => {
    const { readSettings } = require('./settings')
    const homeTeam = readSettings().homeTeam || 'Pegasus Track'
    const meets = db.prepare(`
      SELECT id, name, date, type FROM meets
      WHERE season_id = ? AND type != 'runathon'
      ORDER BY date
    `).all(seasonId)

    if (meets.length === 0) return { meets: [], athletes: [] }

    const meetIds = meets.map(m => m.id)
    const placeholders = meetIds.map(() => '?').join(',')

    // Entries-derived attendance per meet per athlete
    const entryRows = db.prepare(`
      SELECT DISTINCT me.meet_id, e.athlete_id
      FROM entries e JOIN meet_events me ON me.id = e.meet_event_id
      WHERE me.meet_id IN (${placeholders}) AND e.athlete_id IS NOT NULL AND e.scratched = 0
    `).all(...meetIds)

    // Manual overrides
    const overrides = db.prepare(`
      SELECT athlete_id, meet_id, present, is_override
      FROM attendance
      WHERE meet_id IN (${placeholders})
    `).all(...meetIds)

    // Build override map
    const overrideMap = {}
    for (const o of overrides) {
      overrideMap[`${o.athlete_id}_${o.meet_id}`] = o
    }

    // Build entries set
    const entrySet = new Set(entryRows.map(r => `${r.athlete_id}_${r.meet_id}`))

    // Effective attendance: override wins, otherwise entry-derived
    const attendedSet = new Set()
    for (const meetId of meetIds) {
      const athleteIds = new Set(
        db.prepare('SELECT DISTINCT id FROM athletes WHERE active=1 AND team=?').all(homeTeam).map(a => a.id)
      )
      for (const aid of athleteIds) {
        const key = `${aid}_${meetId}`
        const ov = overrideMap[key]
        const present = ov?.is_override ? !!ov.present : entrySet.has(key)
        if (present) attendedSet.add(key)
      }
    }

    const athletes = db.prepare(`
      SELECT id, first_name, last_name, team, gender
      FROM athletes WHERE active = 1 AND team = ?
      ORDER BY last_name, first_name
    `).all(homeTeam)

    const athleteRows = athletes.map(a => {
      const attended = meetIds.filter(mid => attendedSet.has(`${a.id}_${mid}`))
      return { ...a, meets_attended: attended.length, attended_meet_ids: attended }
    })

    return { meets, athletes: athleteRows }
  })
}

function registerTemplateHandlers() {
  ipcMain.handle('templates:getAll', () =>
    db.prepare('SELECT * FROM meet_templates ORDER BY created_at DESC').all()
      .map(r => ({ ...r, events: JSON.parse(r.events_json) }))
  )

  ipcMain.handle('templates:save', (_, { name, events }) => {
    const result = db.prepare(
      'INSERT INTO meet_templates (name, events_json) VALUES (?, ?)'
    ).run(name, JSON.stringify(events))
    return { id: result.lastInsertRowid, name, events, created_at: new Date().toISOString() }
  })

  ipcMain.handle('templates:delete', (_, id) => {
    db.prepare('DELETE FROM meet_templates WHERE id = ?').run(id)
    return { success: true }
  })
}

app.whenReady().then(async () => {
  // One-time cleanup of any existing HTTP cache accumulated from prior versions
  try { await session.defaultSession.clearCache() } catch (_) {}
  initDatabase()
  registerAthleteHandlers()
  registerDashboardHandlers()
  registerSeasonHandlers()
  registerEventHandlers()
  registerSettingsHandlers()
  registerTeamHandlers()
  registerSyncHandlers()
  registerMeetHandlers()
  registerPortalHandlers()
  registerScheduleHandlers()
  registerAuthHandlers()
  registerImportHandlers()
  registerPrintHandlers()
  registerAiHandlers()
  registerRunathonHandlers()
  registerRelayHandlers()
  registerScoresHandlers()
  registerRecordsHandlers()
  registerAttendanceHandlers()
  registerTemplateHandlers()
  createWindow()
  require('./updater').checkForUpdates()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
