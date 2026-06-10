const path = require('path')
const Database = require('better-sqlite3')
const db = new Database(path.join(process.env.APPDATA, 'pegasus-track', 'pegasus-track.db'))

const before = db.prepare('SELECT COUNT(*) n FROM athletes WHERE active=1').get()
console.log('Athletes before:', before.n)

const dedupFn = db.transaction(() => {
  // Only merge athletes that share exact name+DOB (non-null). Keep lowest id.
  const groups = db.prepare(`
    SELECT MIN(id) keep_id, GROUP_CONCAT(id) ids, COUNT(*) cnt
    FROM athletes
    WHERE active = 1
      AND date_of_birth IS NOT NULL
      AND date_of_birth != ''
    GROUP BY lower(first_name), lower(last_name), date_of_birth
    HAVING cnt > 1
  `).all()

  console.log('Duplicate groups:', groups.length)

  const updateEntry = db.prepare('UPDATE entries SET athlete_id=? WHERE athlete_id=?')
  const updatePR    = db.prepare('UPDATE OR IGNORE personal_records SET athlete_id=? WHERE athlete_id=?')
  const softDelete  = db.prepare("UPDATE athletes SET active=0 WHERE id=?")

  let merged = 0
  for (const g of groups) {
    const dupeIds = g.ids.split(',').map(Number).filter(id => id !== g.keep_id)
    for (const dupeId of dupeIds) {
      updateEntry.run(g.keep_id, dupeId)
      updatePR.run(g.keep_id, dupeId)
      softDelete.run(dupeId)
      merged++
    }
  }
  return merged
})

const removed = dedupFn()
const after = db.prepare('SELECT COUNT(*) n FROM athletes WHERE active=1').get()
console.log('Duplicates removed:', removed)
console.log('Athletes after:', after.n)

// Also report team breakdown
console.log('\nTeams after dedup:')
db.prepare(`SELECT team, COUNT(*) n FROM athletes WHERE active=1 GROUP BY team ORDER BY n DESC`).all()
  .forEach(r => console.log(` ${r.n.toString().padStart(4)}  ${r.team}`))
