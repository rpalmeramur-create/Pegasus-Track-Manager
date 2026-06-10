const path = require('path')
const Database = require('better-sqlite3')
const db = new Database(path.join(process.env.APPDATA, 'pegasus-track', 'pegasus-track.db'))

const resultCount = db.prepare('SELECT COUNT(*) as n FROM results').get()
console.log('Total results:', resultCount.n)

const withMark = db.prepare("SELECT COUNT(*) as n FROM results WHERE mark IS NOT NULL AND mark != ''").get()
console.log('Results with mark:', withMark.n)

const noAthlete = db.prepare(`
  SELECT COUNT(*) as n FROM results r
  JOIN entries e ON r.entry_id = e.id
  WHERE e.athlete_id IS NULL
`).get()
console.log('Results with no athlete_id (guest):', noAthlete.n)

const joinCheck = db.prepare(`
  SELECT COUNT(*) as n
  FROM results r
  JOIN entries e ON r.entry_id = e.id
  JOIN meet_events me ON e.meet_event_id = me.id
  JOIN meets m ON me.meet_id = m.id
  JOIN tf_events te ON me.tf_event_id = te.id
  JOIN athletes a ON e.athlete_id = a.id
  WHERE r.disqualified = 0 AND r.did_not_start = 0 AND r.did_not_finish = 0
    AND r.mark IS NOT NULL AND r.mark != ''
`).get()
console.log('Rows matching sync query (with athlete JOIN):', joinCheck.n)

const sample = db.prepare(`
  SELECT r.mark, r.place, r.disqualified, r.did_not_start, r.did_not_finish,
         te.name as event, me.gender, me.age_group,
         a.first_name, a.last_name, a.team, m.name as meet
  FROM results r
  JOIN entries e ON r.entry_id = e.id
  JOIN meet_events me ON e.meet_event_id = me.id
  JOIN meets m ON me.meet_id = m.id
  JOIN tf_events te ON me.tf_event_id = te.id
  JOIN athletes a ON e.athlete_id = a.id
  WHERE r.mark IS NOT NULL AND r.mark != ''
  LIMIT 8
`).all()
console.log('Sample results:')
sample.forEach(r => console.log(' ', r.first_name, r.last_name, '|', r.event, r.gender, r.age_group, '| mark:', r.mark, '| place:', r.place))

const recordsCount = db.prepare('SELECT COUNT(*) as n FROM records').get()
console.log('\nRecords table rows:', recordsCount.n)
