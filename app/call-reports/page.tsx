'use client'
import { useState, useEffect } from 'react'

type Outcome =
  | 'noshow'
  | 'rebooked'
  | 'no_money'
  | 'ask_someone'
  | 'no_value'
  | 'not_serious'
  | 'closed_pif'
  | 'closed_partial'
  | 'upsell'
  | 'upsell_partial'

type Platform = 'whop' | 'hotmart'

type Setter = 'Edvard' | 'Atlassi' | 'Ellow' | 'Direkt'

interface CallReport {
  id: string
  date: string
  name: string
  email: string
  phone: string
  outcome: Outcome
  platform?: Platform
  amount?: number
  paid_now?: number
  remaining?: number
  followup_date?: string
  booked_by?: Setter
  upsell_amount?: number
  notes: string
  created_at: string
}

const OUTCOMES: { value: Outcome; label: string; color: string }[] = [
  { value: 'noshow',         label: 'Dök inte upp',              color: 'text-zinc-400' },
  { value: 'rebooked',       label: 'Ombokat',                   color: 'text-blue-400' },
  { value: 'no_money',       label: 'Hade inte råd',             color: 'text-orange-400' },
  { value: 'ask_someone',    label: 'Måste fråga någon annan',   color: 'text-yellow-400' },
  { value: 'no_value',       label: 'Förstod inte värdet',       color: 'text-orange-400' },
  { value: 'not_serious',    label: 'Oseriös',                   color: 'text-red-400' },
  { value: 'closed_pif',     label: 'Stängd — Paid in Full',     color: 'text-green-400' },
  { value: 'closed_partial', label: 'Stängd — Delbetalning',     color: 'text-emerald-400' },
  { value: 'upsell',         label: 'Tillägg',                   color: 'text-purple-400' },
  { value: 'upsell_partial', label: 'Tillägg — Delbetalning',    color: 'text-purple-300' },
]

const WHOP_FEE = 0.037
const HOTMART_FEE = 0.30

function netRevenue(amount: number, platform: Platform): number {
  return Math.round(amount * (1 - (platform === 'whop' ? WHOP_FEE : HOTMART_FEE)))
}

function outcomeLabel(o: Outcome) { return OUTCOMES.find(x => x.value === o)?.label ?? o }
function outcomeColor(o: Outcome) { return OUTCOMES.find(x => x.value === o)?.color ?? 'text-zinc-400' }
function isClosed(o: Outcome) { return o === 'closed_pif' || o === 'closed_partial' || o === 'upsell' || o === 'upsell_partial' }
function isPartial(o: Outcome) { return o === 'closed_partial' || o === 'upsell_partial' }
function isUpsell(o: Outcome) { return o === 'upsell' || o === 'upsell_partial' }

async function loadReports(): Promise<CallReport[]> {
  const res = await fetch('/api/call-reports')
  if (!res.ok) return []
  return res.json()
}

async function saveReports(reports: CallReport[]) {
  await fetch('/api/call-reports', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(reports),
  })
}

function todayStr(): string {
  return new Date().toISOString().split('T')[0]
}

function formatDate(v: string) {
  if (!v) return '—'
  const [y, m, d] = v.split('-')
  return `${d}/${m}/${y}`
}

const emptyForm = (): Omit<CallReport, 'id' | 'created_at'> => ({
  date: todayStr(),
  name: '',
  email: '',
  phone: '',
  outcome: 'noshow',
  platform: undefined,
  amount: undefined,
  paid_now: undefined,
  remaining: undefined,
  followup_date: undefined,
  booked_by: undefined,
  upsell_amount: undefined,
  notes: '',
})

export default function CallReportsPage() {
  const [reports, setReports] = useState<CallReport[]>([])
  const [form, setForm] = useState(emptyForm())
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [filterStart, setFilterStart] = useState('')
  const [filterEnd, setFilterEnd] = useState('')

  useEffect(() => { loadReports().then(setReports) }, [])

  const today = todayStr()
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().split('T')[0]

  const overdueFollowups = reports.filter(r => isPartial(r.outcome) && r.followup_date && r.followup_date <= today)
  const tomorrowFollowups = reports.filter(r => isPartial(r.outcome) && r.followup_date === tomorrowStr)
  const upcomingFollowups = reports.filter(r => isPartial(r.outcome) && r.followup_date && r.followup_date > tomorrowStr)

  function set<K extends keyof typeof form>(key: K, val: typeof form[K]) {
    setForm(prev => ({ ...prev, [key]: val }))
  }

  function openNew() {
    setEditId(null)
    setForm(emptyForm())
    setShowForm(true)
  }

  function openEdit(r: CallReport) {
    setEditId(r.id)
    setForm({
      date: r.date,
      name: r.name,
      email: r.email,
      phone: r.phone,
      outcome: r.outcome,
      platform: r.platform,
      amount: r.amount,
      paid_now: r.paid_now,
      remaining: r.remaining,
      followup_date: r.followup_date,
      notes: r.notes,
    })
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    let updated: CallReport[]

    if (editId) {
      updated = reports.map(r =>
        r.id === editId ? { ...form, id: r.id, created_at: r.created_at } : r
      )
    } else {
      const report: CallReport = { ...form, id: Date.now().toString(), created_at: new Date().toISOString() }
      updated = [report, ...reports]
    }

    setReports(updated)
    await saveReports(updated)
    setForm(emptyForm())
    setShowForm(false)
    setEditId(null)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  function cancelForm() {
    setShowForm(false)
    setEditId(null)
    setForm(emptyForm())
  }

  async function handleDelete(id: string) {
    setReports(prev => prev.filter(r => r.id !== id))
    await fetch('/api/call-reports', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setDeleteId(null)
  }

  const thisWeek = reports.filter(r => {
    const d = new Date(r.date)
    const mon = new Date()
    mon.setDate(mon.getDate() - ((mon.getDay() + 6) % 7))
    mon.setHours(0, 0, 0, 0)
    return d >= mon
  })

  // Date range filter
  const rankedPayments = (() => {
    if (!filterStart && !filterEnd) return []
    return reports
      .filter(r => {
        if (!isClosed(r.outcome) || !r.platform) return false
        if (filterStart && r.date < filterStart) return false
        if (filterEnd && r.date > filterEnd) return false
        return true
      })
      .map(r => {
        const gross = r.outcome === 'closed_pif' ? (r.amount ?? 0)
          : r.outcome === 'upsell' ? (r.amount ?? 0)
          : (r.paid_now ?? 0)
        return { ...r, gross }
      })
      .filter(r => r.gross > 0)
      .sort((a, b) => b.gross - a.gross)
  })()

  const closeReports = thisWeek.filter(r => isClosed(r.outcome) && !isUpsell(r.outcome) && r.platform)
  const upsellReports = thisWeek.filter(r => isUpsell(r.outcome) && r.platform)

  const stats = {
    total: thisWeek.length,
    closed: thisWeek.filter(r => isClosed(r.outcome) && !isUpsell(r.outcome)).length,
    noshows: thisWeek.filter(r => r.outcome === 'noshow').length,
    closeGross: closeReports.reduce((sum, r) => {
      return sum + (r.outcome === 'closed_pif' ? (r.amount ?? 0) : (r.paid_now ?? 0))
    }, 0),
    closeNet: closeReports.reduce((sum, r) => {
      const amt = r.outcome === 'closed_pif' ? (r.amount ?? 0) : (r.paid_now ?? 0)
      return sum + netRevenue(amt, r.platform!)
    }, 0),
    upsellGross: upsellReports.reduce((sum, r) => {
      return sum + (r.outcome === 'upsell' ? (r.amount ?? 0) : (r.paid_now ?? 0))
    }, 0),
    upsellNet: upsellReports.reduce((sum, r) => {
      const amt = r.outcome === 'upsell' ? (r.amount ?? 0) : (r.paid_now ?? 0)
      return sum + netRevenue(amt, r.platform!)
    }, 0),
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold">Call Reports</h1>
          <p className="text-xs text-zinc-500 mt-0.5">Logga varje samtal direkt efter det är klart</p>
        </div>
        <button
          onClick={openNew}
          className="bg-gold text-black font-black text-[11px] tracking-widest uppercase px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
        >
          + Nytt samtal
        </button>
      </div>

      {/* Förfallna — röd */}
      {overdueFollowups.length > 0 && (
        <div className="mb-4 bg-red-950/60 border border-red-700 rounded-xl p-4">
          <div className="text-[10px] font-black tracking-[2px] uppercase text-red-400 mb-2">
            Uppföljning förfallen — {overdueFollowups.length} person{overdueFollowups.length > 1 ? 'er' : ''}
          </div>
          <div className="space-y-2">
            {overdueFollowups.map(r => (
              <div key={r.id} className="flex items-center gap-3 text-sm flex-wrap">
                <span className="font-bold text-white">{r.name}</span>
                <span className="text-zinc-400">{r.email}</span>
                {r.phone && <span className="text-zinc-400">{r.phone}</span>}
                <span className="text-red-400 font-bold ml-auto">
                  Resterande: {r.remaining?.toLocaleString('sv-SE')} kr · Förfallodatum: {formatDate(r.followup_date ?? '')}
                </span>
                <button onClick={() => openEdit(r)} className="text-[11px] text-red-300 underline">Ändra</button>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-red-400/70 mt-2">Ring upp och försök ta resterande betalning.</p>
        </div>
      )}

      {/* Ring idag — betalningsdatum är imorgon */}
      {tomorrowFollowups.length > 0 && (
        <div className="mb-4 bg-orange-950/50 border border-orange-600 rounded-xl p-4">
          <div className="text-[10px] font-black tracking-[2px] uppercase text-orange-400 mb-2">
            Ring idag — betalar imorgon
          </div>
          <div className="space-y-2">
            {tomorrowFollowups.map(r => (
              <div key={r.id} className="flex items-center gap-3 text-sm flex-wrap">
                <span className="font-bold text-white">{r.name}</span>
                <span className="text-zinc-400">{r.email}</span>
                {r.phone && <span className="text-zinc-400">{r.phone}</span>}
                <span className="text-orange-400 font-bold ml-auto">
                  Resterande: {r.remaining?.toLocaleString('sv-SE')} kr
                </span>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-orange-400/60 mt-2">Ring och boka in dem — de får lönen imorgon.</p>
        </div>
      )}

      {/* placeholder removed */}

      {/* Saved confirmation */}
      {saved && (
        <div className="mb-4 bg-green-950/50 border border-green-700 rounded-xl p-3 text-sm text-green-400 font-bold">
          {editId ? 'Samtalet uppdaterat.' : 'Samtalet sparat.'}
        </div>
      )}

      {/* Stats — aktivitet */}
      <div className="grid grid-cols-3 gap-3 mb-3">
        {[
          { label: 'Samtal denna vecka', val: stats.total,   color: 'text-white' },
          { label: 'Stängda',            val: stats.closed,  color: 'text-green-400' },
          { label: 'No Shows',           val: stats.noshows, color: 'text-zinc-400' },
        ].map(s => (
          <div key={s.label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="text-[9px] font-bold tracking-[1.5px] uppercase text-zinc-600 mb-1">{s.label}</div>
            <div className={`text-2xl font-extrabold ${s.color}`}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* Stats — intäkter */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="text-[9px] font-bold tracking-[1.5px] uppercase text-zinc-600 mb-1">Revenue Close</div>
          <div className="text-2xl font-extrabold text-gold">{stats.closeGross.toLocaleString('sv-SE')} kr</div>
          <div className="text-[11px] text-zinc-600 mt-1">Netto: {stats.closeNet.toLocaleString('sv-SE')} kr</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="text-[9px] font-bold tracking-[1.5px] uppercase text-zinc-600 mb-1">Revenue Upsell</div>
          <div className="text-2xl font-extrabold text-emerald-400">{stats.upsellGross.toLocaleString('sv-SE')} kr</div>
          <div className="text-[11px] text-zinc-600 mt-1">Netto: {stats.upsellNet.toLocaleString('sv-SE')} kr</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="text-[9px] font-bold tracking-[1.5px] uppercase text-zinc-600 mb-1">Total Revenue</div>
          <div className="text-2xl font-extrabold text-white">{(stats.closeGross + stats.upsellGross).toLocaleString('sv-SE')} kr</div>
          <div className="text-[11px] text-zinc-600 mt-1">Netto: {(stats.closeNet + stats.upsellNet).toLocaleString('sv-SE')} kr</div>
        </div>
      </div>

      {/* Kommande uppföljningar — diskret under stats */}
      {upcomingFollowups.length > 0 && (
        <div className="mb-6 border border-zinc-800 rounded-xl divide-y divide-zinc-800/60">
          <div className="px-4 py-2.5 flex items-center gap-2">
            <span className="text-[9px] font-black tracking-[1.5px] uppercase text-zinc-600">Kommande uppföljningar</span>
            <span className="text-[9px] text-zinc-700">({upcomingFollowups.length})</span>
          </div>
          {upcomingFollowups.map(r => (
            <div key={r.id} className="px-4 py-2.5 flex items-center gap-3 text-[12px] flex-wrap">
              <span className="font-bold text-zinc-300">{r.name}</span>
              <span className="text-zinc-600">{r.email}</span>
              <span className="text-zinc-600 ml-auto">{formatDate(r.followup_date ?? '')}</span>
              <span className="text-zinc-500">{r.remaining?.toLocaleString('sv-SE')} kr kvar</span>
            </div>
          ))}
        </div>
      )}

      {/* Datumfilter */}
      <div className="mb-6 bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-[10px] font-black tracking-[2px] uppercase text-zinc-500">Datumfilter</span>
          <input type="date" value={filterStart} onChange={e => setFilterStart(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-[12px] text-white [color-scheme:dark] focus:outline-none focus:border-zinc-500 cursor-pointer" />
          <span className="text-zinc-600 text-xs">→</span>
          <input type="date" value={filterEnd} onChange={e => setFilterEnd(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-[12px] text-white [color-scheme:dark] focus:outline-none focus:border-zinc-500 cursor-pointer" />
          {(filterStart || filterEnd) && (
            <button onClick={() => { setFilterStart(''); setFilterEnd('') }}
              className="text-zinc-600 hover:text-zinc-400 text-[11px] font-bold transition-colors ml-1">
              Rensa
            </button>
          )}
        </div>

        {rankedPayments.length > 0 && (
          <div className="mt-4">
            <div className="text-[9px] font-black tracking-[2px] uppercase text-zinc-600 mb-2">
              Betalningar — rankade efter storlek
            </div>
            <div className="space-y-1">
              {rankedPayments.map((r, i) => (
                <div key={r.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-zinc-800/40">
                  <span className="text-[11px] font-black text-zinc-600 w-5">{i + 1}</span>
                  <span className="text-[13px] font-bold text-white flex-1">{r.name}</span>
                  <span className="text-[11px] text-zinc-500">{formatDate(r.date)}</span>
                  <span className={`text-[11px] font-bold ${outcomeColor(r.outcome)}`}>{outcomeLabel(r.outcome)}</span>
                  <span className="text-[14px] font-black text-gold">{r.gross.toLocaleString('sv-SE')} kr</span>
                </div>
              ))}
            </div>
            <div className="mt-2 px-3 flex justify-between text-[11px] text-zinc-600">
              <span>{rankedPayments.length} betalningar</span>
              <span>Totalt: <span className="text-white font-bold">{rankedPayments.reduce((s, r) => s + r.gross, 0).toLocaleString('sv-SE')} kr</span></span>
            </div>
          </div>
        )}

        {(filterStart || filterEnd) && rankedPayments.length === 0 && (
          <div className="mt-3 text-[12px] text-zinc-600">Inga betalningar under vald period.</div>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-zinc-900 border border-zinc-700 rounded-xl p-5 mb-6 space-y-4">
          <div className="text-[10px] font-black tracking-[2px] uppercase text-zinc-500 mb-2">
            {editId ? 'Ändra samtal' : 'Nytt samtal'}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Datum" required>
              <DatePicker value={form.date} onChange={v => set('date', v)} required />
            </Field>
            <Field label="Namn på leaden" required>
              <input type="text" required placeholder="Förnamn Efternamn" value={form.name}
                onChange={e => set('name', e.target.value)} className={inputCls} />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Mejl" required>
              <input type="email" required placeholder="lead@example.com" value={form.email}
                onChange={e => set('email', e.target.value)} className={inputCls} />
            </Field>
            <Field label="Telefon">
              <input type="tel" placeholder="+46 70 000 00 00" value={form.phone}
                onChange={e => set('phone', e.target.value)} className={inputCls} />
            </Field>
          </div>

          <Field label="Outcome" required>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {OUTCOMES.map(o => (
                <button key={o.value} type="button" onClick={() => set('outcome', o.value)}
                  className={`text-left px-3 py-2.5 rounded-lg border text-[11px] font-bold transition-all ${
                    form.outcome === o.value
                      ? 'border-gold bg-gold/10 text-gold'
                      : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-600'
                  }`}>
                  {o.label}
                </button>
              ))}
            </div>
          </Field>

          {/* Bokad av — visas inte för upsells */}
          {isClosed(form.outcome) && !isUpsell(form.outcome) && (
            <Field label="Bokad av" required>
              <div className="flex gap-2 flex-wrap">
                {(['Edvard', 'Atlassi', 'Ellow', 'Direkt'] as Setter[]).map(s => (
                  <button key={s} type="button" onClick={() => set('booked_by', s)}
                    className={`px-4 py-2 rounded-lg border text-[11px] font-bold transition-all ${
                      form.booked_by === s
                        ? 'border-gold bg-gold/10 text-gold'
                        : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-600'
                    }`}>
                    {s}
                  </button>
                ))}
              </div>
            </Field>
          )}

          {/* Betalning — vanlig close */}
          {isClosed(form.outcome) && !isUpsell(form.outcome) && form.booked_by && (
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 space-y-4">
              <div className="text-[9px] font-bold tracking-[1.5px] uppercase text-zinc-600">Betalning</div>

              <Field label="Plattform" required>
                <div className="flex gap-3">
                  {(['whop', 'hotmart'] as Platform[]).map(p => (
                    <button key={p} type="button" onClick={() => set('platform', p)}
                      className={`px-4 py-2 rounded-lg border text-[11px] font-bold transition-all ${
                        form.platform === p
                          ? 'border-gold bg-gold/10 text-gold'
                          : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-600'
                      }`}>
                      {p === 'whop' ? 'Whop (–3.7%)' : 'Hotmart (–30%)'}
                    </button>
                  ))}
                </div>
              </Field>

              {!isPartial(form.outcome) ? (
                <Field label="Betalt belopp (kr)" required>
                  <input type="number" min={0} required placeholder="30000"
                    value={form.amount ?? ''}
                    onChange={e => set('amount', e.target.value ? Number(e.target.value) : undefined)}
                    className={inputCls} />
                  {form.amount && form.platform && (
                    <p className="text-[11px] text-green-400 mt-1">
                      Netto: {netRevenue(form.amount, form.platform).toLocaleString('sv-SE')} kr
                    </p>
                  )}
                </Field>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Field label="Betalt nu (kr)" required>
                    <input type="number" min={0} required placeholder="10000"
                      value={form.paid_now ?? ''}
                      onChange={e => set('paid_now', e.target.value ? Number(e.target.value) : undefined)}
                      className={inputCls} />
                    {form.paid_now && form.platform && (
                      <p className="text-[11px] text-green-400 mt-1">
                        Netto: {netRevenue(form.paid_now, form.platform).toLocaleString('sv-SE')} kr
                      </p>
                    )}
                  </Field>
                  <Field label="Resterande belopp (kr)" required>
                    <input type="number" min={0} required placeholder="20000"
                      value={form.remaining ?? ''}
                      onChange={e => set('remaining', e.target.value ? Number(e.target.value) : undefined)}
                      className={inputCls} />
                  </Field>
                  <Field label="Uppföljningsdatum" required>
                    <DatePicker value={form.followup_date ?? ''} onChange={v => set('followup_date', v)} required />
                    <p className="text-[11px] text-yellow-500 mt-1">Dialers påminns detta datum.</p>
                  </Field>
                </div>
              )}
            </div>
          )}

          {/* Upsell */}
          {isUpsell(form.outcome) && (
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 space-y-4">
              <div className="text-[9px] font-bold tracking-[1.5px] uppercase text-zinc-600">Betalning</div>
              <Field label="Plattform" required>
                <div className="flex gap-3">
                  {(['whop', 'hotmart'] as Platform[]).map(p => (
                    <button key={p} type="button" onClick={() => set('platform', p)}
                      className={`px-4 py-2 rounded-lg border text-[11px] font-bold transition-all ${
                        form.platform === p
                          ? 'border-gold bg-gold/10 text-gold'
                          : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-600'
                      }`}>
                      {p === 'whop' ? 'Whop (–3.7%)' : 'Hotmart (–30%)'}
                    </button>
                  ))}
                </div>
              </Field>

              {form.outcome === 'upsell' ? (
                <Field label="Belopp (kr)" required>
                  <input type="number" min={0} required placeholder="40000"
                    value={form.amount ?? ''}
                    onChange={e => set('amount', e.target.value ? Number(e.target.value) : undefined)}
                    className={inputCls} />
                  {form.amount && form.platform && (
                    <p className="text-[11px] text-green-400 mt-1">
                      Netto: {netRevenue(form.amount, form.platform).toLocaleString('sv-SE')} kr
                    </p>
                  )}
                </Field>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Field label="Betalt nu (kr)" required>
                    <input type="number" min={0} required placeholder="20000"
                      value={form.paid_now ?? ''}
                      onChange={e => set('paid_now', e.target.value ? Number(e.target.value) : undefined)}
                      className={inputCls} />
                    {form.paid_now && form.platform && (
                      <p className="text-[11px] text-green-400 mt-1">
                        Netto: {netRevenue(form.paid_now, form.platform).toLocaleString('sv-SE')} kr
                      </p>
                    )}
                  </Field>
                  <Field label="Resterande (kr)" required>
                    <input type="number" min={0} required placeholder="150000"
                      value={form.remaining ?? ''}
                      onChange={e => set('remaining', e.target.value ? Number(e.target.value) : undefined)}
                      className={inputCls} />
                  </Field>
                  <Field label="Uppföljningsdatum" required>
                    <DatePicker value={form.followup_date ?? ''} onChange={v => set('followup_date', v)} required />
                  </Field>
                </div>
              )}
            </div>
          )}

          <Field label="Anteckningar (valfritt)">
            <textarea rows={2} placeholder="Vad hände? Varför stängde / stängde inte?"
              value={form.notes} onChange={e => set('notes', e.target.value)}
              className={`${inputCls} resize-none`} />
          </Field>

          <div className="flex gap-3 pt-1">
            <button type="submit"
              className="bg-gold text-black font-black text-[11px] tracking-widest uppercase px-5 py-2.5 rounded-lg hover:opacity-90 transition-opacity">
              {editId ? 'Spara ändringar' : 'Spara samtal'}
            </button>
            <button type="button" onClick={cancelForm}
              className="text-zinc-500 hover:text-zinc-300 text-[11px] font-bold uppercase tracking-widest px-4 py-2.5 rounded-lg border border-zinc-800 transition-colors">
              Avbryt
            </button>
          </div>
        </form>
      )}

      {/* Reports list */}
      <div className="space-y-2">
        <div className="text-[9px] font-bold tracking-[1.5px] uppercase text-zinc-600 mb-3">
          Alla samtal ({reports.length})
        </div>
        {reports.length === 0 && (
          <div className="text-center text-zinc-700 py-12 text-sm">
            Inga samtal loggade än. Tryck "+ Nytt samtal" för att börja.
          </div>
        )}
        {reports.map(r => (
          <div key={r.id}
            className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2">
            <span className="text-[11px] text-zinc-600 min-w-[90px]">{formatDate(r.date)}</span>

            <div className="min-w-[180px]">
              <div className="font-bold text-[13px] text-white">{r.name}</div>
              <div className="text-[11px] text-zinc-500">{r.email}{r.phone ? ` · ${r.phone}` : ''}</div>
            </div>

            <span className={`text-[12px] font-bold ${outcomeColor(r.outcome)} min-w-[180px]`}>
              {outcomeLabel(r.outcome)}
            </span>

            <div className="min-w-[160px]">
              {r.outcome === 'closed_pif' && r.amount && r.platform && (
                <div className="text-green-400 text-[12px] font-bold">
                  {r.amount.toLocaleString('sv-SE')} kr
                  <span className="text-[10px] text-green-600 ml-1">
                    (netto {netRevenue(r.amount, r.platform).toLocaleString('sv-SE')} kr)
                  </span>
                </div>
              )}
              {r.outcome === 'closed_partial' && r.paid_now && r.platform && (
                <div>
                  <div className="text-emerald-400 text-[12px] font-bold">
                    Betalt: {r.paid_now.toLocaleString('sv-SE')} kr
                  </div>
                  <div className="text-yellow-400 text-[11px]">
                    Resterande: {r.remaining?.toLocaleString('sv-SE')} kr · {formatDate(r.followup_date ?? '')}
                  </div>
                </div>
              )}
              {r.outcome === 'upsell' && r.amount && r.platform && (
                <div className="text-purple-400 text-[12px] font-bold">
                  {r.amount.toLocaleString('sv-SE')} kr
                  <span className="text-[10px] text-purple-600 ml-1">
                    (netto {netRevenue(r.amount, r.platform).toLocaleString('sv-SE')} kr)
                  </span>
                </div>
              )}
              {r.outcome === 'upsell_partial' && r.paid_now && r.platform && (
                <div>
                  <div className="text-purple-400 text-[12px] font-bold">
                    Betalt: {r.paid_now.toLocaleString('sv-SE')} kr
                  </div>
                  <div className="text-yellow-400 text-[11px]">
                    Resterande: {r.remaining?.toLocaleString('sv-SE')} kr · {formatDate(r.followup_date ?? '')}
                  </div>
                </div>
              )}
            </div>

            {r.notes && (
              <span className="text-[11px] text-zinc-500 flex-1 truncate">{r.notes}</span>
            )}

            <div className="ml-auto flex-shrink-0 flex items-center gap-3">
              <button
                onClick={() => openEdit(r)}
                className="text-zinc-500 hover:text-gold text-[11px] font-bold transition-colors"
              >
                Ändra
              </button>
              {deleteId === r.id ? (
                <div className="flex gap-2 items-center">
                  <span className="text-[11px] text-red-400">Radera?</span>
                  <button onClick={() => handleDelete(r.id)}
                    className="text-[11px] font-bold text-red-400 hover:text-red-300 px-2 py-1 border border-red-700 rounded">
                    Ja
                  </button>
                  <button onClick={() => setDeleteId(null)}
                    className="text-[11px] text-zinc-500 hover:text-zinc-300 px-2 py-1 border border-zinc-700 rounded">
                    Nej
                  </button>
                </div>
              ) : (
                <button onClick={() => setDeleteId(r.id)}
                  className="text-zinc-700 hover:text-red-400 text-[11px] transition-colors">
                  Radera
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] font-bold tracking-[1px] uppercase text-zinc-500 mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

function DatePicker({ value, onChange, required }: { value: string; onChange: (v: string) => void; required?: boolean }) {
  return (
    <input
      type="date"
      required={required}
      value={value}
      onChange={e => onChange(e.target.value)}
      className={`${inputCls} [color-scheme:dark] cursor-pointer`}
    />
  )
}

const inputCls = 'w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-zinc-700 focus:outline-none focus:border-zinc-600 transition-colors'
