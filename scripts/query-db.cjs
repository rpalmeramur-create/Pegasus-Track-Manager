// Run with: npx electron scripts/query-db.cjs
const { app } = require('electron')
const path = require('path')

app.whenReady().then(() => {
  const Database = require('better-sqlite3')
  const dbPath = 'C:\\Users\\Ranso\\AppData\\Roaming\\pegasus-track\\pegasus-track.db'
  const db = new Database(dbPath, { readonly: true })

  console.log('=== ACTIVE ATHLETES BY TEAM ===')
  const totals = db.prepare(`SELECT team, COUNT(*) cnt FROM athletes WHERE active=1 GROUP BY team ORDER BY cnt DESC`).all()
  for (const t of totals) console.log(`  "${t.team}": ${t.cnt}`)

  console.log('\n=== ENTRIES pointing to INACTIVE athletes ===')
  const badEntries = db.prepare(`
    SELECT e.id eid, a.id aid, a.first_name, a.last_name, a.team, a.active
    FROM entries e JOIN athletes a ON a.id = e.athlete_id
    WHERE a.active = 0 LIMIT 10
  `).all()
  console.log(`  ${badEntries.length} entries with inactive athletes (showing first 10)`)
  for (const r of badEntries) console.log(`  entry#${r.eid} → athlete#${r.aid} ${r.first_name} ${r.last_name} team="${r.team}" active=${r.active}`)

  db.close()
  app.quit()
})
