const KEY = 'pegasus-auto-print'
export function getAutoPrint() { return localStorage.getItem(KEY) === 'true' }
export function setAutoPrint(val) { localStorage.setItem(KEY, val ? 'true' : 'false') }
