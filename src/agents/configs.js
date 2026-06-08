// ─── Agent Configurations ────────────────────────────────
// One entry per route. AgentPanel falls back to DEFAULT_AGENT_CONFIG for any
// route not listed here — so new tabs get an agent automatically.
// To add a specialized agent for a new tab, add its route path as a key below.

const BASE = `You are an AI coaching assistant for Pegasus Track, a youth track & field club (~200 athletes, ages 5–18). The head coach is using a desktop management app called Pegasus Track. Be concise, practical, and knowledgeable about track & field. Avoid unnecessary preamble.`

export const AGENT_CONFIGS = {
  '/': {
    name: 'Dashboard',
    icon: '📊',
    intro: 'Ask me about your team stats, upcoming meets, or performance trends.',
    systemPrompt: `${BASE} You are currently on the Dashboard page showing overall team statistics, upcoming meets, and recent results.`,
    getContext: async (api) => {
      try {
        const stats = await api.getDashboardStats?.()
        if (!stats) return ''
        return `Dashboard stats: ${JSON.stringify(stats)}`
      } catch { return '' }
    },
  },

  '/roster': {
    name: 'Roster',
    icon: '👥',
    intro: 'Ask me about athletes, age groups, team composition, or athlete management.',
    systemPrompt: `${BASE} You are on the Roster page. You have access to the current athlete list with names, ages, genders, and team affiliations.`,
    getContext: async (api) => {
      try {
        const athletes = await api.getAthletes?.() ?? []
        const byGender = athletes.reduce((a, x) => { a[x.gender ?? '?'] = (a[x.gender ?? '?'] || 0) + 1; return a }, {})
        const teams    = [...new Set(athletes.map(a => a.team).filter(Boolean))]
        return `Roster: ${athletes.length} athletes. Gender breakdown: ${JSON.stringify(byGender)}. Teams: ${teams.join(', ') || 'none'}.`
      } catch { return '' }
    },
  },

  '/meets': {
    name: 'Meets',
    icon: '🏁',
    intro: 'Ask me about meet planning, event results, heat sheets, or scoring.',
    systemPrompt: `${BASE} You are on the Meets page. You have access to all meets with their statuses, dates, and locations.`,
    getContext: async (api) => {
      try {
        const meets = await api.getMeets?.() ?? []
        const active    = meets.filter(m => m.status === 'active' || m.status === 'in_progress')
        const upcoming  = meets.filter(m => m.status === 'upcoming')
        const completed = meets.filter(m => m.status === 'completed')
        return `Meets: ${meets.length} total — ${active.length} active/in-progress, ${upcoming.length} upcoming, ${completed.length} completed.` +
          (active.length ? ` Active: ${active.map(m => m.name).join(', ')}.` : '') +
          (upcoming.length ? ` Next upcoming: ${upcoming[0].name} on ${upcoming[0].date}.` : '')
      } catch { return '' }
    },
  },

  '/calendar': {
    name: 'Calendar',
    icon: '📅',
    intro: 'Ask me about scheduling practices, managing the competition calendar, or training periodization.',
    systemPrompt: `${BASE} You are on the Calendar page showing practices and upcoming competition schedule.`,
    getContext: async (api) => {
      try {
        const [schedule, practices] = await Promise.all([
          api.getUpcomingSchedule?.() ?? [],
          api.getPractices?.() ?? [],
        ])
        return `Upcoming schedule: ${schedule.length} items. Practices scheduled: ${practices.length}.`
      } catch { return '' }
    },
  },

  '/results': {
    name: 'Results',
    icon: '🏆',
    intro: 'Ask me about performance trends, personal records, or comparing athletes across events.',
    systemPrompt: `${BASE} You are on the Results / Records page. Help interpret performance data, PRs, and age-group benchmarks.`,
    getContext: async (api) => {
      try {
        const athletes = await api.getAthletes?.() ?? []
        return `Results view — ${athletes.length} athletes in roster to analyze.`
      } catch { return '' }
    },
  },

  '/records': {
    name: 'Records',
    icon: '📈',
    intro: 'Ask me about all-time club bests, age-group standards, or performance benchmarks.',
    systemPrompt: `${BASE} You are on the Club Records page showing all-time performance bests by event and age group.`,
    getContext: async () => '',
  },

  '/settings': {
    name: 'Settings',
    icon: '⚙️',
    intro: 'Ask me about configuring cloud sync, the parent portal, or managing seasons.',
    systemPrompt: `${BASE} You are on the Settings page. Help the coach configure Supabase cloud sync, the parent portal, seasons, and the Claude AI API key. Keep technical explanations simple.`,
    getContext: async () => '',
  },
}

// Fallback for any route not in AGENT_CONFIGS (covers future tabs automatically)
export const DEFAULT_AGENT_CONFIG = {
  name: 'Pegasus AI',
  icon: '⚡',
  intro: 'Ask me anything about managing your track club.',
  systemPrompt: `${BASE}`,
  getContext: async () => '',
}
