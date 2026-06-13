/**
 * Pegasus Track — Database Schema & Seed Data
 * Called once on app startup; CREATE IF NOT EXISTS is idempotent.
 */
module.exports = function initSchema(db) {

  // ─── Tables ────────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS athletes (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name     TEXT    NOT NULL,
      last_name      TEXT    NOT NULL,
      date_of_birth  TEXT    NOT NULL,
      gender         TEXT    NOT NULL CHECK(gender IN ('M','F')),
      athlete_number TEXT,
      active         INTEGER DEFAULT 1,
      notes          TEXT,
      created_at     TEXT    DEFAULT (datetime('now')),
      updated_at     TEXT    DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tf_events (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      name             TEXT    NOT NULL,
      abbreviation     TEXT,
      category         TEXT    NOT NULL CHECK(category IN ('track','field','combined','relay')),
      distance_meters  REAL,
      measurement_unit TEXT    DEFAULT 'time' CHECK(measurement_unit IN ('time','distance','points')),
      is_relay         INTEGER DEFAULT 0,
      sort_order       INTEGER DEFAULT 999
    );

    CREATE TABLE IF NOT EXISTS seasons (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT    NOT NULL,
      year       INTEGER NOT NULL,
      type       TEXT    DEFAULT 'outdoor' CHECK(type IN ('indoor','outdoor','cross_country')),
      start_date TEXT,
      end_date   TEXT,
      active     INTEGER DEFAULT 0,
      created_at TEXT    DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS meets (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      season_id INTEGER REFERENCES seasons(id),
      name      TEXT    NOT NULL,
      date      TEXT    NOT NULL,
      location  TEXT,
      host      TEXT,
      type      TEXT    DEFAULT 'invitational'
                        CHECK(type IN ('home','away','invitational','dual','championship')),
      status    TEXT    DEFAULT 'upcoming'
                        CHECK(status IN ('upcoming','active','completed','cancelled')),
      notes     TEXT,
      created_at TEXT   DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS meet_events (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      meet_id     INTEGER NOT NULL REFERENCES meets(id) ON DELETE CASCADE,
      tf_event_id INTEGER NOT NULL REFERENCES tf_events(id),
      gender      TEXT    NOT NULL CHECK(gender IN ('M','F','mixed')),
      age_group   TEXT,
      round       TEXT    DEFAULT 'final' CHECK(round IN ('prelim','semi','final')),
      status      TEXT    DEFAULT 'pending'
                          CHECK(status IN ('pending','seeded','in_progress','completed')),
      sort_order  INTEGER DEFAULT 999
    );

    CREATE TABLE IF NOT EXISTS entries (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      meet_event_id INTEGER NOT NULL REFERENCES meet_events(id) ON DELETE CASCADE,
      athlete_id    INTEGER NOT NULL REFERENCES athletes(id),
      seed_mark     TEXT,
      heat          INTEGER,
      lane          INTEGER,
      scratched     INTEGER DEFAULT 0,
      scratch_reason TEXT,
      created_at    TEXT    DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS results (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      entry_id         INTEGER NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
      mark             TEXT,
      place            INTEGER,
      wind             REAL,
      points           REAL,
      hand_timed       INTEGER DEFAULT 0,
      disqualified     INTEGER DEFAULT 0,
      dq_reason        TEXT,
      did_not_start    INTEGER DEFAULT 0,
      did_not_finish   INTEGER DEFAULT 0,
      notes            TEXT,
      created_at       TEXT    DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS personal_records (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      athlete_id  INTEGER NOT NULL REFERENCES athletes(id),
      tf_event_id INTEGER NOT NULL REFERENCES tf_events(id),
      mark        TEXT    NOT NULL,
      date        TEXT,
      meet_id     INTEGER REFERENCES meets(id),
      wind        REAL,
      hand_timed  INTEGER DEFAULT 0,
      indoor      INTEGER DEFAULT 0,
      updated_at  TEXT    DEFAULT (datetime('now')),
      UNIQUE(athlete_id, tf_event_id, indoor)
    );

    CREATE TABLE IF NOT EXISTS practices (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      title      TEXT    NOT NULL,
      date       TEXT    NOT NULL,
      start_time TEXT,
      end_time   TEXT,
      location   TEXT,
      notes      TEXT,
      created_at TEXT    DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS club_records (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      tf_event_id INTEGER NOT NULL REFERENCES tf_events(id),
      gender      TEXT    NOT NULL CHECK(gender IN ('M','F')),
      age_group   TEXT    NOT NULL,
      athlete_id  INTEGER REFERENCES athletes(id),
      athlete_name TEXT,
      mark        TEXT    NOT NULL,
      date        TEXT,
      meet_id     INTEGER REFERENCES meets(id),
      updated_at  TEXT    DEFAULT (datetime('now')),
      UNIQUE(tf_event_id, gender, age_group)
    );
  `)

  // ─── Migration: team column on athletes ──────────────────────
  const hasTeam = db.prepare("SELECT 1 FROM pragma_table_info('athletes') WHERE name='team'").get()
  if (!hasTeam) db.exec("ALTER TABLE athletes ADD COLUMN team TEXT NOT NULL DEFAULT 'Pegasus Track'")

  // ─── Migration: custom & adaptive flags on tf_events ─────────
  for (const col of ['is_custom','is_adaptive']) {
    const has = db.prepare(`SELECT 1 FROM pragma_table_info('tf_events') WHERE name='${col}'`).get()
    if (!has) db.exec(`ALTER TABLE tf_events ADD COLUMN ${col} INTEGER DEFAULT 0`)
  }

  // ─── Migration: emergency contacts & medical notes ────────────
  for (const col of ['ec1_name','ec1_rel','ec1_ph','ec1_ph2','ec2_name','ec2_rel','ec2_ph','medical']) {
    const has = db.prepare(`SELECT 1 FROM pragma_table_info('athletes') WHERE name='${col}'`).get()
    if (!has) db.exec(`ALTER TABLE athletes ADD COLUMN ${col} TEXT`)
  }

  // ─── Migration: team_profiles table ──────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS team_profiles (
      name        TEXT PRIMARY KEY,
      location    TEXT,
      head_coach  TEXT,
      description TEXT,
      founded     TEXT,
      logo        TEXT,
      created_at  TEXT DEFAULT (datetime('now'))
    )
  `)

  // ─── Migration: logo column on team_profiles (existing DBs) ──
  const hasTeamLogo = db.prepare("SELECT 1 FROM pragma_table_info('team_profiles') WHERE name='logo'").get()
  if (!hasTeamLogo) db.exec("ALTER TABLE team_profiles ADD COLUMN logo TEXT")

  // ─── Migration: type column on practices ─────────────────────
  const hasPracticeType = db.prepare("SELECT 1 FROM pragma_table_info('practices') WHERE name='type'").get()
  if (!hasPracticeType) db.exec("ALTER TABLE practices ADD COLUMN type TEXT NOT NULL DEFAULT 'practice'")

  // ─── Migrations: new result columns ──────────────────────────
  const hasAttempts = db.prepare("SELECT 1 FROM pragma_table_info('results') WHERE name='attempts_json'").get()
  if (!hasAttempts) db.exec("ALTER TABLE results ADD COLUMN attempts_json TEXT")

  const hasIsPr = db.prepare("SELECT 1 FROM pragma_table_info('results') WHERE name='is_pr'").get()
  if (!hasIsPr) db.exec("ALTER TABLE results ADD COLUMN is_pr INTEGER DEFAULT 0")

  // ─── Migration: update meets CHECK constraints ──────────────
  // Adds 'runathon' to type CHECK and 'in_progress' to status CHECK
  const meetsSchema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='meets'").get()
  if (meetsSchema && !meetsSchema.sql.includes("'runathon'")) {
    db.pragma('foreign_keys = OFF')
    db.exec(`
      CREATE TABLE meets_v2 (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        season_id  INTEGER REFERENCES seasons(id),
        name       TEXT    NOT NULL,
        date       TEXT    NOT NULL,
        location   TEXT,
        host       TEXT,
        type       TEXT    DEFAULT 'invitational'
                           CHECK(type IN ('home','away','invitational','dual','championship','runathon')),
        status     TEXT    DEFAULT 'upcoming'
                           CHECK(status IN ('upcoming','active','in_progress','completed','cancelled')),
        notes      TEXT,
        created_at TEXT    DEFAULT (datetime('now'))
      );
      INSERT INTO meets_v2 (id, season_id, name, date, location, host, type, status, notes, created_at)
        SELECT id, season_id, name, date, location, host, type, status, notes, created_at FROM meets;
      DROP TABLE meets;
      ALTER TABLE meets_v2 RENAME TO meets;
    `)
    db.pragma('foreign_keys = ON')
  }

  // ─── Run-a-thon participant entries ──────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS runathon_entries (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      meet_id         INTEGER NOT NULL REFERENCES meets(id) ON DELETE CASCADE,
      athlete_id      INTEGER REFERENCES athletes(id),
      guest_name      TEXT,
      guest_team      TEXT,
      laps            REAL,
      best_distance   TEXT,
      pledge_per_lap  REAL,
      flat_pledges    REAL,
      notes           TEXT,
      created_at      TEXT DEFAULT (datetime('now')),
      UNIQUE(meet_id, athlete_id)
    )
  `)

  // ─── Migration: pledge columns on existing runathon_entries ──
  const hasPledgePerLap = db.prepare("SELECT 1 FROM pragma_table_info('runathon_entries') WHERE name='pledge_per_lap'").get()
  if (!hasPledgePerLap) db.exec("ALTER TABLE runathon_entries ADD COLUMN pledge_per_lap REAL")
  const hasFlatPledges = db.prepare("SELECT 1 FROM pragma_table_info('runathon_entries') WHERE name='flat_pledges'").get()
  if (!hasFlatPledges) db.exec("ALTER TABLE runathon_entries ADD COLUMN flat_pledges REAL")

  // ─── Relay leg assignments ───────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS relay_legs (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      entry_id   INTEGER NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
      leg        INTEGER NOT NULL CHECK(leg IN (1,2,3,4)),
      athlete_id INTEGER REFERENCES athletes(id),
      UNIQUE(entry_id, leg)
    )
  `)

  // ─── Records (club & open meet all-time bests) ──────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS records (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      scope          TEXT NOT NULL CHECK(scope IN ('club','open')),
      event_name     TEXT NOT NULL,
      event_category TEXT NOT NULL,
      gender         TEXT NOT NULL DEFAULT 'M',
      age_group      TEXT NOT NULL DEFAULT '',
      mark           TEXT NOT NULL,
      mark_value     REAL,
      wind           TEXT,
      athlete_name   TEXT,
      athlete_id     INTEGER REFERENCES athletes(id),
      team           TEXT,
      meet_name      TEXT,
      meet_id        INTEGER REFERENCES meets(id),
      meet_date      TEXT,
      notes          TEXT,
      is_auto        INTEGER DEFAULT 0,
      created_at     TEXT DEFAULT (datetime('now')),
      updated_at     TEXT DEFAULT (datetime('now'))
    )
  `)

  // ─── Meet templates ─────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS meet_templates (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT    NOT NULL,
      events_json TEXT    NOT NULL,
      created_at  TEXT    DEFAULT (datetime('now'))
    )
  `)

  // ─── Users / Auth ────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      username      TEXT    NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT    NOT NULL,
      role          TEXT    NOT NULL DEFAULT 'parent' CHECK(role IN ('admin','parent')),
      display_name  TEXT,
      active        INTEGER NOT NULL DEFAULT 1,
      last_login    TEXT,
      created_at    TEXT    DEFAULT (datetime('now'))
    )
  `)
  // Seed default admin if no users exist
  const userCount = db.prepare('SELECT COUNT(*) as n FROM users').get()
  if (userCount.n === 0) {
    const crypto = require('crypto')
    const salt = crypto.randomBytes(16).toString('hex')
    const hash = crypto.scryptSync('coach', salt, 64).toString('hex')
    db.prepare(`INSERT INTO users (username, password_hash, role, display_name)
                VALUES ('admin', ?, 'admin', 'Head Coach')`).run(`${salt}:${hash}`)
  }

  // ─── Attendance ──────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS attendance (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      athlete_id  INTEGER NOT NULL REFERENCES athletes(id),
      meet_id     INTEGER NOT NULL REFERENCES meets(id),
      present     INTEGER NOT NULL DEFAULT 1,
      is_override INTEGER NOT NULL DEFAULT 0,
      notes       TEXT,
      created_at  TEXT DEFAULT (datetime('now')),
      UNIQUE(athlete_id, meet_id)
    )
  `)

  // ─── Standard event catalogue (single source of truth) ──────
  const STANDARD_EVENTS = [
    { name:'50 Meter Dash',       abbreviation:'50m',      category:'track',    distance_meters:50,      measurement_unit:'time',     is_relay:0, sort_order:1  },
    { name:'100 Meter Dash',      abbreviation:'100m',     category:'track',    distance_meters:100,     measurement_unit:'time',     is_relay:0, sort_order:5  },
    { name:'200 Meter Dash',      abbreviation:'200m',     category:'track',    distance_meters:200,     measurement_unit:'time',     is_relay:0, sort_order:6  },
    { name:'400 Meter Dash',      abbreviation:'400m',     category:'track',    distance_meters:400,     measurement_unit:'time',     is_relay:0, sort_order:7  },
    { name:'800 Meter Run',       abbreviation:'800m',     category:'track',    distance_meters:800,     measurement_unit:'time',     is_relay:0, sort_order:8  },
    { name:'1500 Meter Run',      abbreviation:'1500m',    category:'track',    distance_meters:1500,    measurement_unit:'time',     is_relay:0, sort_order:9  },
    { name:'1600 Meter Run',      abbreviation:'1600m',    category:'track',    distance_meters:1600,    measurement_unit:'time',     is_relay:0, sort_order:10 },
    { name:'Mile Run',            abbreviation:'1 Mile',   category:'track',    distance_meters:1609.34, measurement_unit:'time',     is_relay:0, sort_order:11 },
    { name:'3000 Meter Run',      abbreviation:'3000m',    category:'track',    distance_meters:3000,    measurement_unit:'time',     is_relay:0, sort_order:12 },
    { name:'3200 Meter Run',      abbreviation:'3200m',    category:'track',    distance_meters:3200,    measurement_unit:'time',     is_relay:0, sort_order:13 },
    { name:'2 Mile Run',          abbreviation:'2 Mile',   category:'track',    distance_meters:3218.69, measurement_unit:'time',     is_relay:0, sort_order:14 },
    { name:'5000 Meter Run',      abbreviation:'5000m',    category:'track',    distance_meters:5000,    measurement_unit:'time',     is_relay:0, sort_order:15 },
    { name:'10000 Meter Run',     abbreviation:'10000m',   category:'track',    distance_meters:10000,   measurement_unit:'time',     is_relay:0, sort_order:16 },
    { name:'50 Meter Hurdles',    abbreviation:'50mH',     category:'track',    distance_meters:50,      measurement_unit:'time',     is_relay:0, sort_order:19 },
    { name:'60 Meter Hurdles',    abbreviation:'60mH',     category:'track',    distance_meters:60,      measurement_unit:'time',     is_relay:0, sort_order:20 },
    { name:'80 Meter Hurdles',    abbreviation:'80mH',     category:'track',    distance_meters:80,      measurement_unit:'time',     is_relay:0, sort_order:21 },
    { name:'100 Meter Hurdles',   abbreviation:'100mH',    category:'track',    distance_meters:100,     measurement_unit:'time',     is_relay:0, sort_order:22 },
    { name:'110 Meter Hurdles',   abbreviation:'110mH',    category:'track',    distance_meters:110,     measurement_unit:'time',     is_relay:0, sort_order:23 },
    { name:'300 Meter Hurdles',   abbreviation:'300mH',    category:'track',    distance_meters:300,     measurement_unit:'time',     is_relay:0, sort_order:24 },
    { name:'400 Meter Hurdles',   abbreviation:'400mH',    category:'track',    distance_meters:400,     measurement_unit:'time',     is_relay:0, sort_order:25 },
    { name:'2000m Steeplechase',  abbreviation:'2000mSC',  category:'track',    distance_meters:2000,    measurement_unit:'time',     is_relay:0, sort_order:30 },
    { name:'3000m Steeplechase',  abbreviation:'3000mSC',  category:'track',    distance_meters:3000,    measurement_unit:'time',     is_relay:0, sort_order:31 },
    { name:'4 x 100 Meter Relay', abbreviation:'4x100m',   category:'relay',    distance_meters:400,     measurement_unit:'time',     is_relay:1, sort_order:40 },
    { name:'4 x 200 Meter Relay', abbreviation:'4x200m',   category:'relay',    distance_meters:800,     measurement_unit:'time',     is_relay:1, sort_order:41 },
    { name:'4 x 400 Meter Relay', abbreviation:'4x400m',   category:'relay',    distance_meters:1600,    measurement_unit:'time',     is_relay:1, sort_order:42 },
    { name:'4 x 800 Meter Relay', abbreviation:'4x800m',   category:'relay',    distance_meters:3200,    measurement_unit:'time',     is_relay:1, sort_order:43 },
    { name:'Sprint Medley Relay', abbreviation:'SMR',      category:'relay',    distance_meters:null,    measurement_unit:'time',     is_relay:1, sort_order:44 },
    { name:'Distance Medley Relay',abbreviation:'DMR',     category:'relay',    distance_meters:null,    measurement_unit:'time',     is_relay:1, sort_order:45 },
    { name:'Long Jump',           abbreviation:'LJ',       category:'field',    distance_meters:null,    measurement_unit:'distance', is_relay:0, sort_order:50 },
    { name:'Triple Jump',         abbreviation:'TJ',       category:'field',    distance_meters:null,    measurement_unit:'distance', is_relay:0, sort_order:51 },
    { name:'High Jump',           abbreviation:'HJ',       category:'field',    distance_meters:null,    measurement_unit:'distance', is_relay:0, sort_order:52 },
    { name:'Pole Vault',          abbreviation:'PV',       category:'field',    distance_meters:null,    measurement_unit:'distance', is_relay:0, sort_order:53 },
    { name:'Shot Put',            abbreviation:'SP',       category:'field',    distance_meters:null,    measurement_unit:'distance', is_relay:0, sort_order:60 },
    { name:'Discus',              abbreviation:'DT',       category:'field',    distance_meters:null,    measurement_unit:'distance', is_relay:0, sort_order:61 },
    { name:'Hammer',              abbreviation:'HT',       category:'field',    distance_meters:null,    measurement_unit:'distance', is_relay:0, sort_order:62 },
    { name:'Javelin',             abbreviation:'JT',       category:'field',    distance_meters:null,    measurement_unit:'distance', is_relay:0, sort_order:63 },
    { name:'Turbo Javelin',       abbreviation:'Turbo JT', category:'field',    distance_meters:null,    measurement_unit:'distance', is_relay:0, sort_order:64 },
    { name:'Softball Throw',      abbreviation:'SB',       category:'field',    distance_meters:null,    measurement_unit:'distance', is_relay:0, sort_order:65 },
    { name:'Pentathlon',          abbreviation:'Pent',     category:'combined', distance_meters:null,    measurement_unit:'points',   is_relay:0, sort_order:70 },
    { name:'Heptathlon',          abbreviation:'Hept',     category:'combined', distance_meters:null,    measurement_unit:'points',   is_relay:0, sort_order:71 },
    { name:'Decathlon',           abbreviation:'Dec',      category:'combined', distance_meters:null,    measurement_unit:'points',   is_relay:0, sort_order:72 },
  ]

  // ─── Seed on empty DB; backfill missing events on existing DB ─
  const insEvent = db.prepare(`
    INSERT INTO tf_events (name,abbreviation,category,distance_meters,measurement_unit,is_relay,sort_order)
    VALUES (@name,@abbreviation,@category,@distance_meters,@measurement_unit,@is_relay,@sort_order)
  `)
  const existingNames = new Set(db.prepare('SELECT name FROM tf_events').all().map(r => r.name))
  const missing = STANDARD_EVENTS.filter(e => !existingNames.has(e.name))
  if (missing.length > 0) {
    db.transaction(evs => { for (const e of evs) insEvent.run(e) })(missing)
  }

  // ─── Migrations: remove unused events ────────────────────────
  for (const evName of ['55 Meter Dash', '60 Meter Dash', '75 Meter Dash']) {
    const ev = db.prepare('SELECT id FROM tf_events WHERE name=?').get(evName)
    if (ev) {
      db.prepare(`DELETE FROM entries WHERE meet_event_id IN
        (SELECT id FROM meet_events WHERE tf_event_id=?)`).run(ev.id)
      db.prepare('DELETE FROM meet_events WHERE tf_event_id=?').run(ev.id)
      db.prepare('DELETE FROM tf_events WHERE id=?').run(ev.id)
    }
  }

  // ─── Migrations: rename old event names ──────────────────────
  const renames = [
    ['50 Meters','50 Meter Dash'],['100 Meters','100 Meter Dash'],
    ['200 Meters','200 Meter Dash'],['400 Meters','400 Meter Dash'],
    ['800 Meters','800 Meter Run'],['1500 Meters','1500 Meter Run'],
    ['1600 Meters','1600 Meter Run'],['Mile','Mile Run'],
    ['3000 Meters','3000 Meter Run'],['3200 Meters','3200 Meter Run'],
    ['2 Mile','2 Mile Run'],['5000 Meters','5000 Meter Run'],['10000 Meters','10000 Meter Run'],
  ]
  const renameStmt = db.prepare('UPDATE tf_events SET name=? WHERE name=?')
  db.transaction(() => { for (const [from, to] of renames) renameStmt.run(to, from) })()
}
