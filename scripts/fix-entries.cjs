// Run with: npx electron scripts/fix-entries.cjs
// Redirects entries pointing to inactive athletes to their active counterpart (same name).
// Also normalises all Pegasus-variant team names to "Pegasus Track".
const { app } = require('electron')
app.whenReady().then(() => {
  const Database = require('better-sqlite3')
  const db = new Database('C:\\Users\\Ranso\\AppData\\Roaming\\pegasus-track\\pegasus-track.db')

  const fix = db.transaction(() => {
    // 1. Normalise all Pegasus variants on active athletes to "Pegasus Track"
    const normResult = db.prepare(`
      UPDATE athletes SET team='Pegasus Track', updated_at=datetime('now')
      WHERE active=1 AND lower(team) LIKE '%pegasus%' AND team != 'Pegasus Track'
    `).run()
    console.log(`Normalised ${normResult.changes} active athletes to "Pegasus Track"`)

    // 2. Find entries that point to inactive athletes
    const badEntries = db.prepare(`
      SELECT DISTINCT e.athlete_id AS old_id,
             a.first_name, a.last_name
      FROM entries e
      JOIN athletes a ON a.id = e.athlete_id
      WHERE a.active = 0
    `).all()
    console.log(`Found ${badEntries.length} inactive-athlete entry groups to fix`)

    const updateEntry = db.prepare('UPDATE entries SET athlete_id=? WHERE athlete_id=?')
    const findActive  = db.prepare(`
      SELECT id FROM athletes
      WHERE lower(first_name)=lower(?) AND lower(last_name)=lower(?) AND active=1
      ORDER BY id LIMIT 1
    `)
    const activateAthlete = db.prepare(`UPDATE athletes SET active=1, updated_at=datetime('now') WHERE id=?`)

    let redirected = 0, activated = 0, noMatch = 0
    for (const b of badEntries) {
      // Try to find an active athlete with the same name
      let active = findActive.get(b.first_name, b.last_name)

      if (!active) {
        // No active match — reactivate the inactive athlete so results stay visible
        activateAthlete.run(b.old_id)
        activated++
      } else {
        // Redirect entries from inactive to active athlete
        updateEntry.run(active.id, b.old_id)
        redirected++
      }
    }
    console.log(`Redirected: ${redirected}  Reactivated: ${activated}  No match: ${noMatch}`)

    return { redirected, activated }
  })

  fix()

  // Final state
  console.log('\n=== Final active athlete counts ===')
  const teams = db.prepare(`SELECT team, COUNT(*) cnt FROM athletes WHERE active=1 GROUP BY team ORDER BY cnt DESC`).all()
  for (const t of teams) console.log(`  "${t.team}": ${t.cnt}`)

  const stillBad = db.prepare(`
    SELECT COUNT(*) cnt FROM entries e
    JOIN athletes a ON a.id = e.athlete_id WHERE a.active=0
  `).get()
  console.log(`\nEntries still pointing to inactive athletes: ${stillBad.cnt}`)

  db.close()
  app.quit()
})
