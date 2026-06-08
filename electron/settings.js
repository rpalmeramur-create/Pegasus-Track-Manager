const path = require('path')
const fs   = require('fs')
const { app } = require('electron')

function getPath() {
  return path.join(app.getPath('userData'), 'settings.json')
}

function readSettings() {
  const p = getPath()
  if (!fs.existsSync(p)) return {}
  try { return JSON.parse(fs.readFileSync(p, 'utf8')) }
  catch { return {} }
}

function writeSettings(updates) {
  const current = readSettings()
  // Strip undefined/null so we never silently delete a saved key
  const clean = Object.fromEntries(
    Object.entries(updates).filter(([, v]) => v !== undefined && v !== null && v !== '')
  )
  const next = { ...current, ...clean }
  fs.writeFileSync(getPath(), JSON.stringify(next, null, 2), 'utf8')
  return next
}

module.exports = { readSettings, writeSettings }
