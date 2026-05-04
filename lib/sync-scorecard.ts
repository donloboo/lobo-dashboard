import fs from 'fs'
import path from 'path'

const DATA         = path.join(process.cwd(), 'data')
const CALL_FILE    = path.join(DATA, 'call-reports.json')
const DIALER_FILE  = path.join(DATA, 'dialer-reports.json')
const SETTER_FILE  = path.join(DATA, 'setter-reports.json')
const PIKZ_FILE    = path.join(DATA, 'pikz-reports.json')
const SC_FILE      = path.join(DATA, 'scorecard.json')

const DAY_KEYS = ['mon','tue','wed','thu','fri','sat','sun'] as const

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function readJson<T>(file: string, fallback: T): T {
  try { return JSON.parse(fs.readFileSync(file, 'utf-8')) } catch { return fallback }
}

function getMondayId(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const day = d.getDay() || 7
  if (day !== 1) d.setDate(d.getDate() - day + 1)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

function getDayKey(dateStr: string): typeof DAY_KEYS[number] {
  const d = new Date(dateStr + 'T00:00:00')
  return DAY_KEYS[(d.getDay() + 6) % 7]
}

function ensureDataDir() {
  fs.mkdirSync(DATA, { recursive: true })
  const defaults: Record<string, string> = {
    [CALL_FILE]:   '[]',
    [DIALER_FILE]: '[]',
    [SETTER_FILE]: '[]',
    [PIKZ_FILE]:   '[]',
    [SC_FILE]:     '{}',
  }
  for (const [file, init] of Object.entries(defaults)) {
    if (!fs.existsSync(file)) fs.writeFileSync(file, init)
  }
}

export function syncScorecard() {
  ensureDataDir()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const callReports   = readJson<any[]>(CALL_FILE,   [])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dialerReports = readJson<any[]>(DIALER_FILE, [])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const setterReports = readJson<any[]>(SETTER_FILE, [])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pikzReports   = readJson<any[]>(PIKZ_FILE,   [])
  const scorecard     = readJson<Record<string, Record<string, Record<string, number>>>>(SC_FILE, {})

  const allDates = new Set<string>()
  callReports.forEach(r => r.date && allDates.add(r.date))
  dialerReports.forEach(r => r.date && allDates.add(r.date))
  setterReports.forEach(r => r.date && allDates.add(r.date))
  pikzReports.forEach(r => r.date && allDates.add(r.date))

  for (const date of Array.from(allDates)) {
    const weekId = getMondayId(date)
    const dayKey = getDayKey(date)

    const calls   = callReports.filter(r => r.date === date)
    const dialers = dialerReports.filter(r => r.date === date)
    const setters = setterReports.filter(r => r.date === date)
    const pikzs   = pikzReports.filter(r => r.date === date)

    if (!scorecard[weekId]) scorecard[weekId] = {}
    if (!scorecard[weekId][dayKey]) scorecard[weekId][dayKey] = {}
    const day = scorecard[weekId][dayKey]

    // --- Lobo (call reports) ---
    if (calls.length > 0) {
      day.lobo_shown  = calls.filter(r => r.outcome !== 'noshow').length
      day.lobo_noshow = calls.filter(r => r.outcome === 'noshow').length
      day.lobo_closed = calls.filter(r => r.outcome === 'closed_pif' || r.outcome === 'closed_partial').length
      day.lobo_dq     = calls.filter(r => r.outcome === 'no_value'   || r.outcome === 'not_serious').length

      let whop = 0, hotmart = 0
      for (const r of calls) {
        if (!r.platform) continue
        const amt =
          r.outcome === 'closed_pif'     ? (r.amount   ?? 0) :
          r.outcome === 'closed_partial' ? (r.paid_now ?? 0) :
          r.outcome === 'upsell'         ? (r.amount   ?? 0) : 0
        if (r.platform === 'whop')    whop    += amt
        if (r.platform === 'hotmart') hotmart += amt
      }
      if (whop    > 0) { day.lobo_whop_rev    = whop    } else { delete day.lobo_whop_rev }
      if (hotmart > 0) { day.lobo_hotmart_rev = hotmart } else { delete day.lobo_hotmart_rev }
    }

    // --- Edvard (dialer reports) ---
    const edv = dialers.filter(r => r.dialer === 'Edvard')
    if (edv.length > 0) {
      day.edv_dials  = edv.length
      day.edv_convos = edv.filter(r => r.outcome !== 'no_answer').length
      day.edv_booked = edv.filter(r => r.outcome === 'booked').length
      day.edv_dq     = edv.filter(r => r.outcome === 'dq').length
    }

    // --- Atlassi (dialer reports) ---
    const atl = dialers.filter(r => r.dialer === 'Atlassi')
    if (atl.length > 0) {
      day.atl_dials  = atl.length
      day.atl_convos = atl.filter(r => r.outcome !== 'no_answer').length
      day.atl_booked = atl.filter(r => r.outcome === 'booked').length
      day.atl_dq     = atl.filter(r => r.outcome === 'dq').length
    }

    // --- Ellow (setter reports) ---
    if (setters.length > 0) {
      day.ellow_dms    = setters.reduce((s, r) => s + (r.dms_sent ?? 0), 0)
      day.ellow_convos = setters.reduce((s, r) => s + (r.convos   ?? 0), 0)
      day.ellow_booked = setters.reduce((s, r) => s + (r.booked   ?? 0), 0)
    }

    // --- Pikz (pikz reports) ---
    if (pikzs.length > 0) {
      day.pikz_visits    = pikzs.reduce((s, r) => s + (r.vsl_visits ?? 0), 0)
      day.pikz_plays     = pikzs.reduce((s, r) => s + (r.vsl_plays  ?? 0), 0)
      day.pikz_apps_org  = pikzs.reduce((s, r) => s + (r.apps_org   ?? 0), 0)
      day.pikz_apps_meta = pikzs.reduce((s, r) => s + (r.apps_meta  ?? 0), 0)
    }
  }

  fs.writeFileSync(SC_FILE, JSON.stringify(scorecard, null, 2))
}
