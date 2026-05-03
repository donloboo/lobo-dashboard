'use client'
import { useState, useEffect } from 'react'

interface PikzReport {
  id: string
  date: string
  vsl_visits: number
  vsl_plays: number
  apps_org: number
  apps_meta: number
  ad_spend: number
  notes: string
  created_at: string
}

async function loadReports(): Promise<PikzReport[]> {
  const res = await fetch('/api/pikz-reports')
  if (!res.ok) return []
  return res.json()
}

async function saveReports(r: PikzReport[]) {
  await fetch('/api/pikz-reports', {
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

function cpl(spend: number, leads: number) {
  if (!leads || !spend) return '—'
  return `${Math.round(spend / leads)} kr`
}

const emptyForm = () => ({
  date: todayStr(),
  vsl_visits: '' as number | '',
  vsl_plays:  '' as number | '',
  apps_org:   '' as number | '',
  apps_meta:  '' as number | '',
  ad_spend:   '' as number | '',
  notes: '',
})

export default function PikzReportsPage() {
  const [reports, setReports] = useState<PikzReport[]>([])
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

  function openEdit(r: PikzReport) {
    setEditId(r.id)
    setForm({
      date: r.date,
      vsl_visits: r.vsl_visits,
      vsl_plays:  r.vsl_plays,
      apps_org:   r.apps_org,
      apps_meta:  r.apps_meta,
      ad_spend:   r.ad_spend,
      notes: r.notes,
    })
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const entry: PikzReport = {
      id: editId ?? Date.now().toString(),
      date:       form.date,
      vsl_visits: Number(form.vsl_visits) || 0,
      vsl_plays:  Number(form.vsl_plays)  || 0,
      apps_org:   Number(form.apps_org)   || 0,
      apps_meta:  Number(form.apps_meta)  || 0,
      ad_spend:   Number(form.ad_spend)   || 0,
      notes:      form.notes,
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
    visits:   thisWeek.reduce((s, r) => s + r.vsl_visits, 0),
    plays:    thisWeek.reduce((s, r) => s + r.vsl_plays,  0),
    apps_org: thisWeek.reduce((s, r) => s + r.apps_org,   0),
    apps_meta:thisWeek.reduce((s, r) => s + r.apps_meta,  0),
    spend:    thisWeek.reduce((s, r) => s + r.ad_spend,   0),
  }
  const week_apps = week.apps_org + week.apps_meta

  // Live form calcs
  const fVisits = Number(form.vsl_visits) || 0
  const fPlays  = Number(form.vsl_plays)  || 0
  const fOrg    = Number(form.apps_org)   || 0
  const fMeta   = Number(form.apps_meta)  || 0
  const fSpend  = Number(form.ad_spend)   || 0

  return (
    <div className="p-6 max-w-3xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold">Pikz Report</h1>
          <p className="text-xs text-zinc-500 mt-0.5">VSL-funnel & ansökningar — daglig logg</p>
        </div>
        <button onClick={openNew}
          className="bg-gold text-black font-black text-[11px] tracking-widest uppercase px-4 py-2 rounded-lg hover:opacity-90 transition-opacity">
          + Ny rapport
        </button>
      </div>

      {/* Weekly KPI cards — rad 1 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
        <KpiCard label="VSL Besök"    val={week.visits}   color="text-white" />
        <KpiCard label="VSL Plays"    val={week.plays}    color="text-white" />
        <KpiCard label="Play Rate"    val={pct(week.plays, week.visits)}   color="text-blue-400" isStr />
        <KpiCard label="Totalt Apps"  val={week_apps}     color="text-gold" />
      </div>

      {/* Weekly KPI cards — rad 2 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <KpiCard label="Ansökn. Organisk" val={week.apps_org}  color="text-green-400" />
        <KpiCard label="Ansökn. Meta"     val={week.apps_meta} color="text-blue-400" />
        <KpiCard label="Meta Annonsbudget" val={week.spend > 0 ? `${week.spend.toLocaleString('sv-SE')} kr` : '—'} color="text-orange-400" isStr />
        <KpiCard label="CPL (Meta)"       val={cpl(week.spend, week.apps_meta)} color="text-orange-400" isStr />
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

          {/* VSL */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 space-y-4">
            <div className="text-[9px] font-bold tracking-[1.5px] uppercase text-zinc-600">VSL</div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Sidbesök" required>
                <input type="number" min={0} required placeholder="0"
                  value={form.vsl_visits}
                  onChange={e => set('vsl_visits', e.target.value === '' ? '' : Number(e.target.value))}
                  onFocus={e => e.target.select()} className={inputCls} />
              </Field>
              <Field label="Plays" required>
                <input type="number" min={0} required placeholder="0"
                  value={form.vsl_plays}
                  onChange={e => set('vsl_plays', e.target.value === '' ? '' : Number(e.target.value))}
                  onFocus={e => e.target.select()} className={inputCls} />
              </Field>
            </div>
            {fVisits > 0 && (
              <p className="text-[11px] text-zinc-500">
                Play rate: <span className="text-white font-bold">{pct(fPlays, fVisits)}</span>
              </p>
            )}
          </div>

          {/* Ansökningar */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 space-y-4">
            <div className="text-[9px] font-bold tracking-[1.5px] uppercase text-zinc-600">Ansökningar</div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Organisk" required>
                <input type="number" min={0} required placeholder="0"
                  value={form.apps_org}
                  onChange={e => set('apps_org', e.target.value === '' ? '' : Number(e.target.value))}
                  onFocus={e => e.target.select()} className={inputCls} />
              </Field>
              <Field label="Meta Ads" required>
                <input type="number" min={0} required placeholder="0"
                  value={form.apps_meta}
                  onChange={e => set('apps_meta', e.target.value === '' ? '' : Number(e.target.value))}
                  onFocus={e => e.target.select()} className={inputCls} />
              </Field>
            </div>
            {(fOrg + fMeta) > 0 && (
              <p className="text-[11px] text-zinc-500">
                Totalt: <span className="text-gold font-bold">{fOrg + fMeta} ansökningar</span>
              </p>
            )}
          </div>

          {/* Meta-annons */}
          <Field label="Meta annonsbudget (kr) — valfritt">
            <input type="number" min={0} placeholder="0"
              value={form.ad_spend}
              onChange={e => set('ad_spend', e.target.value === '' ? '' : Number(e.target.value))}
              onFocus={e => e.target.select()} className={`${inputCls} max-w-xs`} />
            {fSpend > 0 && fMeta > 0 && (
              <p className="text-[11px] text-orange-400 mt-1">
                CPL: {cpl(fSpend, fMeta)} per Meta-ansökning
              </p>
            )}
          </Field>

          <Field label="Anteckningar (valfritt)">
            <textarea rows={2} placeholder="Vad drev trafik idag? Vilket content funkade?"
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
          const apps = r.apps_org + r.apps_meta
          return (
            <div key={r.id} className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-[11px] text-zinc-500 font-bold">{formatDate(r.date)}</span>
                <div className="ml-auto flex gap-3 items-center">
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
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                <LogCell label="Besök"     val={r.vsl_visits} />
                <LogCell label="Plays"     val={r.vsl_plays} />
                <LogCell label="Play Rate" val={pct(r.vsl_plays, r.vsl_visits)} isStr />
                <LogCell label="Org. Apps" val={r.apps_org} color="text-green-400" />
                <LogCell label="Meta Apps" val={r.apps_meta} color="text-blue-400" />
                <LogCell label="Totalt"    val={apps} color="text-gold" />
              </div>

              {(r.ad_spend > 0 || r.notes) && (
                <div className="mt-2 pt-2 border-t border-zinc-800/40 flex gap-4 text-[11px] text-zinc-600 flex-wrap">
                  {r.ad_spend > 0 && (
                    <span>
                      Annons: <span className="text-orange-400">{r.ad_spend.toLocaleString('sv-SE')} kr</span>
                      {r.apps_meta > 0 && <span className="ml-2 text-zinc-600">· CPL: {cpl(r.ad_spend, r.apps_meta)}</span>}
                    </span>
                  )}
                  {r.notes && <span>Anteckning: <span className="text-zinc-400">{r.notes}</span></span>}
                </div>
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

function KpiCard({ label, val, color, isStr }: { label: string; val: number | string; color: string; isStr?: boolean }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
      <div className="text-[9px] font-bold tracking-[1.5px] uppercase text-zinc-600 mb-1">{label}</div>
      <div className={`text-2xl font-extrabold ${color}`}>
        {isStr ? val : (val as number).toLocaleString('sv-SE')}
      </div>
    </div>
  )
}

function LogCell({ label, val, color, isStr }: { label: string; val: number | string; color?: string; isStr?: boolean }) {
  return (
    <div>
      <div className="text-[9px] font-bold tracking-[1px] uppercase text-zinc-600 mb-0.5">{label}</div>
      <div className={`text-[18px] font-extrabold ${color ?? 'text-white'}`}>
        {isStr ? val : (val as number).toLocaleString('sv-SE')}
      </div>
    </div>
  )
}

const inputCls = 'w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-zinc-700 focus:outline-none focus:border-zinc-600 transition-colors'
