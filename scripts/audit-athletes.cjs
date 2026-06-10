const path = require('path')
const Database = require('better-sqlite3')
const db = new Database(path.join(process.env.APPDATA, 'pegasus-track', 'pegasus-track.db'))

console.log('=== Total athletes by active status ===')
db.prepare('SELECT active, COUNT(*) n FROM athletes GROUP BY active').all()
  .forEach(r => console.log(` active=${r.active}: ${r.n}`))

console.log('\n=== Athletes by team (top 20) ===')
db.prepare(`SELECT team, COUNT(*) n FROM athletes WHERE active=1 GROUP BY team ORDER BY n DESC LIMIT 20`).all()
  .forEach(r => console.log(` ${r.n.toString().padStart(4)}  ${r.team}`))

console.log('\n=== Duplicate groups (same name+DOB, DOB not null) ===')
const dups = db.prepare(`
  SELECT lower(first_name) fn, lower(last_name) ln, date_of_birth dob, COUNT(*) cnt, GROUP_CONCAT(id) ids
  FROM athletes WHERE active=1 AND date_of_birth IS NOT NULL AND date_of_birth != ''
  GROUP BY lower(first_name), lower(last_name), date_of_birth
  HAVING cnt > 1
  ORDER BY cnt DESC LIMIT 20
`).all()
console.log(` ${dups.length} duplicate groups found`)
dups.forEach(r => console.log(`  ${r.fn} ${r.ln} DOB:${r.dob} x${r.cnt} ids:[${r.ids}]`))

console.log('\n=== Athletes created by date ===')
db.prepare(`SELECT substr(created_at,1,10) d, COUNT(*) n FROM athletes WHERE active=1 GROUP BY d ORDER BY d`).all()
  .forEach(r => console.log(` ${r.d}: ${r.n}`))
