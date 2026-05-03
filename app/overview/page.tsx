'use client'
import { useState, useEffect } from 'react'
import {
  AreaChart, Area, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer,
} from 'recharts'
import { sumDays, calcDay, fmt } from '@/lib/calc'
import { SEED_DATA, weekNum, getMondayId, getSeedWeek } from '@/lib/data'
import type { DayInput, CalcDay } from '@/lib/types'

// ─── constants ────────────────────────────────────────────────────────────────
type Period = 'dag' | 'vecka' | 'manad'
const DAYS = ['mon','tue','wed','thu','fri','sat','sun'] as const
type DayKey = typeof DAYS[number]
type WeekState = Record<DayKey, Partial<DayInput>>
const DAY_LABELS = ['Mån','Tis','Ons','Tor','Fre','Lör','Sön']

const TARGETS: Record<Period, {
  rev: number; net: number; booked: number; closed: number
  showRate: number; closeRate: number; dqRate: number
}> = {
  dag:   { rev:    50_000, net:    46_000, booked:   4, closed:  1, showRate: 0.70, closeRate: 0.50, dqRate: 0.15 },
  vecka: { rev:   231_000, net:   210_000, booked:  28, closed:  4, showRate: 0.70, closeRate: 0.50, dqRate: 0.15 },
  manad: { rev: 1_000_000, net:   900_000, booked: 112, closed: 16, showRate: 0.70, closeRate: 0.50, dqRate: 0.15 },
}

// ─── helpers ──────────────────────────────────────────────────────────────────
function pctOf(val: number, target: number) {
  return target > 0 ? (val / target) * 100 : 0
}

function colorByPct(pct: number) {
  if (pct >= 100) return 'text-green-400'
  if (pct >= 80)  return 'text-orange-400'
  if (pct > 0)    return 'text-red-400'
  return 'text-zinc-600'
}

function barByPct(pct: number) {
  if (pct >= 100) return 'bg-green-400'
  if (pct >= 80)  return 'bg-orange-400'
  return 'bg-red-400'
}

function borderByPct(pct: number) {
  if (pct >= 100) return 'border-green-500/20'
  if (pct >= 80)  return 'border-orange-500/20'
  if (pct > 0)    return 'border-red-500/20'
  return 'border-zinc-800'
}

// Omvänd logik: lägre värde är bättre — target/val*100 ger > 100 när val < target
function dqPct(rate: number | null, target: number): number {
  if (rate === null) return 0
  if (rate <= 0)     return 150    // noll DQ = perfekt, grön
  return Math.min(200, (target / rate) * 100)
}

function emptyWeek(): WeekState {
  return Object.fromEntries(DAYS.map(d => [d, {}])) as WeekState
}

function loadWeek(weekId: string): WeekState {
  if (typeof window === 'undefined') return emptyWeek()
  try {
    const stored = localStorage.getItem(`lobo_wk_${weekId}`)
    if (stored) return JSON.parse(stored)
  } catch {}
  const seed = getSeedWeek(weekId)
  if (!seed) return emptyWeek()
  return Object.fromEntries(DAYS.map((d, i) => [d, seed.days[i] ?? {}])) as WeekState
}

function todayIdx(): number {
  return (new Date().getDay() + 6) % 7
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
interface KpiCardProps {
  label: string
  value: string
  target: string
  pct: number
  inverseLabel?: boolean  // visa "Under mål" / "Över mål" istället för X%
}
function KpiCard({ label, value, target, pct, inverseLabel }: KpiCardProps) {
  const hasData = pct > 0
  const statusText = inverseLabel
    ? (pct >= 100 ? 'Under mål' : pct > 0 ? 'Över mål' : undefined)
    : hasData ? `${Math.min(pct, 999).toFixed(0)}% av mål` : undefined
  return (
    <div className={`bg-zinc-900 border ${borderByPct(pct)} rounded-xl p-4`}>
      <div className="text-[9px] font-bold tracking-[1.2px] uppercase text-zinc-500 mb-2">{label}</div>
      <div className={`text-[26px] font-extrabold leading-none mb-1 ${colorByPct(pct)}`}>{value}</div>
      <div className="flex items-center justify-between mt-1.5">
        <span className="text-[11px] text-zinc-600">{target}</span>
        {statusText && (
          <span className={`text-[11px] font-bold ${colorByPct(pct)}`}>{statusText}</span>
        )}
      </div>
      {hasData && (
        <div className="mt-2 h-1 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${barByPct(pct)}`}
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
        </div>
      )}
    </div>
  )
}

// ─── Funnel Row ───────────────────────────────────────────────────────────────
interface FunnelRowProps {
  label: string
  value: number
  barWidth: number
  color: string
  prevPct: string
}
function FunnelRow({ label, value, barWidth, color, prevPct }: FunnelRowProps) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <span className="text-[12px] text-zinc-400 w-36 shrink-0">{label}</span>
      <div className="flex-1 bg-zinc-800 rounded-md h-5 overflow-hidden">
        <div
          className="h-full rounded-md transition-all duration-500"
          style={{ width: `${barWidth}%`, background: color }}
        />
      </div>
      <span className="text-[13px] font-bold w-14 text-right" style={{ color }}>
        {value.toLocaleString('sv-SE')}
      </span>
      <span className="text-[11px] text-zinc-600 w-16 text-right">{prevPct}</span>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function OverviewPage() {
  const [period, setPeriod] = useState<Period>('vecka')
  const [currentWeek, setCurrentWeek] = useState<WeekState>(emptyWeek)
  const weekId = getMondayId()

  useEffect(() => {
    setCurrentWeek(loadWeek(weekId))
  }, [weekId])

  // Aggregate based on period
  const t: CalcDay = (() => {
    if (period === 'dag')   return calcDay(currentWeek[DAYS[todayIdx()]])
    if (period === 'vecka') return sumDays(DAYS.map(d => currentWeek[d]))
    return sumDays(SEED_DATA.flatMap(w => w.days))
  })()

  const tgt = TARGETS[period]

  // KPI percentages
  const totalRevPct    = pctOf(t.lobo_total_rev, tgt.rev)
  const netRevPct      = pctOf(t.lobo_net, tgt.net)
  const showRatePct    = t.lobo_show_r  != null && t.lobo_show_r  > 0 ? pctOf(t.lobo_show_r,  tgt.showRate)  : 0
  const closeRatePct   = t.lobo_close_r != null && t.lobo_close_r > 0 ? pctOf(t.lobo_close_r, tgt.closeRate) : 0
  const bookedPct      = pctOf(t.team_booked, tgt.booked)
  const closedPct      = pctOf(t.lobo_closed, tgt.closed)
  const dialerDqPct    = dqPct(t.team_dq_rate, tgt.dqRate)
  const loboDqPct      = dqPct(t.lobo_dq_rate, tgt.dqRate)

  // Bottleneck — inkluderar DQ (omvänd: hög DQ rate = låg pct = bottleneck)
  const bn = [
    { label: 'Total Revenue',  pct: totalRevPct  },
    { label: 'Show Rate',      pct: showRatePct  },
    { label: 'Close Rate',     pct: closeRatePct },
    { label: 'Calls Booked',   pct: bookedPct    },
    { label: 'Closed',         pct: closedPct    },
    { label: 'Dialer DQ Rate', pct: dialerDqPct  },
    { label: 'Lobo DQ Rate',   pct: loboDqPct    },
  ].filter(i => i.pct > 0).sort((a, b) => a.pct - b.pct)[0]

  // Funnel
  const funnelStages = [
    { label: 'Total Outreach', value: t.ellow_dms + t.edv_dials + t.atl_dials, color: '#818cf8' },
    { label: 'Conversations', value: t.team_convos,  color: '#60a5fa' },
    { label: 'Calls Booked',  value: t.team_booked,  color: '#f5c518' },
    { label: 'Calls Shown',   value: t.lobo_shown,   color: '#fb923c' },
    { label: 'Closed',        value: t.lobo_closed,  color: '#4ade80' },
  ]
  const funnelMax = Math.max(funnelStages[0].value, 1)

  // Chart data — weekly when period=manad, daily for dag/vecka
  const monthlyData = SEED_DATA.map(w => {
    const wt = sumDays(w.days)
    return {
      label:     `V${weekNum(w.weekId)}`,
      revenue:   wt.lobo_total_rev,
      closeRate: wt.lobo_close_r != null ? +(wt.lobo_close_r * 100).toFixed(1) : null,
      showRate:  wt.lobo_show_r  != null ? +(wt.lobo_show_r  * 100).toFixed(1) : null,
    }
  })

  const dailyData = DAYS.map((d, i) => {
    const dc = calcDay(currentWeek[d])
    return {
      label:     DAY_LABELS[i],
      revenue:   dc.lobo_total_rev,
      closeRate: dc.lobo_close_r != null ? +(dc.lobo_close_r * 100).toFixed(1) : null,
      showRate:  dc.lobo_show_r  != null ? +(dc.lobo_show_r  * 100).toFixed(1) : null,
    }
  })

  const chartData = period === 'manad' ? monthlyData : dailyData
  const chartRevTarget = tgt.rev

  const periodSubtitle: Record<Period, string> = {
    dag:   `Idag — ${DAY_LABELS[todayIdx()]}`,
    vecka: `Vecka ${weekNum(weekId)}`,
    manad: 'April 2026',
  }

  return (
    <div className="p-6 max-w-[1400px] mx-auto">

      {/* Header + period selector */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-extrabold">Overview</h2>
          <div className="text-xs text-zinc-500 mt-0.5">{periodSubtitle[period]}</div>
        </div>
        <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
          {(['dag','vecka','manad'] as Period[]).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-1.5 rounded text-[11px] font-bold tracking-[0.8px] uppercase transition-colors ${
                period === p ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {p === 'manad' ? 'MÅNAD' : p.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Row 1 — Revenue */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <KpiCard
          label="Total Revenue (Whop + Hotmart)"
          value={`${Math.round(t.lobo_total_rev).toLocaleString('sv-SE')} kr`}
          target={`Mål: ${tgt.rev.toLocaleString('sv-SE')} kr`}
          pct={totalRevPct}
        />
        <KpiCard
          label="Net Revenue (efter avgifter)"
          value={`${Math.round(t.lobo_net).toLocaleString('sv-SE')} kr`}
          target={`Mål: ${tgt.net.toLocaleString('sv-SE')} kr`}
          pct={netRevPct}
        />
      </div>

      {/* KPI Row 2 — Performance */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
        <KpiCard
          label="Show Rate %"
          value={t.lobo_show_r != null && t.lobo_show_r > 0 ? fmt(t.lobo_show_r, true) : '—'}
          target="Mål: 70%"
          pct={showRatePct}
        />
        <KpiCard
          label="Close Rate %"
          value={t.lobo_close_r != null && t.lobo_close_r > 0 ? fmt(t.lobo_close_r, true) : '—'}
          target="Mål: 50%"
          pct={closeRatePct}
        />
        <KpiCard
          label="Calls Booked"
          value={t.team_booked.toLocaleString('sv-SE')}
          target={`Mål: ${tgt.booked}`}
          pct={bookedPct}
        />
        <KpiCard
          label="Closed"
          value={t.lobo_closed.toLocaleString('sv-SE')}
          target={`Mål: ${tgt.closed}`}
          pct={closedPct}
        />
      </div>

      {/* KPI Row 3 — DQ */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <KpiCard
          label="Dialer DQ Rate (Edvard + Atlassi)"
          value={t.team_dq_rate != null && t.team_dq_rate > 0 ? fmt(t.team_dq_rate, true) : t.team_dq > 0 ? '—' : '0.0%'}
          target="Mål: under 15%"
          pct={dialerDqPct}
          inverseLabel
        />
        <KpiCard
          label="Lobo DQ Rate (på samtal)"
          value={t.lobo_dq_rate != null && t.lobo_dq_rate > 0 ? fmt(t.lobo_dq_rate, true) : t.lobo_dq > 0 ? '—' : '0.0%'}
          target="Mål: under 15%"
          pct={loboDqPct}
          inverseLabel
        />
      </div>

      {/* Bottleneck */}
      {bn && (
        <div className="bg-red-950/20 border border-red-500/30 rounded-xl px-5 py-3.5 mb-4 flex items-center gap-4">
          <span className="text-[9px] font-bold tracking-[1.5px] uppercase text-red-500">Bottleneck</span>
          <span className="text-red-300 font-bold text-[17px]">{bn.label}</span>
          <span className="text-red-400 text-[12px]">{bn.pct.toFixed(0)}% av mål</span>
          <div className="ml-auto w-32 h-1.5 bg-red-950 rounded-full overflow-hidden">
            <div
              className="h-full bg-red-500 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(bn.pct, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Conversion Funnel */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-4">
        <div className="text-[9px] font-bold tracking-[1.2px] uppercase text-zinc-500 mb-4">
          Conversion Funnel — % av föregående steg
        </div>
        {funnelStages.map((s, i) => {
          const prev = i === 0 ? s.value : funnelStages[i - 1].value
          const prevPct = i === 0 ? '100%' : prev > 0 ? `${(s.value / prev * 100).toFixed(1)}%` : '—'
          return (
            <FunnelRow
              key={s.label}
              label={s.label}
              value={s.value}
              barWidth={funnelMax > 0 ? (s.value / funnelMax) * 100 : 0}
              color={s.color}
              prevPct={prevPct}
            />
          )
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <div className="text-[9px] font-bold tracking-[1.2px] uppercase text-zinc-500 mb-4">
            Revenue {period === 'manad' ? 'per vecka' : 'per dag'} (kr)
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" />
              <XAxis dataKey="label" stroke="#333" tick={{ fill: '#555', fontSize: 11 }} />
              <YAxis stroke="#333" tick={{ fill: '#555', fontSize: 11 }}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ background: '#111', border: '1px solid #333', borderRadius: 8 }}
                labelStyle={{ color: '#aaa' }}
                formatter={(v: number) => [`${v.toLocaleString('sv-SE')} kr`, 'Revenue']}
              />
              <ReferenceLine y={chartRevTarget} stroke="#f5c518" strokeDasharray="4 4"
                label={{ value: 'Mål', position: 'insideTopRight', fill: '#f5c518', fontSize: 10 }} />
              <Area type="monotone" dataKey="revenue" stroke="#f5c518"
                fill="rgba(245,197,24,0.08)" strokeWidth={2} dot={{ fill: '#f5c518', r: 4 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <div className="text-[9px] font-bold tracking-[1.2px] uppercase text-zinc-500 mb-1">
            Close Rate & Show Rate {period === 'manad' ? 'per vecka' : 'per dag'} (%)
          </div>
          <div className="flex gap-4 mb-3 text-[10px] text-zinc-600">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-400 inline-block" /> Close Rate (mål 50%)</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block" /> Show Rate (mål 70%)</span>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" />
              <XAxis dataKey="label" stroke="#333" tick={{ fill: '#555', fontSize: 11 }} />
              <YAxis stroke="#333" tick={{ fill: '#555', fontSize: 11 }}
                tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
              <Tooltip
                contentStyle={{ background: '#111', border: '1px solid #333', borderRadius: 8 }}
                labelStyle={{ color: '#aaa' }}
                formatter={(v: number, name: string) => [`${v}%`, name]}
              />
              <ReferenceLine y={50} stroke="#4ade80" strokeDasharray="4 4" />
              <ReferenceLine y={70} stroke="#60a5fa" strokeDasharray="4 4" />
              <Line type="monotone" dataKey="closeRate" stroke="#4ade80" strokeWidth={2}
                dot={{ fill: '#4ade80', r: 4 }} name="Close Rate" connectNulls />
              <Line type="monotone" dataKey="showRate" stroke="#60a5fa" strokeWidth={2}
                dot={{ fill: '#60a5fa', r: 4 }} name="Show Rate" connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
