const KEY = 'pegasus-auto-print'
export function getAutoPrint() { return localStorage.getItem(KEY) === 'true' }
export function setAutoPrint(val) { localStorage.setItem(KEY, val ? 'true' : 'false') }

const LABEL_FMT_KEY = 'pegasus-default-label-format'
export function getDefaultLabelFormat() { return localStorage.getItem(LABEL_FMT_KEY) || 'thermal1x4' }
export function setDefaultLabelFormat(val) { localStorage.setItem(LABEL_FMT_KEY, val) }

const HS_BREAK_KEY = 'pegasus-default-hs-pagebreak'
export function getDefaultHeatSheetPageBreak() { return localStorage.getItem(HS_BREAK_KEY) || 'event' }
export function setDefaultHeatSheetPageBreak(val) { localStorage.setItem(HS_BREAK_KEY, val) }
