// Run with: npx electron scripts/dedup-pegasus.cjs
const { app } = require('electron')
app.whenReady().then(() => {
  const Database = require('better-sqlite3')
  const db = new Database('C:\\Users\\Ranso\\AppData\\Roaming\\pegasus-track\\pegasus-track.db')

  const fix = db.transaction(() => {
    // Find all duplicate name groups among active athletes (any team)
    const groups = db.prepare(`
      SELECT lower(first_name) fn, lower(last_name) ln,
             COUNT(*) cnt, MIN(id) keep_id, GROUP_CONCAT(id ORDER BY id) ids
      FROM athletes
      WHERE active = 1
      GROUP BY lower(first_name), lower(last_name)
      HAVING cnt > 1
    `).all()

    const updateEntry   = db.prepare('UPDATE entries       SET athlete_id=? WHERE athlete_id=?')
    const updateResult  = db.prepare('UPDATE OR IGNORE personal_records SET athlete_id=? WHERE athlete_id=?')
    const deactivate    = db.prepare("UPDATE athletes SET active=0, updated_at=datetime('now') WHERE id=?")

    let merged = 0
    for (const g of groups) {
      const dupeIds = g.ids.split(',').map(Number).filter(id => id !== g.keep_id)
      for (const dupeId of dupeIds) {
        updateEntry.run(g.keep_id, dupeId)
        updateResult.run(g.keep_id, dupeId)
        deactivate.run(dupeId)
        merged++
      }
    }
    return { groups: groups.length, merged }
  })

  const { groups, merged } = fix()
  console.log(`Merged ${merged} duplicate records across ${groups} groups.`)

  const remaining = db.prepare(
    `SELECT team, COUNT(*) cnt FROM athletes WHERE active=1 GROUP BY team ORDER BY cnt DESC`
  ).all()
  console.log('\nActive athletes after dedup:')
  for (const r of remaining) console.log(`  "${r.team}": ${r.cnt}`)

  db.close()
  app.quit()
})
