'use client'
import { useState, useEffect } from 'react'

type DialerOutcome = 'booked' | 'dq' | 'callback' | 'no_answer' | 'not_interested'
type Dialer = 'Edvard' | 'Atlassi'

interface DialerReport {
  id: string
  date: string
  dialer: Dialer
  name: string
  phone: string
  instagram: string
  age: string

  job: string
  job_duration: string
  can_invest: string
  motivation: string
  outcome: DialerOutcome
  booking_date: string
  callback_date: string
  notes: string
  created_at: string
}

const OUTCOMES: { value: DialerOutcome; label: string; color: string }[] = [
  { value: 'booked',         label: 'Bokad',           color: 'text-green-400' },
  { value: 'callback',       label: 'Återring',        color: 'text-blue-400' },
  { value: 'no_answer',      label: 'Svarade inte',    color: 'text-zinc-400' },
  { value: 'not_interested', label: 'Inte intresserad', color: 'text-orange-400' },
  { value: 'dq',             label: 'DQ',              color: 'text-red-400' },
]

function outcomeLabel(o: DialerOutcome) { return OUTCOMES.find(x => x.value === o)?.label ?? o }
function outcomeColor(o: DialerOutcome) { return OUTCOMES.find(x => x.value === o)?.color ?? 'text-zinc-400' }

async function loadReports(): Promise<DialerReport[]> {
  const res = await fetch('/api/dialer-reports')
  if (!res.ok) return []
  return res.json()
}

async function saveReports(r: DialerReport[]) {
  await fetch('/api/dialer-reports', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(r),
  })
}

function todayStr() { return new Date().toISOString().split('T')[0] }

function formatDate(v: string) {
  if (!v) return '—'
  const [y, m, d] = v.split('-')
  return `${d}/${m}/${y}`
}

const emptyForm = (): Omit<DialerReport, 'id' | 'created_at'> => ({
  date: todayStr(),
  dialer: 'Edvard',
  name: '',
  phone: '',
  instagram: '',
  age: '',

  job: '',
  job_duration: '',
  can_invest: '',
  motivation: '',
  outcome: 'booked',
  booking_date: '',
  callback_date: '',
  notes: '',
})

export default function DialerReportsPage() {
  const [reports, setReports] = useState<DialerReport[]>([])
  const [form, setForm] = useState(emptyForm())
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [filter, setFilter] = useState<DialerOutcome | 'all'>('all')
  const [dialerFilter, setDialerFilter] = useState<Dialer | 'all'>('all')

  useEffect(() => { loadReports().then(setReports) }, [])

  const today = todayStr()
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().split('T')[0]

  const callbackToday = reports.filter(r => r.outcome === 'callback' && r.callback_date === today)
  const callbackTomorrow = reports.filter(r => r.outcome === 'callback' && r.callback_date === tomorrowStr)

  function set<K extends keyof typeof form>(key: K, val: typeof form[K]) {
    setForm(prev => ({ ...prev, [key]: val }))
  }

  function openNew() {
    setEditId(null)
    setForm(emptyForm())
    setShowForm(true)
  }

  function openEdit(r: DialerReport) {
    setEditId(r.id)
    const { id, created_at, ...rest } = r
    setForm(rest)
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    let updated: DialerReport[]
    if (editId) {
      updated = reports.map(r => r.id === editId ? { ...form, id: r.id, created_at: r.created_at } : r)
    } else {
      updated = [{ ...form, id: Date.now().toString(), created_at: new Date().toISOString() }, ...reports]
    }
    setReports(updated)
    await saveReports(updated)
    setForm(emptyForm())
    setShowForm(false)
    setEditId(null)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  async function handleDelete(id: string) {
    const updated = reports.filter(r => r.id !== id)
    setReports(updated)
    await saveReports(updated)
    setDeleteId(null)
  }

  const thisWeek = reports.filter(r => {
    const d = new Date(r.date + 'T00:00:00')
    const mon = new Date()
    mon.setDate(mon.getDate() - ((mon.getDay() + 6) % 7))
    mon.setHours(0, 0, 0, 0)
    return d >= mon
  })

  const thisWeekFiltered = dialerFilter === 'all' ? thisWeek : thisWeek.filter(r => r.dialer === dialerFilter)

  const stats = {
    total:    thisWeekFiltered.length,
    booked:   thisWeekFiltered.filter(r => r.outcome === 'booked').length,
    dq:       thisWeekFiltered.filter(r => r.outcome === 'dq').length,
    callback: thisWeekFiltered.filter(r => r.outcome === 'callback').length,
  }

  const byDialer  = dialerFilter === 'all' ? reports : reports.filter(r => r.dialer === dialerFilter)
  const filtered  = filter === 'all' ? byDialer : byDialer.filter(r => r.outcome === filter)

  return (
    <div className="p-6 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold">Dialer Reports</h1>
          <p className="text-xs text-zinc-500 mt-0.5">Logga varje samtal direkt efter — namn, situation, outcome</p>
        </div>
        <button onClick={openNew}
          className="bg-gold text-black font-black text-[11px] tracking-widest uppercase px-4 py-2 rounded-lg hover:opacity-90 transition-opacity">
          + Nytt samtal
        </button>
      </div>

      {/* Återring idag */}
      {callbackToday.length > 0 && (
        <div className="mb-4 bg-red-950/60 border border-red-700 rounded-xl p-4">
          <div className="text-[10px] font-black tracking-[2px] uppercase text-red-400 mb-2">
            Ring idag — {callbackToday.length} återring
          </div>
          <div className="space-y-2">
            {callbackToday.map(r => (
              <div key={r.id} className="flex items-center gap-3 text-sm flex-wrap">
                <span className="font-bold text-white">{r.name}</span>
                {r.phone && <span className="text-zinc-400">{r.phone}</span>}
                {r.instagram && <span className="text-zinc-400">@{r.instagram}</span>}
                <span className="text-zinc-500 ml-auto">{r.dialer}</span>
                <button onClick={() => openEdit(r)} className="text-[11px] text-red-300 underline">Ändra</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Återring imorgon */}
      {callbackTomorrow.length > 0 && (
        <div className="mb-4 bg-orange-950/50 border border-orange-600 rounded-xl p-4">
          <div className="text-[10px] font-black tracking-[2px] uppercase text-orange-400 mb-2">
            Förbered återring imorgon — {callbackTomorrow.length} person{callbackTomorrow.length > 1 ? 'er' : ''}
          </div>
          <div className="space-y-2">
            {callbackTomorrow.map(r => (
              <div key={r.id} className="flex items-center gap-3 text-sm flex-wrap">
                <span className="font-bold text-white">{r.name}</span>
                {r.phone && <span className="text-zinc-400">{r.phone}</span>}
                {r.instagram && <span className="text-zinc-400">@{r.instagram}</span>}
                <span className="text-zinc-500 ml-auto">{r.dialer}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {saved && (
        <div className="mb-4 bg-green-950/50 border border-green-700 rounded-xl p-3 text-sm text-green-400 font-bold">
          Sparat.
        </div>
      )}

      {/* Dialer filter */}
      <div className="flex gap-2 mb-4">
        {([['all', 'Alla'], ['Edvard', 'Edvard'], ['Atlassi', 'Atlassi']] as [string, string][]).map(([val, label]) => (
          <button key={val} onClick={() => setDialerFilter(val as Dialer | 'all')}
            className={`px-4 py-2 rounded-lg border text-[11px] font-black uppercase tracking-widest transition-all ${
              dialerFilter === val
                ? 'border-gold bg-gold/10 text-gold'
                : 'border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Samtal denna vecka', val: stats.total,    color: 'text-white' },
          { label: 'Bokade',             val: stats.booked,   color: 'text-green-400' },
          { label: 'DQ',                 val: stats.dq,       color: 'text-red-400' },
          { label: 'Återring',           val: stats.callback, color: 'text-blue-400' },
        ].map(s => (
          <div key={s.label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="text-[9px] font-bold tracking-[1.5px] uppercase text-zinc-600 mb-1">{s.label}</div>
            <div className={`text-2xl font-extrabold ${s.color}`}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-zinc-900 border border-zinc-700 rounded-xl p-5 mb-6 space-y-4">
          <div className="text-[10px] font-black tracking-[2px] uppercase text-zinc-500">
            {editId ? 'Ändra samtal' : 'Nytt samtal'}
          </div>

          {/* Datum + Dialer */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Datum" required>
              <input type="date" required value={form.date}
                onChange={e => set('date', e.target.value)}
                className={`${inputCls} [color-scheme:dark] cursor-pointer`} />
            </Field>
            <Field label="Dialer" required>
              <div className="flex gap-3">
                {(['Edvard', 'Atlassi'] as Dialer[]).map(d => (
                  <button key={d} type="button" onClick={() => set('dialer', d)}
                    className={`flex-1 py-2.5 rounded-lg border text-[11px] font-bold transition-all ${
                      form.dialer === d
                        ? 'border-gold bg-gold/10 text-gold'
                        : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-600'
                    }`}>
                    {d}
                  </button>
                ))}
              </div>
            </Field>
          </div>

          {/* Kontaktinfo */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Namn" required>
              <input type="text" required placeholder="Förnamn Efternamn" value={form.name}
                onChange={e => set('name', e.target.value)} className={inputCls} />
            </Field>
            <Field label="Telefon">
              <input type="tel" placeholder="+46 70 000 00 00" value={form.phone}
                onChange={e => set('phone', e.target.value)} className={inputCls} />
            </Field>
            <Field label="Instagram">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 text-sm">@</span>
                <input type="text" placeholder="användarnamn" value={form.instagram}
                  onChange={e => set('instagram', e.target.value)}
                  className={`${inputCls} pl-7`} />
              </div>
            </Field>
          </div>

          {/* Kvalificering */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 space-y-4">
            <div className="text-[9px] font-bold tracking-[1.5px] uppercase text-zinc-600">Kvalificering</div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Field label="Ålder">
                <input type="number" min={16} max={65} placeholder="22" value={form.age}
                  onChange={e => set('age', e.target.value)} className={inputCls} />
              </Field>

              <Field label="Vad jobbar de med">
                <input type="text" placeholder="Lagerarbetare, kassör..." value={form.job}
                  onChange={e => set('job', e.target.value)} className={inputCls} />
              </Field>
              <Field label="Hur länge">
                <input type="text" placeholder="2 år, 6 månader..." value={form.job_duration}
                  onChange={e => set('job_duration', e.target.value)} className={inputCls} />
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Hur mycket kan de investera">
                <input type="text" placeholder="20 000 kr, har inte råd nu..." value={form.can_invest}
                  onChange={e => set('can_invest', e.target.value)} className={inputCls} />
              </Field>
              <Field label="Varför vill de förändra sin situation">
                <input type="text" placeholder="Hjälpa familjen, slippa jobba 9–5..." value={form.motivation}
                  onChange={e => set('motivation', e.target.value)} className={inputCls} />
              </Field>
            </div>
          </div>

          {/* Outcome */}
          <Field label="Outcome" required>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {OUTCOMES.map(o => (
                <button key={o.value} type="button" onClick={() => set('outcome', o.value)}
                  className={`px-3 py-2.5 rounded-lg border text-[11px] font-bold transition-all ${
                    form.outcome === o.value
                      ? 'border-gold bg-gold/10 text-gold'
                      : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-600'
                  }`}>
                  {o.label}
                </button>
              ))}
            </div>
          </Field>

          {/* Bokad — datum */}
          {form.outcome === 'booked' && (
            <Field label="Datum för samtalet med Lobo" required>
              <input type="date" required value={form.booking_date}
                onChange={e => set('booking_date', e.target.value)}
                className={`${inputCls} [color-scheme:dark] cursor-pointer max-w-xs`} />
            </Field>
          )}

          {/* Återring — datum */}
          {form.outcome === 'callback' && (
            <Field label="Återring datum" required>
              <input type="date" required value={form.callback_date}
                onChange={e => set('callback_date', e.target.value)}
                className={`${inputCls} [color-scheme:dark] cursor-pointer max-w-xs`} />
            </Field>
          )}

          {/* Anteckningar */}
          <Field label="Anteckningar (valfritt)">
            <textarea rows={2} placeholder="Övrigt om leaden..."
              value={form.notes} onChange={e => set('notes', e.target.value)}
              className={`${inputCls} resize-none`} />
          </Field>

          <div className="flex gap-3 pt-1">
            <button type="submit"
              className="bg-gold text-black font-black text-[11px] tracking-widest uppercase px-5 py-2.5 rounded-lg hover:opacity-90 transition-opacity">
              {editId ? 'Spara ändringar' : 'Spara'}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setEditId(null); setForm(emptyForm()) }}
              className="text-zinc-500 hover:text-zinc-300 text-[11px] font-bold uppercase tracking-widest px-4 py-2.5 rounded-lg border border-zinc-800 transition-colors">
              Avbryt
            </button>
          </div>
        </form>
      )}

      {/* Filter */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {([['all', 'Alla'], ...OUTCOMES.map(o => [o.value, o.label])] as [string, string][]).map(([val, label]) => (
          <button key={val} onClick={() => setFilter(val as DialerOutcome | 'all')}
            className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold uppercase tracking-wide transition-all ${
              filter === val
                ? 'border-gold bg-gold/10 text-gold'
                : 'border-zinc-800 text-zinc-600 hover:border-zinc-600 hover:text-zinc-400'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-2">
        <div className="text-[9px] font-bold tracking-[1.5px] uppercase text-zinc-600 mb-3">
          {filter === 'all' ? `Alla leads (${reports.length})` : `${outcomeLabel(filter as DialerOutcome)} (${filtered.length})`}
        </div>
        {filtered.length === 0 && (
          <div className="text-center text-zinc-700 py-12 text-sm">Inga samtal loggade.</div>
        )}
        {filtered.map(r => (
          <div key={r.id} className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3">

            {/* Top row: outcome + meta + actions */}
            <div className="flex items-center gap-3 mb-3">
              <span className={`text-[12px] font-bold ${outcomeColor(r.outcome)}`}>
                {outcomeLabel(r.outcome)}
                {r.outcome === 'booked' && r.booking_date && (
                  <span className="text-zinc-500 font-normal ml-1">· {formatDate(r.booking_date)}</span>
                )}
                {r.outcome === 'callback' && r.callback_date && (
                  <span className="text-zinc-500 font-normal ml-1">· {formatDate(r.callback_date)}</span>
                )}
              </span>
              <span className="text-[10px] text-zinc-700 ml-auto">{r.dialer} · {formatDate(r.date)}</span>
              <button onClick={() => openEdit(r)}
                className="text-zinc-500 hover:text-gold text-[11px] font-bold transition-colors">Ändra</button>
              {deleteId === r.id ? (
                <div className="flex gap-2 items-center">
                  <button onClick={() => handleDelete(r.id)}
                    className="text-[11px] font-bold text-red-400 px-2 py-1 border border-red-700 rounded">Ja</button>
                  <button onClick={() => setDeleteId(null)}
                    className="text-[11px] text-zinc-500 px-2 py-1 border border-zinc-700 rounded">Nej</button>
                </div>
              ) : (
                <button onClick={() => setDeleteId(r.id)}
                  className="text-zinc-700 hover:text-red-400 text-[11px] transition-colors">Radera</button>
              )}
            </div>

            {/* Key info grid */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 border-t border-zinc-800/60 pt-3">
              <InfoCell label="Namn" value={r.name} bold />
              <InfoCell label="Ålder" value={r.age ? `${r.age} år` : '—'} />
              <InfoCell label="Instagram" value={r.instagram ? `@${r.instagram}` : '—'} />
              <InfoCell label="Hur länge jobbat" value={r.job_duration || '—'} />
              <InfoCell label="Kan investera" value={r.can_invest || '—'} highlight />
            </div>

            {/* Extra context */}
            {(r.job || r.motivation || r.notes) && (
              <div className="mt-2 pt-2 border-t border-zinc-800/40 flex gap-4 text-[11px] text-zinc-600 flex-wrap">
                {r.job && <span>Jobbar som: <span className="text-zinc-400">{r.job}</span></span>}
                {r.motivation && <span>Motivation: <span className="text-zinc-400">{r.motivation}</span></span>}
                {r.notes && <span>Anteckning: <span className="text-zinc-400">{r.notes}</span></span>}
              </div>
            )}
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

function InfoCell({ label, value, bold, highlight }: { label: string; value: string; bold?: boolean; highlight?: boolean }) {
  return (
    <div>
      <div className="text-[9px] font-bold tracking-[1px] uppercase text-zinc-600 mb-0.5">{label}</div>
      <div className={`text-[13px] ${highlight ? 'text-gold font-bold' : bold ? 'text-white font-bold' : 'text-zinc-300'}`}>
        {value}
      </div>
    </div>
  )
}

const inputCls = 'w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-zinc-700 focus:outline-none focus:border-zinc-600 transition-colors'
