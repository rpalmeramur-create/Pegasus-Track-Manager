import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

const sb = (url && key) ? createClient(url, key) : null


export async function getMeetResults() {
  if (window.electronAPI) return window.electronAPI.getMeetResults()
  if (!sb) return []

  const { data: meets, error } = await sb
    .from('meets')
    .select('id, name, date, location, type')
    .eq('results_published', true)
    .order('date', { ascending: false })
    .limit(10)

  if (error || !meets) return []

  for (const meet of meets) {
    const { data: meetEvents } = await sb
      .from('meet_events')
      .select('id, gender, age_group, round, tf_events(name, category, measurement_unit, sort_order)')
      .eq('meet_id', meet.id)

    meet.events = []
    for (const me of (meetEvents || [])) {
      const { data: entries } = await sb
        .from('entries')
        .select('id, scratched, athletes(first_name, last_name, team), results(place, mark, wind, is_pr, did_not_start, did_not_finish, disqualified)')
        .eq('meet_event_id', me.id)
        .eq('scratched', false)

      const results = []
      for (const en of (entries || [])) {
        for (const r of (en.results || [])) {
          if (!r.place || r.place <= 0) continue
          if (r.did_not_start || r.did_not_finish || r.disqualified) continue
          results.push({
            place: r.place, mark: r.mark, wind: r.wind, is_pr: r.is_pr,
            first_name: en.athletes?.first_name,
            last_name: en.athletes?.last_name,
            team: en.athletes?.team,
          })
        }
      }
      if (!results.length) continue
      results.sort((a, b) => a.place - b.place)

      meet.events.push({
        id: me.id,
        gender: me.gender,
        age_group: me.age_group,
        round: me.round,
        event_name: me.tf_events?.name,
        category: me.tf_events?.category,
        measurement_unit: me.tf_events?.measurement_unit,
        sort_order: me.tf_events?.sort_order,
        results: results.slice(0, 20),
      })
    }
    meet.events.sort((a, b) =>
      (a.sort_order ?? 0) - (b.sort_order ?? 0) || (a.gender ?? '').localeCompare(b.gender ?? '')
    )
  }

  return meets
}

export async function getUpcomingSchedule() {
  if (window.electronAPI) return window.electronAPI.getUpcomingSchedule()
  if (!sb) return []

  const today = new Date().toISOString().slice(0, 10)
  const { data: meets } = await sb
    .from('meets')
    .select('id, name, date, location, type, status')
    .in('status', ['upcoming', 'active'])
    .gte('date', today)
    .order('date')
    .limit(10)

  return (meets || []).map(m => ({
    id: m.id, title: m.name, date: m.date, location: m.location,
    start_time: null, end_time: null, notes: null,
    item_type: 'meet', type: m.type, status: m.status,
  }))
}
