/**
 * Pegasus Track — Supabase Sync Service
 *
 * Uses the service role key (bypasses RLS) to write data.
 * DOB is never synced — privacy protection for minors.
 */
const { createClient } = require('@supabase/supabase-js')
const ws = require('ws')

function makeClient(url, serviceKey) {
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { transport: ws },
  })
}

// ─── Test connection ──────────────────────────────────────────
async function testConnection(url, serviceKey) {
  const sb = makeClient(url, serviceKey)
  const { error } = await sb.from('seasons').select('id').limit(1)
  if (error) throw new Error(error.message)
  return true
}

// ─── Create / update parent auth account ─────────────────────
async function setupParentAccount(url, serviceKey, email, password) {
  const sb = makeClient(url, serviceKey)

  // Try to create first
  const { data, error } = await sb.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  // If already exists, update the password instead
  if (error && error.message.includes('already been registered')) {
    const { data: list } = await sb.auth.admin.listUsers()
    const existing = list?.users?.find(u => u.email === email)
    if (existing) {
      const { error: updateErr } = await sb.auth.admin.updateUserById(existing.id, { password })
      if (updateErr) throw new Error(updateErr.message)
      return { updated: true }
    }
  }

  if (error) throw new Error(error.message)
  return { created: true, userId: data?.user?.id }
}

// ─── Sync athletes (no DOB) ───────────────────────────────────
async function syncAthletes(db, sb) {
  const rows = db.prepare(
    'SELECT id, first_name, last_name, gender, athlete_number FROM athletes WHERE active = 1'
  ).all()
  if (!rows.length) return 0

  const { error } = await sb.from('athletes').upsert(
    rows.map(a => ({
      id: a.id,
      first_name: a.first_name,
      last_name: a.last_name,
      gender: a.gender,
      athlete_number: a.athlete_number || null,
      updated_at: new Date().toISOString(),
    }))
  )
  if (error) throw new Error(`Athletes: ${error.message}`)
  return rows.length
}

// ─── Sync tf_events ───────────────────────────────────────────
async function syncTfEvents(db, sb) {
  const rows = db.prepare('SELECT * FROM tf_events ORDER BY sort_order').all()
  if (!rows.length) return 0

  const { error } = await sb.from('tf_events').upsert(
    rows.map(e => ({
      id: e.id,
      name: e.name,
      abbreviation: e.abbreviation,
      category: e.category,
      measurement_unit: e.measurement_unit,
      is_relay: e.is_relay === 1,
      sort_order: e.sort_order,
    }))
  )
  if (error) throw new Error(`TF Events: ${error.message}`)
  return rows.length
}

// ─── Sync a season ────────────────────────────────────────────
async function syncSeason(db, sb, seasonId) {
  const s = db.prepare('SELECT * FROM seasons WHERE id = ?').get(seasonId)
  if (!s) throw new Error(`Season ${seasonId} not found`)

  const { error } = await sb.from('seasons').upsert({
    id: s.id, name: s.name, year: s.year,
    type: s.type, active: s.active === 1,
    updated_at: new Date().toISOString(),
  })
  if (error) throw new Error(`Season: ${error.message}`)
}

// ─── Publish a meet ───────────────────────────────────────────
async function publishMeet(db, sb, meetId, { heatSheets = false, results = false } = {}) {
  const meet = db.prepare('SELECT * FROM meets WHERE id = ?').get(meetId)
  if (!meet) throw new Error(`Meet ${meetId} not found`)

  // Always sync supporting tables first
  if (meet.season_id) await syncSeason(db, sb, meet.season_id)
  await syncAthletes(db, sb)
  await syncTfEvents(db, sb)

  // Upsert meet
  const { error: meetErr } = await sb.from('meets').upsert({
    id: meet.id,
    season_id: meet.season_id || null,
    name: meet.name,
    date: meet.date,
    location: meet.location || null,
    host: meet.host || null,
    type: meet.type || null,
    status: meet.status,
    heat_sheets_published: heatSheets,
    results_published: results,
    updated_at: new Date().toISOString(),
  })
  if (meetErr) throw new Error(`Meet: ${meetErr.message}`)

  // Meet events
  const meetEvents = db.prepare('SELECT * FROM meet_events WHERE meet_id = ?').all(meetId)
  if (meetEvents.length) {
    const { error } = await sb.from('meet_events').upsert(
      meetEvents.map(e => ({
        id: e.id, meet_id: e.meet_id, tf_event_id: e.tf_event_id,
        gender: e.gender, age_group: e.age_group || null,
        round: e.round, sort_order: e.sort_order,
      }))
    )
    if (error) throw new Error(`Meet events: ${error.message}`)
  }

  // Entries
  const meIds = meetEvents.map(e => e.id)
  let allEntries = []
  if (meIds.length) {
    const ph = meIds.map(() => '?').join(',')
    allEntries = db.prepare(`SELECT * FROM entries WHERE meet_event_id IN (${ph})`).all(...meIds)
    if (allEntries.length) {
      const { error } = await sb.from('entries').upsert(
        allEntries.map(e => ({
          id: e.id, meet_event_id: e.meet_event_id, athlete_id: e.athlete_id,
          seed_mark: e.seed_mark || null, heat: e.heat || null,
          lane: e.lane || null, scratched: e.scratched === 1,
        }))
      )
      if (error) throw new Error(`Entries: ${error.message}`)
    }
  }

  // Results (only if publishing results)
  if (results && allEntries.length) {
    const entryIds = allEntries.map(e => e.id)
    const ph = entryIds.map(() => '?').join(',')
    const rows = db.prepare(`SELECT * FROM results WHERE entry_id IN (${ph})`).all(...entryIds)
    if (rows.length) {
      const { error } = await sb.from('results').upsert(
        rows.map(r => ({
          id: r.id, entry_id: r.entry_id, mark: r.mark || null,
          place: r.place || null, wind: r.wind || null,
          disqualified: r.disqualified === 1, dq_reason: r.dq_reason || null,
          did_not_start: r.did_not_start === 1, did_not_finish: r.did_not_finish === 1,
        }))
      )
      if (error) throw new Error(`Results: ${error.message}`)
    }

    // Sync all PRs whenever results are published
    const prs = db.prepare('SELECT * FROM personal_records').all()
    if (prs.length) {
      const { error } = await sb.from('personal_records').upsert(
        prs.map(p => ({
          id: p.id, athlete_id: p.athlete_id, tf_event_id: p.tf_event_id,
          mark: p.mark, date: p.date || null, meet_id: p.meet_id || null,
          wind: p.wind || null, indoor: p.indoor === 1,
          updated_at: new Date().toISOString(),
        }))
      )
      if (error) throw new Error(`PRs: ${error.message}`)
    }
  }

  return { success: true }
}

// ─── Full initial sync ────────────────────────────────────────
async function fullSync(db, sb) {
  const athletes  = await syncAthletes(db, sb)
  const tfEvents  = await syncTfEvents(db, sb)

  // Sync all active seasons
  const seasons = db.prepare('SELECT * FROM seasons').all()
  for (const s of seasons) await syncSeason(db, sb, s.id)

  return { athletes, tfEvents, seasons: seasons.length }
}

module.exports = { makeClient, testConnection, setupParentAccount, publishMeet, fullSync }
