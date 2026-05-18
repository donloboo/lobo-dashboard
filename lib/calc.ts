import type { DayInput, CalcDay } from './types'

export const AOV = 19500
const WHOP = 0.037

function ratio(a: number, b: number): number | null {
  return b > 0 ? a / b : null
}

export function calcDay(d: Partial<DayInput> = {}): CalcDay {
  const n = (v?: number) => v ?? 0

  const ed = n(d.ellow_dms), ec = n(d.ellow_convos), eb = n(d.ellow_booked)
  const edvD = n(d.edv_dials), edvC = n(d.edv_convos), edvB = n(d.edv_booked)
  const atlD = n(d.atl_dials), atlC = n(d.atl_convos), atlB = n(d.atl_booked)
  const pV = n(d.pikz_visits), pP = n(d.pikz_plays)
  const pAO = n(d.pikz_apps_org), pAM = n(d.pikz_apps_meta)
  const lSh = n(d.lobo_shown), lNS = d.lobo_noshow, lC = n(d.lobo_closed)
  const whop    = n(d.lobo_whop_rev)
  const hotmart = n(d.lobo_hotmart_rev)
  const edvDQ = n(d.edv_dq), atlDQ = n(d.atl_dq), loboDQ = n(d.lobo_dq)

  const teamDials = edvD + atlD
  const teamBooked = eb + edvB + atlB
  // Om call reports finns (lobo_noshow är satt), använd faktisk data — annars faller tillbaka på teamets bokningar
  const lobo_sched = lNS !== undefined ? lSh + lNS : teamBooked

  return {
    ellow_dms: ed, ellow_convos: ec, ellow_booked: eb,
    edv_dials: edvD, edv_convos: edvC, edv_booked: edvB,
    atl_dials: atlD, atl_convos: atlC, atl_booked: atlB,
    pikz_visits: pV, pikz_plays: pP,
    pikz_apps_org: pAO, pikz_apps_meta: pAM,
    lobo_shown: lSh, lobo_closed: lC,
    lobo_whop_rev: whop, lobo_hotmart_rev: hotmart,

    ellow_resp_rate: ratio(ec, ed),
    ellow_book_rate: ratio(eb, ec),
    edv_conn: ratio(edvC, edvD),
    edv_c2b:  ratio(edvB, edvD),
    atl_conn: ratio(atlC, atlD),
    atl_c2b:  ratio(atlB, atlD),

    team_dials:  teamDials,
    team_convos: ec + edvC + atlC,
    team_booked: teamBooked,
    team_conn: ratio(edvC + atlC, teamDials),
    team_c2b:  ratio(edvB + atlB, teamDials),

    pikz_play_r: ratio(pP, pV),
    pikz_apps_tot: pAO + pAM,

    lobo_sched,
    lobo_noshows:  lobo_sched - lSh,
    lobo_show_r:   ratio(lSh, lobo_sched),
    lobo_close_r:  ratio(lC, lobo_sched),
    lobo_total_rev: whop + hotmart,
    lobo_net: whop * 0.963 + hotmart * 0.70,

    edv_dq: edvDQ, atl_dq: atlDQ, lobo_dq: loboDQ,
    edv_dq_rate:  ratio(edvDQ, edvC),
    atl_dq_rate:  ratio(atlDQ, atlC),
    lobo_dq_rate: ratio(loboDQ, lSh),
    team_dq:      edvDQ + atlDQ,
    team_dq_rate: ratio(edvDQ + atlDQ, ec + edvC + atlC),
  }
}

export function sumDays(days: Partial<DayInput>[]): CalcDay {
  const keys: (keyof DayInput)[] = [
    'ellow_dms','ellow_convos','ellow_booked',
    'edv_dials','edv_convos','edv_booked',
    'atl_dials','atl_convos','atl_booked',
    'pikz_visits','pikz_plays','pikz_apps_org','pikz_apps_meta',
    'lobo_shown','lobo_noshow','lobo_closed','lobo_whop_rev','lobo_hotmart_rev',
    'edv_dq','atl_dq','lobo_dq',
  ]
  const sums: Partial<DayInput> = {}
  keys.forEach(k => { sums[k] = days.reduce((s, d) => s + (d?.[k] ?? 0), 0) })
  return calcDay(sums)
}

export function fmt(val: number | null | undefined, isRate?: boolean, isCurrency?: boolean): string {
  if (val === null || val === undefined) return '—'
  if (isRate) return (val * 100).toFixed(1) + '%'
  if (isCurrency) return Math.round(val).toLocaleString('sv-SE') + ' kr'
  return val.toLocaleString('sv-SE')
}

export function colorClass(val: number | null, target: number | undefined, isInverse?: boolean): string {
  if (val === null || val === undefined || !target) return 'text-zinc-600'
  const pct = val / target
  if (isInverse) {
    // lägre är bättre — grön om under mål
    if (pct <= 1.0)  return 'text-green-400'
    if (pct <= 1.25) return 'text-orange-400'
    return 'text-red-400'
  }
  if (pct >= 1.0) return 'text-green-400'
  if (pct >= 0.8) return 'text-orange-400'
  return 'text-red-400'
}
