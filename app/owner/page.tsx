'use client'
import { useState, useEffect } from 'react'

// ── Ändra PIN här ──
const OWNER_PIN = '1987'
// ──────────────────

const COMMISSION_RATE = 0.05
const WHOP_FEE = 0.037
const HOTMART_FEE = 0.124

type Platform = 'whop' | 'hotmart'
type Setter = 'Edvard' | 'Atlassi' | 'Ellow' | 'Direkt'

interface CallReport {
  id: string
  date: string
  name: string
  outcome: string
  platform?: Platform
  amount?: number
  paid_now?: number
  upsell_amount?: number
  booked_by?: Setter
  [key: string]: unknown
}

function netAmt(gross: number, platform: Platform) {
  return Math.round(gross * (1 - (platform === 'whop' ? WHOP_FEE : HOTMART_FEE)))
}
function feeAmt(gross: number, platform: Platform) {
  return Math.round(gross * (platform === 'whop' ? WHOP_FEE : HOTMART_FEE))
}


const MONTH_NAMES = ['Januari','Februari','Mars','April','Maj','Juni','Juli','Augusti','September','Oktober','November','December']

function isClosed(o: string) { return o === 'closed_pif' || o === 'closed_partial' || o === 'upsell' }
function isUpsell(o: string) { return o === 'upsell' }

const SETTERS: Setter[] = ['Edvard', 'Atlassi', 'Ellow']

export default function OwnerPage() {
  const [pin, setPin] = useState('')
  const [unlocked, setUnlocked] = useState(false)
  const [error, setError] = useState(false)
  const [reports, setReports] = useState<CallReport[]>([])
  const [setterReports, setSetterReports] = useState<{date:string;dms_sent:number}[]>([])
  const [dialerReports, setDialerReports] = useState<{date:string;dialer:string;outcome:string}[]>([])

  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth()) // 0-indexed

  useEffect(() => {
    if (!unlocked) return
    fetch('/api/call-reports').then(r => r.json()).then(setReports).catch(() => {})
    fetch('/api/setter-reports').then(r => r.json()).then(setSetterReports).catch(() => {})
    fetch('/api/dialer-reports').then(r => r.json()).then(setDialerReports).catch(() => {})
  }, [unlocked])

  function handlePin(digit: string) {
    const next = pin + digit
    setPin(next)
    setError(false)
    if (next.length === 4) {
      if (next === OWNER_PIN) { setUnlocked(true) }
      else {
        setError(true)
        setTimeout(() => { setPin(''); setError(false) }, 800)
      }
    }
  }

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  // ── Vecko-KPIs ──
  const weekStart = (() => {
    const m = new Date(); m.setDate(m.getDate() - ((m.getDay() + 6) % 7)); m.setHours(0,0,0,0); return m
  })()
  const ellowWeekDms = setterReports
    .filter(r => new Date(r.date + 'T00:00:00') >= weekStart)
    .reduce((s, r) => s + (r.dms_sent ?? 0), 0)
  const edvWeekBooked = dialerReports.filter(r => new Date(r.date + 'T00:00:00') >= weekStart && r.dialer === 'Edvard'  && r.outcome === 'booked').length
  const atlWeekBooked = dialerReports.filter(r => new Date(r.date + 'T00:00:00') >= weekStart && r.dialer === 'Atlassi' && r.outcome === 'booked').length

  // ── Filtrera denna månad ──
  const monthReports = reports.filter(r => {
    const d = new Date(r.date)
    return d.getFullYear() === year && d.getMonth() === month && isClosed(r.outcome)
  })

  let cashCollected = 0
  let whopFees = 0
  let hotmartFees = 0
  let totalNet = 0
  let totalCommissions = 0

  interface SetterRow { closes: number; net: number; commission: number; closes_list: { name: string; net: number; commission: number }[] }
  const setterData: Record<string, SetterRow> = {}
  for (const s of SETTERS) setterData[s] = { closes: 0, net: 0, commission: 0, closes_list: [] }

  for (const r of monthReports) {
    if (!r.platform) continue

    const gross = isUpsell(r.outcome)
      ? (r.amount ?? 0)
      : r.outcome === 'closed_pif' ? (r.amount ?? 0) : (r.paid_now ?? 0)

    cashCollected += gross
    const n = netAmt(gross, r.platform)
    const f = feeAmt(gross, r.platform)
    if (r.platform === 'whop') whopFees += f
    else hotmartFees += f
    totalNet += n

    if (isUpsell(r.outcome)) continue // Ingen provision på tillägg

    const commission = r.booked_by && r.booked_by !== 'Direkt'
      ? Math.round(n * COMMISSION_RATE) : 0
    totalCommissions += commission

    if (r.booked_by && r.booked_by !== 'Direkt' && setterData[r.booked_by]) {
      setterData[r.booked_by].closes++
      setterData[r.booked_by].net += n
      setterData[r.booked_by].commission += commission
      setterData[r.booked_by].closes_list.push({ name: r.name as string, net: n, commission })
    }
  }

  const totalFees = whopFees + hotmartFees
  const dinVinst = totalNet - totalCommissions
  const dinVinstPct = cashCollected > 0 ? ((dinVinst / cashCollected) * 100).toFixed(1) : '0.0'
  const commissionPct = cashCollected > 0 ? ((totalCommissions / cashCollected) * 100).toFixed(1) : '0.0'

  // ── PIN screen ──
  if (!unlocked) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 w-80 flex flex-col items-center gap-6">
          <div>
            <div className="text-[10px] font-black tracking-[3px] uppercase text-zinc-600 text-center mb-1">Ägarvy</div>
            <div className="text-center text-zinc-400 text-sm">Ange PIN-kod</div>
          </div>
          <div className="flex gap-3">
            {[0,1,2,3].map(i => (
              <div key={i} className={`w-4 h-4 rounded-full border-2 transition-all ${
                i < pin.length
                  ? error ? 'bg-red-500 border-red-500' : 'bg-gold border-gold'
                  : 'border-zinc-700'
              }`} />
            ))}
          </div>
          <div className="grid grid-cols-3 gap-3 w-full">
            {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((d, i) => (
              <button key={i}
                onClick={() => {
                  if (d === '⌫') { setPin(p => p.slice(0,-1)); setError(false) }
                  else if (d) handlePin(d)
                }}
                disabled={!d}
                className={`h-14 rounded-xl text-lg font-bold transition-all ${
                  !d ? 'invisible'
                  : d === '⌫' ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                  : 'bg-zinc-800 text-white hover:bg-zinc-700 active:scale-95'
                }`}>
                {d}
              </button>
            ))}
          </div>
          {error && <p className="text-red-400 text-[12px] font-bold">Fel kod — försök igen</p>}
        </div>
      </div>
    )
  }

  // ── Owner view ──
  return (
    <div className="p-6 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button onClick={prevMonth} className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg px-3 py-2 text-sm font-bold">←</button>
          <h1 className="text-[22px] font-black tracking-[1px] uppercase">
            Ekonomi <span className="text-red-500">{MONTH_NAMES[month].toUpperCase()} {year}</span>
          </h1>
          <button onClick={nextMonth} className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg px-3 py-2 text-sm font-bold">→</button>
        </div>
        <button onClick={() => { setUnlocked(false); setPin('') }}
          className="text-zinc-600 hover:text-zinc-400 text-[11px] font-bold uppercase tracking-widest border border-zinc-800 px-3 py-2 rounded-lg transition-colors">
          Lås
        </button>
      </div>

      {/* Vecko-KPIs */}
      <div className="mb-6 bg-zinc-900 border border-zinc-700 rounded-xl p-5">
        <div className="text-[10px] font-black tracking-[2px] uppercase text-zinc-500 mb-4">Veckans KPI-mål</div>
        <div className="grid grid-cols-3 gap-4">
          {/* Ellow */}
          {(() => {
            const goal = 60, val = ellowWeekDms, done = val >= goal
            const pct = Math.min(100, (val / goal) * 100)
            return (
              <div className={`rounded-xl border p-4 ${done ? 'border-gold/40 bg-gold/5' : 'border-zinc-800'}`}>
                <div className="text-[10px] font-black tracking-[1.5px] uppercase text-zinc-500 mb-1">Ellow — DM Setter</div>
                <div className="flex items-end gap-1 mb-2">
                  <span className={`text-3xl font-extrabold ${done ? 'text-gold' : val > 0 ? 'text-white' : 'text-zinc-600'}`}>{val}</span>
                  <span className="text-zinc-600 text-sm mb-1">/ {goal} DMs</span>
                </div>
                <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden mb-1">
                  <div className={`h-full rounded-full ${done ? 'bg-gold' : 'bg-zinc-500'}`} style={{width:`${pct}%`}} />
                </div>
                <div className={`text-[11px] font-bold ${done ? 'text-gold' : 'text-zinc-600'}`}>
                  {done ? '✓ Bonus upplåst — 400 kr' : `${goal - val} DMs kvar`}
                </div>
              </div>
            )
          })()}
          {/* Edvard */}
          {(() => {
            const goal = 8, val = edvWeekBooked, done = val >= goal
            const pct = Math.min(100, (val / goal) * 100)
            return (
              <div className={`rounded-xl border p-4 ${done ? 'border-gold/40 bg-gold/5' : 'border-zinc-800'}`}>
                <div className="text-[10px] font-black tracking-[1.5px] uppercase text-zinc-500 mb-1">Edvard — Dialer</div>
                <div className="flex items-end gap-1 mb-2">
                  <span className={`text-3xl font-extrabold ${done ? 'text-gold' : val > 0 ? 'text-white' : 'text-zinc-600'}`}>{val}</span>
                  <span className="text-zinc-600 text-sm mb-1">/ {goal} bokningar</span>
                </div>
                <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden mb-1">
                  <div className={`h-full rounded-full ${done ? 'bg-gold' : 'bg-zinc-500'}`} style={{width:`${pct}%`}} />
                </div>
                <div className={`text-[11px] font-bold ${done ? 'text-gold' : 'text-zinc-600'}`}>
                  {done ? '✓ Kvalificerad för bonus' : `${goal - val} bokningar kvar`}
                </div>
              </div>
            )
          })()}
          {/* Atlassi */}
          {(() => {
            const goal = 8, val = atlWeekBooked, done = val >= goal
            const pct = Math.min(100, (val / goal) * 100)
            return (
              <div className={`rounded-xl border p-4 ${done ? 'border-gold/40 bg-gold/5' : 'border-zinc-800'}`}>
                <div className="text-[10px] font-black tracking-[1.5px] uppercase text-zinc-500 mb-1">Atlassi — Dialer</div>
                <div className="flex items-end gap-1 mb-2">
                  <span className={`text-3xl font-extrabold ${done ? 'text-gold' : val > 0 ? 'text-white' : 'text-zinc-600'}`}>{val}</span>
                  <span className="text-zinc-600 text-sm mb-1">/ {goal} bokningar</span>
                </div>
                <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden mb-1">
                  <div className={`h-full rounded-full ${done ? 'bg-gold' : 'bg-zinc-500'}`} style={{width:`${pct}%`}} />
                </div>
                <div className={`text-[11px] font-bold ${done ? 'text-gold' : 'text-zinc-600'}`}>
                  {done ? '✓ Kvalificerad för bonus' : `${goal - val} bokningar kvar`}
                </div>
              </div>
            )
          })()}
        </div>
        <div className="mt-3 text-[10px] text-zinc-700">Ellow: 400 kr vid 60 DMs · Dialers: 500 kr till den som bokar flest (minst 8)</div>
      </div>

      {/* Cash Collected — big card */}
      <div className="bg-red-950/30 border border-red-900/60 rounded-2xl p-8 mb-6">
        <div className="text-[11px] font-bold tracking-[2px] uppercase text-zinc-500 mb-3">
          Insamlat — {MONTH_NAMES[month]} {year}
        </div>
        <div className="text-[52px] font-black text-white leading-none mb-1">
          {cashCollected.toLocaleString('sv-SE')} kr
        </div>
        <div className="text-[13px] text-zinc-600 mt-2">{monthReports.length} stängda affärer</div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <KpiCard
          label="Din vinst (netto)"
          value={`${dinVinst.toLocaleString('sv-SE')} kr`}
          sub={`${dinVinstPct}% av intäkt`}
          valueColor="text-green-400"
        />
        <KpiCard
          label="Löner (team)"
          value={`${totalCommissions.toLocaleString('sv-SE')} kr`}
          sub={`${commissionPct}% av intäkt`}
          valueColor="text-red-400"
        />
        <KpiCard
          label="Whop-avgifter (3.7%)"
          value={`${whopFees.toLocaleString('sv-SE')} kr`}
          sub={`av ${(whopFees > 0 ? Math.round(whopFees / WHOP_FEE) : 0).toLocaleString('sv-SE')} kr brutto`}
          valueColor="text-orange-400"
        />
        <KpiCard
          label="Hotmart-avgifter (20%)"
          value={`${hotmartFees.toLocaleString('sv-SE')} kr`}
          sub={`av ${(hotmartFees > 0 ? Math.round(hotmartFees / HOTMART_FEE) : 0).toLocaleString('sv-SE')} kr brutto`}
          valueColor="text-yellow-500"
        />
      </div>

      {/* Totala avgifter — liten rad */}
      {totalFees > 0 && (
        <div className="text-[11px] text-zinc-600 mb-6 -mt-4">
          Totala plattformsavgifter: <span className="text-zinc-400 font-bold">{totalFees.toLocaleString('sv-SE')} kr</span>
        </div>
      )}

      {/* Per setter */}
      <div className="mb-3 text-[10px] font-black tracking-[2px] uppercase text-zinc-600">Lön per person</div>
      <div className="space-y-3">
        {SETTERS.map(setter => {
          const d = setterData[setter]
          return (
            <div key={setter} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              <div className="px-5 py-3.5 flex items-center justify-between border-b border-zinc-800/60">
                <div>
                  <span className="font-black text-[15px] text-white">{setter}</span>
                  <span className="text-zinc-600 text-[12px] ml-2">{d.closes} close{d.closes !== 1 ? 's' : ''}</span>
                </div>
                <div className="text-right">
                  <div className="text-[9px] text-zinc-600 uppercase tracking-widest mb-0.5">Lön att betala</div>
                  <div className={`text-[22px] font-black ${d.commission > 0 ? 'text-gold' : 'text-zinc-700'}`}>
                    {d.commission.toLocaleString('sv-SE')} kr
                  </div>
                </div>
              </div>
              {d.closes_list.length > 0 ? (
                <div className="divide-y divide-zinc-800/40">
                  {d.closes_list.map((c, i) => (
                    <div key={i} className="px-5 py-2.5 flex items-center justify-between">
                      <span className="text-[13px] text-zinc-300">{c.name}</span>
                      <div className="flex gap-8 text-right">
                        <div>
                          <div className="text-[9px] text-zinc-600 uppercase tracking-wide">Netto</div>
                          <div className="text-[13px] text-zinc-400">{c.net.toLocaleString('sv-SE')} kr</div>
                        </div>
                        <div>
                          <div className="text-[9px] text-zinc-600 uppercase tracking-wide">Lön 5%</div>
                          <div className="text-[13px] font-bold text-gold">{c.commission.toLocaleString('sv-SE')} kr</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-5 py-3 text-[12px] text-zinc-700">Inga stängda affärer denna månad</div>
              )}
            </div>
          )
        })}
      </div>

      <p className="text-[11px] text-zinc-700 mt-6 text-center">
        Affärer märkta "Direkt" och tillägg räknas inte in i löner.
      </p>
    </div>
  )
}

function KpiCard({ label, value, sub, valueColor }: { label: string; value: string; sub: string; valueColor: string }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
      <div className="text-[9px] font-bold tracking-[1.5px] uppercase text-zinc-600 mb-2">{label}</div>
      <div className={`text-[22px] font-black leading-tight ${valueColor}`}>{value}</div>
      <div className="text-[11px] text-zinc-600 mt-1">{sub}</div>
    </div>
  )
}
