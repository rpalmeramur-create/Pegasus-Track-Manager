# Pegasus Track

Track & field club management software. Built with Electron + React + SQLite. Fully offline.

---

## Running the App

No installation required. Just download and run the pre-built executable:

```
release\win-unpacked\Pegasus Track.exe
```

Double-click it and the app opens. Your data is stored locally — nothing goes to the internet.

> **Windows SmartScreen warning?** Click **"More info"** then **"Run anyway"**. This is expected for unsigned apps.

---

## Where is my data?

All athlete, meet, and results data is stored in a single SQLite file at:

```
C:\Users\YourName\AppData\Roaming\pegasus-track\pegasus-track.db
```

Back it up any time by copying that file.

---

## Features

- Athlete roster with emergency contacts, medical notes, age groups
- Meet management — events, entries, seeding, results, rankings
- Heat sheet & results printing (8.5×11 and thermal label formats)
- Award label printing
- Records — auto-computed PRs and club records from all results
- Attendance tracking with per-meet overrides and season confirmation status
- Season scoring
- 100% offline — no internet required at meets

---

## Developer Setup

Only needed if you want to modify the source code and rebuild.

**Prerequisites:** Node.js 18+, Windows 11, PowerShell or Command Prompt

```
npm install
npm run dev          # development mode (hot reload)
npm run dist:dir     # build the exe to release\win-unpacked\
```

> `npm install` compiles a native SQLite module for Electron — takes 2–3 minutes the first time.

### Folder structure

```
pegasus-track/
├── electron/
│   ├── main.js          — Main process + all IPC handlers
│   ├── preload.js       — Secure renderer bridge
│   ├── settings.js      — App settings (JSON file)
│   └── database/
│       └── db.js        — SQLite schema & migrations
└── src/
    ├── App.jsx           — Root app + routing
    ├── SettingsContext.jsx
    ├── components/
    │   ├── Sidebar.jsx
    │   └── PrintAwardLabels.jsx
    └── pages/
        ├── Dashboard.jsx
        ├── Roster.jsx
        ├── Meets.jsx
        ├── Results.jsx
        ├── Records.jsx
        ├── Attendance.jsx
        ├── Scores.jsx
        └── Settings.jsx
```
