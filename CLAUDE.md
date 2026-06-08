# Pegasus Track — Club Management App

## What this is
A full-featured track & field club management app built as a single React component. Head coach tool for managing ~200 athletes ages 5–18. Fully offline-capable. Originally built as a Claude artifact, now a local Vite + React app.

## How to run
```bash
npm install
npm run dev
```
Then open http://localhost:5173

## Architecture

### Single-file component: `src/PegasusTrack.jsx`
The entire app lives in one large JSX file. This was intentional for the artifact environment but can be split into modules as the project grows. All logic, styles, and components are here.

### Storage
Uses `localStorage` via a `window.storage` compatibility shim in `src/storage.js`. The shim mirrors the Claude artifact storage API so the component code doesn't need to change. Storage keys:

| Key | Contents |
|-----|----------|
| `pt_athletes` | `{ id, fn, ln, g, age, dob, num, notes, ec1_name, ec1_rel, ec1_ph, ec1_ph2, ec2_name, ec2_rel, ec2_ph, medical, created_at }` |
| `pt_meets` | `{ id, name, date, loc, type, status, sid }` |
| `pt_seasons` | `{ id, name, year, type, active }` |
| `pt_me` | Meet events: `{ id, mid, name, ab, cat, g, ag, round, order, status, scheduled_time }` |
| `pt_entries` | `{ id, evid, aid, gname, gteam, heat, lane, seed, scratched, attempts[] }` |
| `pt_results` | `{ id, eid, place, mark, wind, dns, dnf, dq, dqr, is_pr }` |

### Design tokens (in CSS constant at top of PegasusTrack.jsx)
- Background: `#08091a` (--bg), dark navy theme
- Accent: `#38bdf8` (--acc), sky blue
- Gold: `#f59e0b` (--gld)
- Fonts: Barlow Condensed (headings) + DM Sans (body)

## Views / Pages
The app has two top-level views toggled in the top nav bar:
1. **Desktop App** — the full coach management UI
2. **Parent Portal** — read-only portal preview (demo data)

### Desktop App pages (left sidebar nav):
- **Dashboard** — stats, age group breakdown, recent athletes, upcoming meets
- **Roster** — athlete CRUD with emergency contacts (2 contacts), medical notes, search/filter
- **Meets** — meet list with status flow; clicking a meet opens MeetDetail
- **Records** — auto-computed PRs from all results, filterable by event category and gender
- **Settings** — season management, data export (JSON), reset

### MeetDetail (4 tabs):
1. **Events & Entries** — add T&F events from full catalogue, add roster/guest athletes, scratch management
2. **Seeding** — auto-seed engine with per-event or seed-all button
3. **Results** — inline mark entry, auto-rank, PR detection (★), field attempt slots (6), DNS/DNF/DQ
4. **Reports** — Heat Sheet view, Results view, Team Scores; **Print Sheet** button opens full-screen 8.5×11 print preview

## Key algorithms (in PegasusTrack.jsx)

### `seedEvent(ev, entries)`
- **Track**: sorts by seed mark descending, assigns heats (8 per heat), center-out lane order `[4,5,3,6,2,7,1,8]`
- **Field**: sorts descending, assigns flights of 8, position within flight

### `autoRank(ev, entries, results)`
Sorts valid marks by event category (ascending for track, descending for field), assigns places with tie detection, updates result objects.

### `computePRs(athletes, entries, results, meetEvents, meets)`
Scans all results, returns a map keyed `athleteId_eventName` → best mark with meet/date metadata.

### `computeTeamScores(entries, results)`
Scoring table: `{1:8, 2:6, 3:5, 4:4, 5:3, 6:2, 7:1}`

### `parseMark(str, cat)`
- Track: converts `mm:ss.ss` or plain seconds to float
- Field: converts `feet-inches` or meters to inches float for comparison

## T&F Event catalogue
Full catalogue in `TF_EVENTS` constant: 36 events across track, relay, field, combined categories covering youth through open age groups.

## Print system
`PrintSheetContent` + `PrintReportModal` components.
- **Track events**: portrait 8.5×11, per-heat tables with Lane/Bib/Athlete/Team/Seed + yellow write-in columns for Time/Wind/Place
- **Field events**: landscape 8.5×11, per-flight tables with 6 attempt columns
- Uses CSS `@media print` with `visibility: hidden` / `visibility: visible` trick to isolate print content
- Page breaks between heats via `.pbreak` class

## Guest athletes
Entries can be for non-roster athletes (from visiting clubs). Set `aid: null`, use `gname` + `gteam` fields.

## What's NOT built yet (next priorities)
- [ ] **FinishLynx `.lif` file import** — parse timing system output and auto-populate results
- [ ] **TimeTronics integration** — similar to FinishLynx
- [ ] **Relay leg tracking** — 4 athletes per relay entry
- [ ] **Multi-round advancement** — top N athletes advance from prelims to semis/finals
- [ ] **PDF export** — heat sheets and results as downloadable PDFs
- [ ] **Club records** — all-time bests per event/age group (separate from individual PRs)
- [ ] **Season aggregate scoring** — points across all meets in a season
- [ ] **Electron desktop app** — wrap in Electron for true offline use; see `electron/` notes below
- [ ] **Parent portal backend** — Supabase schema at `supabase-setup.sql` (not included here)

## Planned Electron wrapper
If migrating to a desktop app:
- Use `electron` + `better-sqlite3` to replace localStorage
- IPC handlers for all CRUD operations
- `electron/main.js` manages BrowserWindow and IPC
- `electron/database/db.js` for SQLite schema
- Replace `src/storage.js` shim with Electron IPC calls
- No DOB synced to cloud (privacy)

## Coach context
- Club: Pegasus Track
- ~200 athletes, ages 5–18
- Windows 11 laptop
- Offline at meets (no internet)
- Single shared login for parent portal

## File structure
```
pegasus-track/
├── CLAUDE.md          ← you are here
├── package.json
├── vite.config.js
├── index.html
├── src/
│   ├── main.jsx       ← React entry point, loads storage shim
│   ├── storage.js     ← window.storage → localStorage polyfill
│   └── PegasusTrack.jsx  ← entire app (2500+ lines)
└── .gitignore
```
