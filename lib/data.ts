import type { DayInput } from './types'

export interface SeedWeek {
  weekId: string
  days: Partial<DayInput>[]
}

const E = { ellow_dms:0, ellow_convos:0, ellow_booked:0, edv_dials:0, edv_convos:0, edv_booked:0, atl_dials:0, atl_convos:0, atl_booked:0, pikz_visits:0, pikz_plays:0, pikz_apps_org:0, pikz_apps_meta:0, lobo_shown:0, lobo_closed:0, lobo_whop_rev:0, lobo_hotmart_rev:0, edv_dq:0, atl_dq:0, lobo_dq:0 }

export const SEED_DATA: SeedWeek[] = [
  {
    weekId: '2026-04-07',
    days: [
      { ellow_dms:58, ellow_convos:14, ellow_booked:2, edv_dials:10, edv_convos:6, edv_booked:1, atl_dials:9,  atl_convos:5, atl_booked:1, lobo_shown:1, lobo_closed:0, lobo_whop_rev:0,     lobo_hotmart_rev:0, edv_dq:1, atl_dq:1, lobo_dq:0 },
      { ellow_dms:62, ellow_convos:15, ellow_booked:2, edv_dials:11, edv_convos:7, edv_booked:1, atl_dials:10, atl_convos:6, atl_booked:1, lobo_shown:0, lobo_closed:0, lobo_whop_rev:0,     lobo_hotmart_rev:0, edv_dq:1, atl_dq:1, lobo_dq:0 },
      { ellow_dms:55, ellow_convos:12, ellow_booked:1, edv_dials:8,  edv_convos:5, edv_booked:1, atl_dials:8,  atl_convos:4, atl_booked:0, lobo_shown:2, lobo_closed:1, lobo_whop_rev:19500, lobo_hotmart_rev:0, edv_dq:1, atl_dq:0, lobo_dq:0 },
      { ellow_dms:60, ellow_convos:14, ellow_booked:2, edv_dials:10, edv_convos:6, edv_booked:1, atl_dials:10, atl_convos:6, atl_booked:1, lobo_shown:1, lobo_closed:1, lobo_whop_rev:25000, lobo_hotmart_rev:0, edv_dq:1, atl_dq:1, lobo_dq:0 },
      { ellow_dms:45, ellow_convos:13, ellow_booked:1, edv_dials:9,  edv_convos:6, edv_booked:1, atl_dials:8,  atl_convos:6, atl_booked:1, lobo_shown:1, lobo_closed:0, lobo_whop_rev:0,     lobo_hotmart_rev:0, edv_dq:1, atl_dq:1, lobo_dq:0 },
      E, E,
    ]
  },
  {
    weekId: '2026-04-14',
    days: [
      { ellow_dms:65, ellow_convos:17, ellow_booked:2, edv_dials:12, edv_convos:8, edv_booked:1, atl_dials:11, atl_convos:7, atl_booked:1, lobo_shown:2, lobo_closed:1, lobo_whop_rev:19500, lobo_hotmart_rev:0,     edv_dq:1, atl_dq:1, lobo_dq:0 },
      { ellow_dms:70, ellow_convos:18, ellow_booked:3, edv_dials:13, edv_convos:8, edv_booked:1, atl_dials:12, atl_convos:8, atl_booked:1, lobo_shown:2, lobo_closed:1, lobo_whop_rev:15000, lobo_hotmart_rev:0,     edv_dq:1, atl_dq:1, lobo_dq:0 },
      { ellow_dms:68, ellow_convos:16, ellow_booked:2, edv_dials:12, edv_convos:8, edv_booked:2, atl_dials:11, atl_convos:7, atl_booked:1, lobo_shown:2, lobo_closed:1, lobo_whop_rev:19500, lobo_hotmart_rev:5500,  edv_dq:2, atl_dq:1, lobo_dq:1 },
      { ellow_dms:72, ellow_convos:20, ellow_booked:2, edv_dials:14, edv_convos:9, edv_booked:1, atl_dials:13, atl_convos:8, atl_booked:2, lobo_shown:2, lobo_closed:2, lobo_whop_rev:19500, lobo_hotmart_rev:19500, edv_dq:1, atl_dq:1, lobo_dq:0 },
      { ellow_dms:65, ellow_convos:18, ellow_booked:2, edv_dials:14, edv_convos:8, edv_booked:2, atl_dials:13, atl_convos:7, atl_booked:1, lobo_shown:1, lobo_closed:0, lobo_whop_rev:0,     lobo_hotmart_rev:0,     edv_dq:1, atl_dq:1, lobo_dq:0 },
      E, E,
    ]
  },
  {
    weekId: '2026-04-21',
    days: [
      { ellow_dms:75, ellow_convos:20, ellow_booked:3, edv_dials:14, edv_convos:9, edv_booked:1, atl_dials:13, atl_convos:8, atl_booked:2, lobo_shown:2, lobo_closed:1, lobo_whop_rev:19500, lobo_hotmart_rev:0,     edv_dq:1, atl_dq:1, lobo_dq:0 },
      { ellow_dms:72, ellow_convos:19, ellow_booked:2, edv_dials:14, edv_convos:9, edv_booked:2, atl_dials:14, atl_convos:9, atl_booked:1, lobo_shown:3, lobo_closed:2, lobo_whop_rev:25000, lobo_hotmart_rev:19500, edv_dq:2, atl_dq:1, lobo_dq:0 },
      { ellow_dms:80, ellow_convos:21, ellow_booked:3, edv_dials:14, edv_convos:9, edv_booked:2, atl_dials:14, atl_convos:9, atl_booked:2, lobo_shown:2, lobo_closed:1, lobo_whop_rev:25000, lobo_hotmart_rev:0,     edv_dq:1, atl_dq:1, lobo_dq:1 },
      { ellow_dms:78, ellow_convos:20, ellow_booked:3, edv_dials:14, edv_convos:9, edv_booked:1, atl_dials:14, atl_convos:9, atl_booked:1, lobo_shown:2, lobo_closed:2, lobo_whop_rev:19500, lobo_hotmart_rev:19500, edv_dq:1, atl_dq:2, lobo_dq:0 },
      { ellow_dms:85, ellow_convos:18, ellow_booked:2, edv_dials:14, edv_convos:8, edv_booked:1, atl_dials:13, atl_convos:8, atl_booked:1, lobo_shown:2, lobo_closed:1, lobo_whop_rev:19500, lobo_hotmart_rev:0,     edv_dq:1, atl_dq:1, lobo_dq:0 },
      E, E,
    ]
  },
  {
    weekId: '2026-04-28',
    days: [
      { ellow_dms:58, ellow_convos:14, ellow_booked:2, edv_dials:10, edv_convos:6, edv_booked:1, atl_dials:10, atl_convos:6, atl_booked:1, lobo_shown:2, lobo_closed:1, lobo_whop_rev:19500, lobo_hotmart_rev:0, edv_dq:1, atl_dq:1, lobo_dq:0 },
      { ellow_dms:62, ellow_convos:16, ellow_booked:2, edv_dials:11, edv_convos:7, edv_booked:1, atl_dials:11, atl_convos:7, atl_booked:1, lobo_shown:2, lobo_closed:1, lobo_whop_rev:25000, lobo_hotmart_rev:0, edv_dq:1, atl_dq:1, lobo_dq:0 },
      { ellow_dms:55, ellow_convos:13, ellow_booked:1, edv_dials:10, edv_convos:5, edv_booked:1, atl_dials:10, atl_convos:6, atl_booked:1, lobo_shown:1, lobo_closed:0, lobo_whop_rev:0,     lobo_hotmart_rev:0, edv_dq:1, atl_dq:1, lobo_dq:0 },
      { ellow_dms:60, ellow_convos:15, ellow_booked:2, edv_dials:10, edv_convos:6, edv_booked:1, atl_dials:10, atl_convos:6, atl_booked:1, lobo_shown:2, lobo_closed:1, lobo_whop_rev:15000, lobo_hotmart_rev:0, edv_dq:1, atl_dq:0, lobo_dq:1 },
      E, E, E,
    ]
  },
]

export function getSeedWeek(weekId: string): SeedWeek | undefined {
  return SEED_DATA.find(w => w.weekId === weekId)
}

export function getMondayId(date: Date = new Date()): string {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay() || 7
  if (day !== 1) d.setDate(d.getDate() - day + 1)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

export function addWeeks(weekId: string, n: number): string {
  const d = new Date(weekId + 'T00:00:00')
  d.setDate(d.getDate() + n * 7)
  return getMondayId(d)
}

export function weekNum(weekId: string): number {
  const d = new Date(weekId + 'T00:00:00')
  d.setDate(d.getDate() + 4 - (d.getDay() || 7))
  return Math.ceil(((d.getTime() - new Date(d.getFullYear(), 0, 1).getTime()) / 86400000 + 1) / 7)
}

export function weekLabel(weekId: string): string {
  const mon = new Date(weekId + 'T00:00:00')
  const sun = new Date(mon)
  sun.setDate(mon.getDate() + 6)
  const f = (d: Date) => `${d.getDate()}/${d.getMonth() + 1}`
  return `${f(mon)} – ${f(sun)} ${sun.getFullYear()}`
}
