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
  // Strip only undefined — allow null/empty to explicitly clear a saved key
  const clean = Object.fromEntries(
    Object.entries(updates).filter(([, v]) => v !== undefined)
  )
  const next = { ...current, ...clean }
  fs.writeFileSync(getPath(), JSON.stringify(next, null, 2), 'utf8')
  return next
}

module.exports = { readSettings, writeSettings }
