const path = require('path')
const Database = require('better-sqlite3')
const db = new Database(path.join(process.env.APPDATA, 'pegasus-track', 'pegasus-track.db'))

const before = db.prepare('SELECT COUNT(*) as n FROM athletes WHERE active=1').get()
console.log('Active athletes before restore:', before.n)

const inactive = db.prepare('SELECT COUNT(*) as n FROM athletes WHERE active=0').get()
console.log('Soft-deleted athletes to restore:', inactive.n)

db.prepare("UPDATE athletes SET active=1 WHERE active=0").run()

const after = db.prepare('SELECT COUNT(*) as n FROM athletes WHERE active=1').get()
console.log('Active athletes after restore:', after.n)
console.log('Done.')
