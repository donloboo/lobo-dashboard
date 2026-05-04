export interface DayInput {
  ellow_dms: number
  ellow_convos: number
  ellow_booked: number
  edv_dials: number
  edv_convos: number
  edv_booked: number
  atl_dials: number
  atl_convos: number
  atl_booked: number
  pikz_visits: number
  pikz_plays: number
  pikz_apps_org: number
  pikz_apps_meta: number
  lobo_shown: number
  lobo_noshow: number
  lobo_closed: number
  lobo_whop_rev: number    // manuell — Whop-intäkt
  lobo_hotmart_rev: number // manuell — Hotmart-intäkt
  edv_dq: number
  atl_dq: number
  lobo_dq: number
}

export interface CalcDay extends DayInput {
  ellow_resp_rate: number | null
  ellow_book_rate: number | null
  edv_conn: number | null
  edv_c2b: number | null
  atl_conn: number | null
  atl_c2b: number | null
  team_dials: number
  team_convos: number
  team_booked: number
  team_conn: number | null
  team_c2b: number | null
  pikz_play_r: number | null
  pikz_apps_tot: number
  lobo_sched: number      // auto = team_booked
  lobo_noshows: number
  lobo_show_r: number | null
  lobo_close_r: number | null
  lobo_total_rev: number  // Whop + Hotmart
  lobo_net: number        // (Whop × 0.963) + (Hotmart × 0.80)
  edv_dq_rate: number | null
  atl_dq_rate: number | null
  lobo_dq_rate: number | null
  team_dq: number
  team_dq_rate: number | null
}

export interface MetricDef {
  type: 'input' | 'calc' | 'section' | 'gap'
  id?: keyof CalcDay
  inputId?: keyof DayInput
  label?: string
  isRate?: boolean
  isCurrency?: boolean
  isInverse?: boolean
  targets?: { d: number; w: number }
}
