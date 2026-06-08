# 🏃 Pegasus Track

Track & Field club management software. Built with Electron + React + SQLite.

---

## First-Time Setup

### Prerequisites
- **Node.js 18+** — download from https://nodejs.org
- **Windows 11**
- A terminal: PowerShell or Command Prompt

### Steps

1. Copy the entire `pegasus-track/` folder to wherever you keep projects
   (e.g., `C:\Users\YourName\Documents\pegasus-track`)

2. Open a terminal and navigate to that folder:
   ```
   cd C:\Users\YourName\Documents\pegasus-track
   ```

3. Install dependencies (this also rebuilds `better-sqlite3` for Electron):
   ```
   npm install
   ```
   > ⚠️ This step compiles a native database module for Electron.
   > It takes 2-3 minutes the first time. This is normal.

4. Start the app in development mode:
   ```
   npm run dev
   ```
   The Pegasus Track window will open automatically.

---

## Folder Structure

```
pegasus-track/
├── package.json              — Dependencies & scripts
├── vite.config.js            — Vite bundler config
├── index.html                — HTML entry point
├── electron/
│   ├── main.js               — Electron main process + IPC handlers
│   ├── preload.js            — Secure bridge to renderer
│   └── database/
│       └── db.js             — SQLite schema & seed data
└── src/
    ├── main.jsx              — React entry
    ├── App.jsx               — Root app + routing
    ├── styles/
    │   └── global.css        — Full design system
    ├── components/
    │   └── Sidebar.jsx       — Navigation sidebar
    └── pages/
        ├── Dashboard.jsx     — Overview & stats
        └── Roster.jsx        — Athlete management
```

---

## Where is the database?

Your data is stored locally at:
```
C:\Users\YourName\AppData\Roaming\pegasus-track\pegasus-track.db
```
It's a standard SQLite file you can back up any time.

---

## Scripts

| Command         | Description                             |
|-----------------|-----------------------------------------|
| `npm run dev`   | Start in development mode               |
| `npm run build` | Build a distributable Windows installer |

---

## Phase 1 — Complete ✅

- Athlete roster (add, edit, remove)
- Search & filter by name, gender, age group
- Age auto-calculated from date of birth
- Dashboard overview with stats
- Full database schema for all future features
- 100% offline — no internet required at meets

## Phase 2 — Coming Next

- Season management
- Meet creation & configuration
- Event setup per meet
- Athlete entry generation
- Heat sheet printing

## Phase 3

- Seeding engine (time-based, circle seeding)
- Results entry
- Timing system integration (FinishLynx, TimeTronics, Daktronics)

## Phase 4

- Club records & age group records
- Season reports
- PR tracking & history
