-- ══════════════════════════════════════════════════════════════
-- PEGASUS TRACK — SUPABASE SCHEMA
-- Paste this entire file into Supabase → SQL Editor → Run
-- ══════════════════════════════════════════════════════════════

-- Drop in correct order (foreign key dependencies)
DROP TABLE IF EXISTS personal_records CASCADE;
DROP TABLE IF EXISTS results         CASCADE;
DROP TABLE IF EXISTS entries         CASCADE;
DROP TABLE IF EXISTS meet_events     CASCADE;
DROP TABLE IF EXISTS meets           CASCADE;
DROP TABLE IF EXISTS athletes        CASCADE;
DROP TABLE IF EXISTS tf_events       CASCADE;
DROP TABLE IF EXISTS seasons         CASCADE;

-- ── Seasons ───────────────────────────────────────────────────
CREATE TABLE seasons (
  id         INTEGER PRIMARY KEY,
  name       TEXT    NOT NULL,
  year       INTEGER NOT NULL,
  type       TEXT,
  active     BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ── Athletes (NO date_of_birth — privacy) ────────────────────
CREATE TABLE athletes (
  id             INTEGER PRIMARY KEY,
  first_name     TEXT NOT NULL,
  last_name      TEXT NOT NULL,
  gender         TEXT NOT NULL,
  athlete_number TEXT,
  updated_at     TIMESTAMPTZ DEFAULT now()
);

-- ── T&F Event Definitions ────────────────────────────────────
CREATE TABLE tf_events (
  id               INTEGER PRIMARY KEY,
  name             TEXT NOT NULL,
  abbreviation     TEXT,
  category         TEXT,
  measurement_unit TEXT,
  is_relay         BOOLEAN DEFAULT false,
  sort_order       INTEGER
);

-- ── Meets ────────────────────────────────────────────────────
CREATE TABLE meets (
  id                    INTEGER PRIMARY KEY,
  season_id             INTEGER REFERENCES seasons(id),
  name                  TEXT NOT NULL,
  date                  DATE NOT NULL,
  location              TEXT,
  host                  TEXT,
  type                  TEXT,
  status                TEXT DEFAULT 'upcoming',
  heat_sheets_published BOOLEAN DEFAULT false,
  results_published     BOOLEAN DEFAULT false,
  updated_at            TIMESTAMPTZ DEFAULT now()
);

-- ── Meet Events ──────────────────────────────────────────────
CREATE TABLE meet_events (
  id          INTEGER PRIMARY KEY,
  meet_id     INTEGER NOT NULL REFERENCES meets(id) ON DELETE CASCADE,
  tf_event_id INTEGER REFERENCES tf_events(id),
  gender      TEXT,
  age_group   TEXT,
  round       TEXT,
  sort_order  INTEGER
);

-- ── Entries (heat/lane seeding) ──────────────────────────────
CREATE TABLE entries (
  id            INTEGER PRIMARY KEY,
  meet_event_id INTEGER NOT NULL REFERENCES meet_events(id) ON DELETE CASCADE,
  athlete_id    INTEGER REFERENCES athletes(id),
  seed_mark     TEXT,
  heat          INTEGER,
  lane          INTEGER,
  scratched     BOOLEAN DEFAULT false
);

-- ── Results ──────────────────────────────────────────────────
CREATE TABLE results (
  id             INTEGER PRIMARY KEY,
  entry_id       INTEGER NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  mark           TEXT,
  place          INTEGER,
  wind           REAL,
  disqualified   BOOLEAN DEFAULT false,
  dq_reason      TEXT,
  did_not_start  BOOLEAN DEFAULT false,
  did_not_finish BOOLEAN DEFAULT false
);

-- ── Personal Records ─────────────────────────────────────────
CREATE TABLE personal_records (
  id          INTEGER PRIMARY KEY,
  athlete_id  INTEGER NOT NULL REFERENCES athletes(id),
  tf_event_id INTEGER NOT NULL REFERENCES tf_events(id),
  mark        TEXT    NOT NULL,
  date        DATE,
  meet_id     INTEGER REFERENCES meets(id),
  wind        REAL,
  indoor      BOOLEAN DEFAULT false,
  updated_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(athlete_id, tf_event_id, indoor)
);

-- ══════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- Authenticated users (parents) can read.
-- Only the service role key (desktop app) can write.
-- ══════════════════════════════════════════════════════════════

ALTER TABLE seasons          ENABLE ROW LEVEL SECURITY;
ALTER TABLE athletes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE tf_events        ENABLE ROW LEVEL SECURITY;
ALTER TABLE meets            ENABLE ROW LEVEL SECURITY;
ALTER TABLE meet_events      ENABLE ROW LEVEL SECURITY;
ALTER TABLE entries          ENABLE ROW LEVEL SECURITY;
ALTER TABLE results          ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "parents_read_seasons"
  ON seasons FOR SELECT TO authenticated USING (true);

CREATE POLICY "parents_read_athletes"
  ON athletes FOR SELECT TO authenticated USING (true);

CREATE POLICY "parents_read_tf_events"
  ON tf_events FOR SELECT TO authenticated USING (true);

-- Parents only see meets that have something published
CREATE POLICY "parents_read_meets"
  ON meets FOR SELECT TO authenticated
  USING (heat_sheets_published = true OR results_published = true);

CREATE POLICY "parents_read_meet_events"
  ON meet_events FOR SELECT TO authenticated USING (true);

CREATE POLICY "parents_read_entries"
  ON entries FOR SELECT TO authenticated USING (true);

CREATE POLICY "parents_read_results"
  ON results FOR SELECT TO authenticated USING (true);

CREATE POLICY "parents_read_prs"
  ON personal_records FOR SELECT TO authenticated USING (true);
