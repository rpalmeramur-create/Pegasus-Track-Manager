/**
 * Shared in-memory store for browser-preview (no Electron) usage.
 * Both Roster.jsx and Meets.jsx import from here so they operate on
 * the same athlete list.  In production Electron the real SQLite DB
 * is used instead, so this file is never loaded by the main process.
 */

let _nextId = 1
export const nextId = () => _nextId++

const _calcAge = (dob) =>
  Math.floor((Date.now() - new Date(dob + 'T00:00:00')) / (365.25 * 24 * 3600 * 1000))

export const athletes  = []
export const practices = []

export const practiceApi = {
  getUpcomingSchedule: () => {
    const today = new Date().toISOString().slice(0, 10)
    const items = practices
      .filter(p => p.date >= today)
      .map(p => ({ ...p, item_type: 'practice' }))
    return Promise.resolve(items.sort((a, b) => a.date.localeCompare(b.date)).slice(0, 10))
  },
  createPractice: (data) => {
    const p = { id: nextId(), ...data, created_at: new Date().toISOString() }
    practices.push(p)
    return Promise.resolve(p)
  },
  deletePractice: (id) => {
    const i = practices.findIndex(p => p.id === id)
    if (i >= 0) practices.splice(i, 1)
    return Promise.resolve({ success: true })
  },
}

export const athleteApi = {
  getAthletes: () =>
    Promise.resolve(
      athletes
        .filter(a => a.active)
        .map(a => ({ ...a, age: _calcAge(a.date_of_birth) }))
    ),

  createAthlete: (data) => {
    const a = { id: nextId(), ...data, active: 1, created_at: new Date().toISOString() }
    athletes.push(a)
    return Promise.resolve({ ...a, age: _calcAge(a.date_of_birth) })
  },

  updateAthlete: (id, data) => {
    const i = athletes.findIndex(a => a.id === id)
    if (i >= 0) athletes[i] = { ...athletes[i], ...data }
    const a = athletes[i]
    return Promise.resolve(a ? { ...a, age: _calcAge(a.date_of_birth) } : {})
  },

  deleteAthlete: (id) => {
    const a = athletes.find(a => a.id === id)
    if (a) a.active = 0
    return Promise.resolve({ success: true })
  },

  getAthletePRs: () => Promise.resolve([]),
}
