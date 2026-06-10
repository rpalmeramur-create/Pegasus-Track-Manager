// Run with: npx electron scripts/fix-visiting-athletes.cjs
// Fixes visiting athletes in the DB: keeps the earliest correct-team row, deactivates Pegasus Track dupes.
const { app } = require('electron')
app.whenReady().then(() => {
  const Database = require('better-sqlite3')
  const db = new Database('C:\\Users\\Ranso\\AppData\\Roaming\\pegasus-track\\pegasus-track.db')

  const fix = db.transaction(() => {
    // Find all athletes who have at least one row with a non-Pegasus team
    const visitingPeople = db.prepare(`
      SELECT lower(first_name) fn, lower(last_name) ln, date_of_birth dob
      FROM athletes
      WHERE lower(team) NOT LIKE '%pegasus%'
        AND first_name != '' AND last_name != ''
      GROUP BY lower(first_name), lower(last_name), date_of_birth
    `).all()

    let fixed = 0
    const updateEntries = db.prepare('UPDATE entries SET athlete_id=? WHERE athlete_id=?')
    const updatePRs     = db.prepare('UPDATE OR IGNORE personal_records SET athlete_id=? WHERE athlete_id=?')
    const activate      = db.prepare("UPDATE athletes SET active=1, updated_at=datetime('now') WHERE id=?")
    const deactivate    = db.prepare("UPDATE athletes SET active=0, updated_at=datetime('now') WHERE id=?")

    for (const p of visitingPeople) {
      // Get ALL rows for this person (all teams, all active states), ordered by id
      const allRows = db.prepare(`
        SELECT id, team, active FROM athletes
        WHERE lower(first_name)=? AND lower(last_name)=? AND date_of_birth=?
        ORDER BY id
      `).all(p.fn, p.ln, p.dob)

      if (allRows.length <= 1) continue

      // The canonical row: prefer the earliest non-Pegasus row
      const canonical = allRows.find(r => !/pegasus/i.test(r.team || '')) || allRows[0]

      // Activate the canonical row
      if (!canonical.active) activate.run(canonical.id)

      // Deactivate all others, redirect their entries/PRs to canonical
      for (const r of allRows) {
        if (r.id === canonical.id) continue
        updateEntries.run(canonical.id, r.id)
        updatePRs.run(canonical.id, r.id)
        deactivate.run(r.id)
      }
      fixed++
    }

    return fixed
  })

  const count = fix()
  console.log(`Fixed ${count} visiting athletes — their correct teams are now active.`)

  // Verify
  const teams = db.prepare(
    `SELECT team, COUNT(*) cnt FROM athletes WHERE active=1 GROUP BY team ORDER BY cnt DESC`
  ).all()
  console.log('\nTeams in DB after fix:')
  for (const t of teams) console.log(`  "${t.team}": ${t.cnt}`)

  db.close()
  app.quit()
})
