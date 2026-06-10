// Run with: npx electron scripts/query-meets.cjs --no-sandbox
const { app } = require('electron')
app.whenReady().then(() => {
  const Database = require('better-sqlite3')
  const db = new Database('C:\\Users\\Ranso\\AppData\\Roaming\\pegasus-track\\pegasus-track.db', { readonly: true })

  // Check the TCL-imported meet specifically
  const meet = db.prepare("SELECT * FROM meets WHERE id=13").get()
  console.log('=== TCL MEET ===')
  console.log(JSON.stringify(meet, null, 2))

  console.log('\n=== MEET EVENTS (with tf_events JOIN) ===')
  const events = db.prepare(`
    SELECT me.id, me.tf_event_id, me.gender, me.age_group, me.round,
           e.name AS event_name
    FROM meet_events me
    LEFT JOIN tf_events e ON e.id = me.tf_event_id
    WHERE me.meet_id = 13
    ORDER BY me.id LIMIT 20
  `).all()
  console.log(`  ${events.length} events (LEFT JOIN)`)
  for (const ev of events) {
    const matched = ev.event_name ? '✓' : '✗ NO MATCH'
    console.log(`  [${ev.id}] tf_event_id=${ev.tf_event_id} ${matched} "${ev.event_name ?? '???'}" ${ev.gender} ${ev.age_group ?? ''} ${ev.round}`)
  }

  console.log('\n=== INNER JOIN (what app sees) ===')
  const innerEvents = db.prepare(`
    SELECT me.id, me.tf_event_id, e.name AS event_name, me.gender, me.age_group
    FROM meet_events me JOIN tf_events e ON me.tf_event_id = e.id
    WHERE me.meet_id = 13
  `).all()
  console.log(`  ${innerEvents.length} events visible to app`)

  console.log('\n=== TOTAL meet_events for meet 13 ===')
  const total = db.prepare('SELECT COUNT(*) cnt FROM meet_events WHERE meet_id=13').get()
  console.log(`  ${total.cnt} total rows`)

  console.log('\n=== ENTRIES for meet 13 ===')
  const entries = db.prepare(`SELECT COUNT(*) cnt FROM entries e JOIN meet_events me ON me.id = e.meet_event_id WHERE me.meet_id=13`).get()
  console.log(`  ${entries.cnt} total entries`)

  db.close()
  app.quit()
})
