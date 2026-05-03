'use client'
import { useState, useEffect, useCallback } from 'react'
import { calcDay, sumDays, fmt, colorClass } from '@/lib/calc'
import { getSeedWeek, getMondayId, addWeeks, weekNum, weekLabel } from '@/lib/data'
import type { DayInput, CalcDay, MetricDef } from '@/lib/types'

const DAYS = ['mon','tue','wed','thu','fri','sat','sun'] as const
type DayKey = typeof DAYS[number]
type WeekState = Record<DayKey, Partial<DayInput>>

const INPUT_KEYS: (keyof DayInput)[] = [
  'ellow_dms','ellow_convos','ellow_booked',
  'edv_dials','edv_convos','edv_booked',
  'atl_dials','atl_convos','atl_booked',
  'pikz_visits','pikz_plays','pikz_apps_org','pikz_apps_meta',
  'lobo_shown','lobo_closed','lobo_whop_rev','lobo_hotmart_rev',
  'edv_dq','atl_dq','lobo_dq',
]

const SCHEMA: MetricDef[] = [
  { type:'section', label:'Ellow — DM Setter' },
  { type:'input',  id:'ellow_dms',       inputId:'ellow_dms',       label:'DMs Sent',         targets:{d:60,  w:420} },
  { type:'input',  id:'ellow_convos',    inputId:'ellow_convos',    label:'Conversations',     targets:{d:15,  w:105} },
  { type:'input',  id:'ellow_booked',    inputId:'ellow_booked',    label:'Booked',            targets:{d:2,   w:14}  },
  { type:'calc',   id:'ellow_resp_rate', label:'Response Rate %',   isRate:true,  targets:{d:.25, w:.25} },
  { type:'calc',   id:'ellow_book_rate', label:'Booking Rate %',    isRate:true,  targets:{d:.15, w:.15} },
  { type:'gap' },
  { type:'section', label:'Edvard — Dialer' },
  { type:'input',  id:'edv_dials',   inputId:'edv_dials',   label:'Dials',             targets:{d:10, w:70} },
  { type:'input',  id:'edv_convos',  inputId:'edv_convos',  label:'Conversations',     targets:{d:6,  w:42} },
  { type:'input',  id:'edv_booked',  inputId:'edv_booked',  label:'Booked',            targets:{d:1,  w:7}  },
  { type:'calc',   id:'edv_conn',     label:'Connection Rate %',    isRate:true, targets:{d:.60, w:.60} },
  { type:'calc',   id:'edv_c2b',      label:'Connect-to-Book %',    isRate:true, targets:{d:.20, w:.20} },
  { type:'input',  id:'edv_dq',       inputId:'edv_dq',             label:'DQ' },
  { type:'calc',   id:'edv_dq_rate',  label:'DQ Rate %',            isRate:true, isInverse:true, targets:{d:.15, w:.15} },
  { type:'gap' },
  { type:'section', label:'Atlassi — Dialer' },
  { type:'input',  id:'atl_dials',   inputId:'atl_dials',   label:'Dials',             targets:{d:10, w:70} },
  { type:'input',  id:'atl_convos',  inputId:'atl_convos',  label:'Conversations',     targets:{d:6,  w:42} },
  { type:'input',  id:'atl_booked',  inputId:'atl_booked',  label:'Booked',            targets:{d:1,  w:7}  },
  { type:'calc',   id:'atl_conn',     label:'Connection Rate %',    isRate:true, targets:{d:.60, w:.60} },
  { type:'calc',   id:'atl_c2b',      label:'Connect-to-Book %',    isRate:true, targets:{d:.20, w:.20} },
  { type:'input',  id:'atl_dq',       inputId:'atl_dq',             label:'DQ' },
  { type:'calc',   id:'atl_dq_rate',  label:'DQ Rate %',            isRate:true, isInverse:true, targets:{d:.15, w:.15} },
  { type:'gap' },
  { type:'section', label:'Team Setter — Totalt' },
  { type:'calc',   id:'team_dials',  label:'Total Dials',           targets:{d:20,  w:140} },
  { type:'calc',   id:'team_convos', label:'Total Conversations',   targets:{d:27,  w:189} },
  { type:'calc',   id:'team_booked', label:'Total Booked',          targets:{d:4,   w:28}  },
  { type:'calc',   id:'team_conn',     label:'Avg Connection Rate',  isRate:true, targets:{d:.60, w:.60} },
  { type:'calc',   id:'team_c2b',      label:'Avg Connect-to-Book',  isRate:true, targets:{d:.20, w:.20} },
  { type:'calc',   id:'team_dq',       label:'Total DQ' },
  { type:'calc',   id:'team_dq_rate',  label:'Avg DQ Rate %',        isRate:true, isInverse:true, targets:{d:.15, w:.15} },
  { type:'gap' },
  { type:'section', label:'Pikz — Call Funnel' },
  { type:'input',  id:'pikz_visits',    inputId:'pikz_visits',    label:'VSL Page Visits' },
  { type:'input',  id:'pikz_plays',     inputId:'pikz_plays',     label:'VSL Plays' },
  { type:'calc',   id:'pikz_play_r',    label:'VSL Play Rate %',   isRate:true },
  { type:'input',  id:'pikz_apps_org',  inputId:'pikz_apps_org',  label:'Applications (Organic)' },
  { type:'input',  id:'pikz_apps_meta', inputId:'pikz_apps_meta', label:'Applications (Meta)' },
  { type:'calc',   id:'pikz_apps_tot',  label:'Total Applications' },
  { type:'gap' },
  { type:'section', label:'Lobo — Closer' },
  { type:'calc',   id:'lobo_sched',   label:'Calls Scheduled' },
  { type:'input',  id:'lobo_shown',   inputId:'lobo_shown',   label:'Calls Shown' },
  { type:'calc',   id:'lobo_noshows', label:'No Shows' },
  { type:'calc',   id:'lobo_show_r',  label:'Show Rate %',    isRate:true, targets:{d:.70, w:.70} },
  { type:'input',  id:'lobo_closed',   inputId:'lobo_closed',  label:'Closed' },
  { type:'calc',   id:'lobo_close_r', label:'Close Rate %',    isRate:true, targets:{d:.50, w:.50} },
  { type:'input',  id:'lobo_dq',      inputId:'lobo_dq',      label:'DQ' },
  { type:'calc',   id:'lobo_dq_rate', label:'DQ Rate %',       isRate:true, isInverse:true, targets:{d:.15, w:.15} },
  { type:'input',  id:'lobo_whop_rev',    inputId:'lobo_whop_rev',    label:'Whop Revenue (kr)',    isCurrency:true },
  { type:'input',  id:'lobo_hotmart_rev', inputId:'lobo_hotmart_rev', label:'Hotmart Revenue (kr)', isCurrency:true },
  { type:'calc',   id:'lobo_net',         label:'Net Revenue (kr)',    isCurrency:true },
]

function emptyWeek(): WeekState {
  return Object.fromEntries(DAYS.map(d => [d, {}])) as WeekState
}

function seedToWeekState(weekId: string): WeekState {
  const seed = getSeedWeek(weekId)
  if (!seed) return emptyWeek()
  return Object.fromEntries(
    DAYS.map((d, i) => [d, seed.days[i] ?? {}])
  ) as WeekState
}

async function loadWeek(weekId: string): Promise<WeekState> {
  try {
    const res = await fetch(`/api/scorecard?weekId=${weekId}`)
    if (res.ok) {
      const saved = await res.json()
      if (saved) return { ...emptyWeek(), ...saved }
    }
  } catch {}
  return seedToWeekState(weekId)
}

async function saveWeek(weekId: string, data: WeekState) {
  await fetch('/api/scorecard', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ weekId, data }),
  })
}

export default function ScorecardPage() {
  const [weekId, setWeekId] = useState(getMondayId())
  const [data, setData] = useState<WeekState>(emptyWeek)
  const [todayOnly, setTodayOnly] = useState(false)

  useEffect(() => {
    loadWeek(weekId).then(setData)
  }, [weekId])

  const handleInput = useCallback((day: DayKey, field: keyof DayInput, value: string) => {
    setData(prev => {
      const next: WeekState = {
        ...prev,
        [day]: { ...prev[day], [field]: value === '' ? undefined : Number(value) }
      }
      saveWeek(weekId, next)
      return next
    })
  }, [weekId])

  const dayCalcs: CalcDay[] = DAYS.map(d => calcDay(data[d]))
  const totals = sumDays(DAYS.map(d => data[d]))

  const weekRevenue = Math.round(totals.lobo_total_rev)
  const WEEKLY_REV_TARGET = 231_000

  function getVal(calc: CalcDay, id: keyof CalcDay): number | null {
    const v = calc[id]
    return (typeof v === 'number') ? v : null
  }

  function fmtVal(val: number | null, m: MetricDef): string {
    if (val === null) return '—'
    return fmt(val, m.isRate, m.isCurrency)
  }

  function cellColor(val: number | null, m: MetricDef, isWeekly: boolean): string {
    const target = m.targets ? (isWeekly ? m.targets.w : m.targets.d) : undefined
    return colorClass(val, target, m.isInverse)
  }

  const DAY_LABELS = ['Mån','Tis','Ons','Tor','Fre','Lör','Sön']

  const monday = new Date(weekId + 'T00:00:00')
  const DAY_DATES = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return `${d.getDate()}/${d.getMonth() + 1}`
  })

  // Vilket dagindex (0=Mån) är idag, inom denna vecka?
  const todayDate = new Date()
  todayDate.setHours(0, 0, 0, 0)
  const todayDayIndex = (() => {
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday)
      d.setDate(monday.getDate() + i)
      if (d.toDateString() === todayDate.toDateString()) return i
    }
    return -1 // idag är inte i denna vecka
  })()
  const todayKey = todayDayIndex >= 0 ? DAYS[todayDayIndex] : null
  const visibleDays = todayOnly && todayKey ? [todayKey] : DAYS

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-5 flex-wrap">
        <button
          onClick={() => setWeekId(id => addWeeks(id, -1))}
          className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg px-3 py-2 text-sm font-bold transition-colors"
        >
          ←
        </button>
        <div>
          <h2 className="text-xl font-extrabold">Vecka {weekNum(weekId)}</h2>
          <div className="text-xs text-zinc-500">{weekLabel(weekId)}</div>
        </div>
        <button
          onClick={() => setWeekId(id => addWeeks(id, 1))}
          className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg px-3 py-2 text-sm font-bold transition-colors"
        >
          →
        </button>
        <button
          onClick={() => { setWeekId(getMondayId()); setTodayOnly(false) }}
          className="ml-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"
        >
          Denna vecka
        </button>
        <button
          onClick={() => { setWeekId(getMondayId()); setTodayOnly(true) }}
          className={`ml-1 border rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
            todayOnly
              ? 'bg-gold text-black border-gold'
              : 'bg-zinc-800 hover:bg-zinc-700 border border-zinc-700'
          }`}
        >
          Idag
        </button>
      </div>

      {/* Revenue box */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-5 py-4 mb-4 flex items-center gap-5">
        <div className="text-[10px] font-bold tracking-[1px] uppercase text-zinc-500">
          Weekly Revenue
        </div>
        <div className={`text-[28px] font-extrabold ${weekRevenue >= WEEKLY_REV_TARGET ? 'text-green-400' : weekRevenue >= WEEKLY_REV_TARGET * 0.8 ? 'text-orange-400' : weekRevenue > 0 ? 'text-red-400' : 'text-zinc-600'}`}>
          {weekRevenue.toLocaleString('sv-SE')} kr
        </div>
        <div className="ml-auto text-xs text-zinc-600">Mål: 231 000 kr/vecka</div>
      </div>

      {/* Color legend */}
      <div className="flex gap-4 mb-3 text-[11px] text-zinc-500">
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-400 inline-block" /> ≥ 100% av mål</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-orange-400 inline-block" /> 80–99%</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" /> &lt; 80%</span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-zinc-800">
        <table className="w-full border-collapse min-w-[1100px]">
          <thead>
            <tr className="bg-zinc-900 border-b border-zinc-800">
              <th className="text-left px-3.5 py-2.5 text-[9px] font-bold tracking-[0.8px] uppercase text-zinc-500 w-48 sticky left-0 bg-zinc-900 z-10">
                Metric
              </th>
              {DAY_LABELS.map((d, i) => {
                if (todayOnly && i !== todayDayIndex) return null
                return (
                  <th key={d} className="text-center px-2 py-2.5 border-l border-zinc-800">
                    <div className={`text-[9px] font-bold tracking-[0.8px] uppercase ${i === todayDayIndex ? 'text-gold' : 'text-zinc-500'}`}>{d}</div>
                    <div className={`text-[9px] mt-0.5 ${i === todayDayIndex ? 'text-gold/60' : 'text-zinc-700'}`}>{DAY_DATES[i]}</div>
                  </th>
                )
              })}
              <th className="w-2 border-l border-zinc-800/50" />
              <th className="text-center px-2 py-2.5 text-[9px] font-bold tracking-[0.8px] uppercase text-zinc-500 border-l border-zinc-800 bg-zinc-900/50 min-w-[90px]">
                Weekly Total
              </th>
              <th className="text-center px-2 py-2.5 text-[9px] font-bold tracking-[0.8px] uppercase text-zinc-700 border-l border-zinc-800 min-w-[70px]">
                Daily Mål
              </th>
              <th className="text-center px-2 py-2.5 text-[9px] font-bold tracking-[0.8px] uppercase text-zinc-700 border-l border-zinc-800 min-w-[70px]">
                Weekly Mål
              </th>
            </tr>
          </thead>
          <tbody>
            {SCHEMA.map((m, idx) => {
              if (m.type === 'gap') {
                return (
                  <tr key={`gap-${idx}`}>
                    <td colSpan={13} className="h-1.5 bg-black border-none" />
                  </tr>
                )
              }
              if (m.type === 'section') {
                return (
                  <tr key={`sec-${idx}`} className="bg-zinc-950">
                    <td colSpan={13} className="px-3.5 py-2 text-[9px] font-bold tracking-[1.5px] uppercase text-zinc-600 sticky left-0 bg-zinc-950">
                      {m.label}
                    </td>
                  </tr>
                )
              }

              const totalVal = m.id ? getVal(totals as CalcDay, m.id) : null

              return (
                <tr key={m.id} className="border-b border-zinc-800/60 hover:bg-zinc-900/30 transition-colors">
                  {/* Label */}
                  <td className="px-3.5 text-[12px] font-medium text-zinc-300 sticky left-0 bg-zinc-950 z-10 border-r border-zinc-800">
                    {m.label}
                  </td>

                  {/* Day cells */}
                  {visibleDays.map((day) => {
                    const di = DAYS.indexOf(day)
                    const dc = dayCalcs[di]
                    const val = m.id ? getVal(dc, m.id) : null

                    if (m.type === 'input' && m.inputId) {
                      const raw = data[day]?.[m.inputId]
                      return (
                        <td key={day} className="border-l border-zinc-800/60 p-0">
                          <input
                            type="number"
                            min={0}
                            value={raw ?? ''}
                            placeholder="—"
                            onChange={e => handleInput(day, m.inputId!, e.target.value)}
                            onFocus={e => e.target.select()}
                            className="w-full h-11 bg-transparent text-center text-[13px] font-semibold text-white placeholder:text-zinc-800 focus:bg-gold/5 focus:outline-none transition-colors"
                          />
                        </td>
                      )
                    }

                    return (
                      <td key={day} className="border-l border-zinc-800/60 text-center">
                        <span className={`text-[13px] font-semibold px-2 ${cellColor(val, m, false)}`}>
                          {fmtVal(val, m)}
                        </span>
                      </td>
                    )
                  })}

                  {/* Spacer */}
                  <td className="w-2 bg-black/50 border-l border-zinc-800/30" />

                  {/* Weekly total */}
                  <td className="border-l border-zinc-800 text-center bg-zinc-900/20">
                    <span className={`text-[13px] font-bold px-2 ${cellColor(totalVal, m, true)}`}>
                      {fmtVal(totalVal, m)}
                    </span>
                  </td>

                  {/* Daily target */}
                  <td className="border-l border-zinc-800 text-center">
                    <span className="text-[12px] text-zinc-700 px-2">
                      {m.targets ? (m.isRate ? `${(m.targets.d * 100).toFixed(0)}%` : m.targets.d.toLocaleString('sv-SE')) : '—'}
                    </span>
                  </td>

                  {/* Weekly target */}
                  <td className="border-l border-zinc-800 text-center">
                    <span className="text-[12px] text-zinc-700 px-2">
                      {m.targets ? (m.isRate ? `${(m.targets.w * 100).toFixed(0)}%` : m.targets.w.toLocaleString('sv-SE')) : '—'}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
