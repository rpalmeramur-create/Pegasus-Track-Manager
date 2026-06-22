export const THEMES = [
  { id: 'night',    label: 'Night',    bg: '#08091a', accent: '#38bdf8' },
  { id: 'midnight', label: 'Midnight', bg: '#07070d', accent: '#a855f7' },
  { id: 'slate',    label: 'Slate',    bg: '#101418', accent: '#14b8a6' },
  { id: 'ember',    label: 'Ember',    bg: '#0f0c09', accent: '#fb923c' },
  { id: 'gray',     label: 'Gray',     bg: '#d6dfe9', accent: '#0ea5e9' },
  { id: 'light',    label: 'Light',    bg: '#eef2f7', accent: '#0ea5e9' },
]

const KEY = 'pegasus-theme'

export function getSavedTheme() {
  return localStorage.getItem(KEY) || 'night'
}

export function applyTheme(id) {
  const valid = THEMES.find(t => t.id === id)?.id || 'night'
  document.documentElement.setAttribute('data-theme', valid)
  localStorage.setItem(KEY, valid)
}
