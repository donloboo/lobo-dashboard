'use client'
import { useState, useEffect } from 'react'

interface SetterReport {
  id: string
  date: string
  dms_sent: number
  convos: number
  inbound: number
  booked: number
  notes: string
  created_at: string
}

async function loadReports(): Promise<SetterReport[]> {
  const res = await fetch('/api/setter-reports')
  if (!res.ok) return []
  return res.json()
}

async function saveReports(r: SetterReport[]) {
  await fetch('/api/setter-reports', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(r),
  })
}

function todayStr() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

function formatDate(v: string) {
  if (!v) return '—'
  const [y, m, d] = v.split('-')
  return `${d}/${m}/${y}`
}

function pct(a: number, b: number) {
  if (!b) return '—'
  return `${Math.round((a / b) * 100)}%`
}

const emptyForm = () => ({
  date: todayStr(),
  dms_sent: '' as number | '',
  convos: '' as number | '',
  inbound: '' as number | '',
  booked: '' as number | '',
  notes: '',
})

export default function SetterReportsPage() {
  const [reports, setReports] = useState<SetterReport[]>([])
  const [form, setForm] = useState(emptyForm())
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  useEffect(() => { loadReports().then(setReports) }, [])

  function set<K extends keyof ReturnType<typeof emptyForm>>(key: K, val: ReturnType<typeof emptyForm>[K]) {
    setForm(prev => ({ ...prev, [key]: val }))
  }

  function openNew() {
    setEditId(null)
    setForm(emptyForm())
    setShowForm(true)
  }

  function openEdit(r: SetterReport) {
    setEditId(r.id)
    setForm({
      date: r.date,
      dms_sent: r.dms_sent,
      convos: r.convos,
      inbound: r.inbound,
      booked: r.booked,
      notes: r.notes,
    })
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const entry: SetterReport = {
      id: editId ?? Date.now().toString(),
      date: form.date,
      dms_sent: Number(form.dms_sent) || 0,
      convos: Number(form.convos) || 0,
      inbound: Number(form.inbound) || 0,
      booked: Number(form.booked) || 0,
      notes: form.notes,
      created_at: editId
        ? (reports.find(r => r.id === editId)?.created_at ?? new Date().toISOString())
        : new Date().toISOString(),
    }

    const updated = editId
      ? reports.map(r => r.id === editId ? entry : r)
      : [entry, ...reports]

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

  const week = {
    dms:     thisWeek.reduce((s, r) => s + r.dms_sent, 0),
    convos:  thisWeek.reduce((s, r) => s + r.convos,   0),
    inbound: thisWeek.reduce((s, r) => s + r.inbound,  0),
    booked:  thisWeek.reduce((s, r) => s + r.booked,   0),
  }

  const DMS_DAY = 60
  const CONVOS_DAY = 15
  const BOOKED_DAY = 2

  function barColor(val: number, target: number) {
    const p = val / target
    if (p >= 1) return 'bg-green-400'
    if (p >= 0.8) return 'bg-orange-400'
    return 'bg-red-400'
  }

  function numColor(val: number, target: number) {
    const p = val / target
    if (p >= 1) return 'text-green-400'
    if (p >= 0.8) return 'text-orange-400'
    return val > 0 ? 'text-red-400' : 'text-zinc-500'
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold">Setter Report</h1>
          <p className="text-xs text-zinc-500 mt-0.5">Ellow — DM-setter daglig logg</p>
        </div>
        <button onClick={openNew}
          className="bg-gold text-black font-black text-[11px] tracking-widest uppercase px-4 py-2 rounded-lg hover:opacity-90 transition-opacity">
          + Ny rapport
        </button>
      </div>

      {/* Weekly KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
        {[
          { label: 'DMs Skickade',   val: week.dms,     target: DMS_DAY * 5,    suffix: '' },
          { label: 'Konversationer', val: week.convos,   target: CONVOS_DAY * 5, suffix: '' },
          { label: 'Inkommande',     val: week.inbound,  target: 0,              suffix: '' },
          { label: 'Bokade',         val: week.booked,   target: BOOKED_DAY * 5, suffix: '' },
        ].map(s => (
          <div key={s.label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="text-[9px] font-bold tracking-[1.5px] uppercase text-zinc-600 mb-1">{s.label}</div>
            <div className={`text-2xl font-extrabold ${s.target ? numColor(s.val, s.target) : 'text-blue-400'}`}>
              {s.val}
            </div>
            {s.target > 0 && (
              <div className="mt-2">
                <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${barColor(s.val, s.target)}`}
                    style={{ width: `${Math.min(100, (s.val / s.target) * 100)}%` }}
                  />
                </div>
                <div className="text-[10px] text-zinc-600 mt-1">Mål: {s.target}/vecka</div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Rates */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl px-4 py-3 flex items-center gap-4">
          <div>
            <div className="text-[9px] font-bold tracking-[1.5px] uppercase text-zinc-600">Svarsfrekvens</div>
            <div className="text-xl font-extrabold text-white">{pct(week.convos, week.dms)}</div>
          </div>
          <div className="text-[10px] text-zinc-700">Mål: 25%</div>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl px-4 py-3 flex items-center gap-4">
          <div>
            <div className="text-[9px] font-bold tracking-[1.5px] uppercase text-zinc-600">Bokningsfrekvens</div>
            <div className="text-xl font-extrabold text-white">{pct(week.booked, week.convos)}</div>
          </div>
          <div className="text-[10px] text-zinc-700">Mål: 15%</div>
        </div>
      </div>

      {saved && (
        <div className="mb-4 bg-green-950/50 border border-green-700 rounded-xl p-3 text-sm text-green-400 font-bold">
          {editId ? 'Rapport uppdaterad.' : 'Rapport sparad — scorekarden uppdateras automatiskt.'}
        </div>
      )}

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-zinc-900 border border-zinc-700 rounded-xl p-5 mb-6 space-y-4">
          <div className="text-[10px] font-black tracking-[2px] uppercase text-zinc-500">
            {editId ? 'Ändra rapport' : 'Ny rapport'}
          </div>

          <Field label="Datum" required>
            <input type="date" required value={form.date}
              onChange={e => set('date', e.target.value)}
              className={`${inputCls} [color-scheme:dark] cursor-pointer max-w-xs`} />
          </Field>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Field label="DMs skickade" required>
              <input type="number" min={0} required placeholder="60"
                value={form.dms_sent}
                onChange={e => set('dms_sent', e.target.value === '' ? '' : Number(e.target.value))}
                onFocus={e => e.target.select()}
                className={inputCls} />
              <p className="text-[10px] text-zinc-700 mt-1">Mål: {DMS_DAY}/dag</p>
            </Field>

            <Field label="Svar" required>
              <input type="number" min={0} required placeholder="15"
                value={form.convos}
                onChange={e => set('convos', e.target.value === '' ? '' : Number(e.target.value))}
                onFocus={e => e.target.select()}
                className={inputCls} />
              <p className="text-[10px] text-zinc-700 mt-1">Mål: {CONVOS_DAY}/dag</p>
            </Field>

            <Field label="Inkommande DMs">
              <input type="number" min={0} placeholder="0"
                value={form.inbound}
                onChange={e => set('inbound', e.target.value === '' ? '' : Number(e.target.value))}
                onFocus={e => e.target.select()}
                className={inputCls} />
              <p className="text-[10px] text-zinc-700 mt-1">Skriver till oss</p>
            </Field>

            <Field label="Bokade" required>
              <input type="number" min={0} required placeholder="2"
                value={form.booked}
                onChange={e => set('booked', e.target.value === '' ? '' : Number(e.target.value))}
                onFocus={e => e.target.select()}
                className={inputCls} />
              <p className="text-[10px] text-zinc-700 mt-1">Mål: {BOOKED_DAY}/dag</p>
            </Field>
          </div>

          {/* Live rates */}
          {(Number(form.dms_sent) > 0 || Number(form.convos) > 0) && (
            <div className="flex gap-6 bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-[12px]">
              <span className="text-zinc-500">Svarsfrekvens:
                <span className="text-white font-bold ml-1">
                  {pct(Number(form.convos) || 0, Number(form.dms_sent) || 0)}
                </span>
              </span>
              <span className="text-zinc-500">Bokningsfrekvens:
                <span className="text-white font-bold ml-1">
                  {pct(Number(form.booked) || 0, Number(form.convos) || 0)}
                </span>
              </span>
            </div>
          )}

          <Field label="Anteckningar (valfritt)">
            <textarea rows={2} placeholder="Vad gick bra? Vad var svårt idag?"
              value={form.notes} onChange={e => set('notes', e.target.value)}
              className={`${inputCls} resize-none`} />
          </Field>

          <div className="flex gap-3 pt-1">
            <button type="submit"
              className="bg-gold text-black font-black text-[11px] tracking-widest uppercase px-5 py-2.5 rounded-lg hover:opacity-90 transition-opacity">
              {editId ? 'Spara ändringar' : 'Spara rapport'}
            </button>
            <button type="button"
              onClick={() => { setShowForm(false); setEditId(null); setForm(emptyForm()) }}
              className="text-zinc-500 hover:text-zinc-300 text-[11px] font-bold uppercase tracking-widest px-4 py-2.5 rounded-lg border border-zinc-800 transition-colors">
              Avbryt
            </button>
          </div>
        </form>
      )}

      {/* Log */}
      <div className="space-y-2">
        <div className="text-[9px] font-bold tracking-[1.5px] uppercase text-zinc-600 mb-3">
          Alla rapporter ({reports.length})
        </div>
        {reports.length === 0 && (
          <div className="text-center text-zinc-700 py-12 text-sm">
            Inga rapporter än. Tryck "+ Ny rapport" för att börja.
          </div>
        )}
        {reports.map(r => {
          const respRate = pct(r.convos, r.dms_sent)
          const bookRate = pct(r.booked, r.convos)
          return (
            <div key={r.id} className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-[11px] text-zinc-500 font-bold">{formatDate(r.date)}</span>
                <div className="ml-auto flex gap-3 items-center">
                  <button onClick={() => openEdit(r)}
                    className="text-zinc-500 hover:text-gold text-[11px] font-bold transition-colors">
                    Ändra
                  </button>
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
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <StatCell label="DMs skickade" val={r.dms_sent} target={DMS_DAY} />
                <StatCell label="Svar"          val={r.convos}   target={CONVOS_DAY} />
                <StatCell label="Inkommande"    val={r.inbound}  />
                <StatCell label="Bokade"        val={r.booked}   target={BOOKED_DAY} />
                <div>
                  <div className="text-[9px] font-bold tracking-[1px] uppercase text-zinc-600 mb-0.5">Frekvenser</div>
                  <div className="text-[12px] text-zinc-400">
                    Svar {respRate} · Bok {bookRate}
                  </div>
                </div>
              </div>

              {r.notes && (
                <p className="mt-2 pt-2 border-t border-zinc-800/40 text-[11px] text-zinc-500">{r.notes}</p>
              )}
            </div>
          )
        })}
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

function StatCell({ label, val, target }: { label: string; val: number; target?: number }) {
  function color() {
    if (!target) return 'text-blue-400'
    const p = val / target
    if (p >= 1) return 'text-green-400'
    if (p >= 0.8) return 'text-orange-400'
    return val > 0 ? 'text-red-400' : 'text-zinc-500'
  }
  return (
    <div>
      <div className="text-[9px] font-bold tracking-[1px] uppercase text-zinc-600 mb-0.5">{label}</div>
      <div className={`text-[18px] font-extrabold ${color()}`}>{val}</div>
      {target && <div className="text-[9px] text-zinc-700">Mål: {target}</div>}
    </div>
  )
}

const inputCls = 'w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-zinc-700 focus:outline-none focus:border-zinc-600 transition-colors'
