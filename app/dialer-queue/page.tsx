'use client'
import { useState, useEffect, useCallback } from 'react'

type Lead = {
  id: string
  submitted_at: string
  name: string
  age: string
  situation: string
  income: string
  goal: string
  email: string
  phone: string
  instagram: string
  status: string
  claimed_by: string | null
  called_at: string | null
  outcome: string | null
  outcome_reason: string | null
  notes: string
  score: number
  already_called?: boolean
}

const DIALERS = ['Edvard', 'Atlassi']

const OUTCOMES = [
  { value: 'booked', label: '✅ Bokad', color: 'bg-green-600 hover:bg-green-500' },
  { value: 'no_answer', label: '📵 Inget svar', color: 'bg-zinc-600 hover:bg-zinc-500' },
  { value: 'not_booked', label: '❌ Inte bokad', color: 'bg-red-700 hover:bg-red-600' },
  { value: 'rebooked', label: '🔄 Ombokad', color: 'bg-yellow-600 hover:bg-yellow-500' },
]

const NOT_BOOKED_REASONS = [
  'Inte råd', 'DQ – fel ålder', 'DQ – inget jobb', 'Inte intresserad', 'Redan kund', 'Annat'
]

function scoreColor(s: number) {
  if (s >= 8) return 'text-green-400'
  if (s >= 5) return 'text-yellow-400'
  return 'text-zinc-400'
}

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return `${Math.floor(diff)}s sedan`
  if (diff < 3600) return `${Math.floor(diff / 60)}m sedan`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h sedan`
  return `${Math.floor(diff / 86400)}d sedan`
}

export default function DialerQueue() {
  const [dialer, setDialer] = useState<string | null>(null)
  const [leads, setLeads] = useState<Lead[]>([])
  const [current, setCurrent] = useState<Lead | null>(null)
  const [showOutcome, setShowOutcome] = useState(false)
  const [outcome, setOutcome] = useState('')
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [timer, setTimer] = useState(0)

  const fetchLeads = useCallback(async () => {
    const res = await fetch('/api/leads')
    const data = await res.json()
    setLeads(data)
    return data
  }, [])

  // Restore dialer from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('dialer_name')
    if (saved && DIALERS.includes(saved)) setDialer(saved)
  }, [])

  // On load: fetch leads, then restore any active calling lead for this dialer
  useEffect(() => {
    fetchLeads().then((data: Lead[]) => {
      const saved = localStorage.getItem('dialer_name')
      if (!saved) return
      const active = data.find(l => l.status === 'calling' && l.claimed_by === saved)
      if (active) {
        setCurrent(active)
        setShowOutcome(false)
      }
    })
  }, [fetchLeads])

  useEffect(() => {
    if (!current) return
    const interval = setInterval(() => setTimer(t => t + 1), 1000)
    return () => clearInterval(interval)
  }, [current])

  async function claimNext() {
    if (!dialer) return
    setLoading(true)
    // Resume any lead this dialer already claimed but didn't submit
    const active = leads.find(l => l.status === 'calling' && l.claimed_by === dialer)
    if (active) {
      setCurrent(active)
      setTimer(0)
      setShowOutcome(false)
      setLoading(false)
      return
    }
    const next = leads.find(l => l.status === 'uncalled' && l.claimed_by === null && !l.already_called)
    if (!next) { setLoading(false); return }
    await fetch(`/api/leads/${next.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'calling', claimed_by: dialer, called_at: new Date().toISOString() })
    })
    setCurrent({ ...next, status: 'calling', claimed_by: dialer })
    setTimer(0)
    setShowOutcome(false)
    setOutcome('')
    setReason('')
    setNotes('')
    await fetchLeads()
    setLoading(false)
  }

  async function submitOutcome() {
    if (!current || !outcome) return
    setLoading(true)
    await fetch(`/api/leads/${current.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: outcome,
        outcome,
        outcome_reason: outcome === 'not_booked' ? reason : null,
        notes
      })
    })
    setCurrent(null)
    setShowOutcome(false)
    setOutcome('')
    setReason('')
    setNotes('')
    await fetchLeads()
    setLoading(false)
  }

  const uncalled = leads.filter(l => l.status === 'uncalled' && !l.already_called).length
  const booked = leads.filter(l => l.status === 'booked').length
  const noAnswer = leads.filter(l => l.status === 'no_answer').length

  if (!dialer) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-white text-2xl font-bold mb-2">THE MONEY TEAM</div>
          <div className="text-zinc-400 mb-8">Vem ringer idag?</div>
          <div className="flex gap-4 justify-center">
            {DIALERS.map(d => (
              <button key={d} onClick={() => { setDialer(d); localStorage.setItem('dialer_name', d) }}
                className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-10 py-4 rounded-xl text-xl transition">
                {d}
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-xs text-zinc-500 uppercase tracking-wider">THE MONEY TEAM</div>
          <div className="text-xl font-bold">{dialer} <span className="text-green-400 text-sm">● ONLINE</span></div>
        </div>
        <div className="flex gap-4 text-center">
          <div><div className="text-2xl font-bold text-yellow-400">{uncalled}</div><div className="text-xs text-zinc-500">Ej ringda</div></div>
          <div><div className="text-2xl font-bold text-green-400">{booked}</div><div className="text-xs text-zinc-500">Bokade</div></div>
          <div><div className="text-2xl font-bold text-zinc-400">{noAnswer}</div><div className="text-xs text-zinc-500">Inget svar</div></div>
        </div>
        <button onClick={() => { setDialer(null); localStorage.removeItem('dialer_name'); setCurrent(null) }} className="text-xs text-zinc-600 hover:text-zinc-400">Byt</button>
      </div>

      {/* Current lead */}
      {current ? (
        <div className="bg-zinc-900 rounded-2xl p-6 mb-4 border border-zinc-800">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="text-2xl font-bold">{current.name || '—'}</div>
              <div className="text-zinc-400 text-sm">{timeAgo(current.submitted_at)}</div>
            </div>
            <div className="text-right">
              <div className={`text-2xl font-bold ${scoreColor(current.score)}`}>{current.score} pts</div>
              <div className="text-xs text-zinc-500">{Math.floor(timer / 60)}:{String(timer % 60).padStart(2,'0')}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="bg-zinc-800 rounded-xl p-3">
              <div className="text-xs text-zinc-500 mb-1">Telefon</div>
              <a href={`tel:${current.phone}`} className="text-yellow-400 font-bold text-lg hover:text-yellow-300">{current.phone}</a>
            </div>
            <div className="bg-zinc-800 rounded-xl p-3">
              <div className="text-xs text-zinc-500 mb-1">Ålder</div>
              <div className="font-bold text-lg">{current.age || '—'}</div>
            </div>
            <div className="bg-zinc-800 rounded-xl p-3">
              <div className="text-xs text-zinc-500 mb-1">Situation</div>
              <div className="font-semibold">{current.situation || '—'}</div>
            </div>
            <div className="bg-zinc-800 rounded-xl p-3">
              <div className="text-xs text-zinc-500 mb-1">Inkomst</div>
              <div className="font-semibold">{current.income || '—'}</div>
            </div>
            <div className="bg-zinc-800 rounded-xl p-3 col-span-2">
              <div className="text-xs text-zinc-500 mb-1">Mål</div>
              <div className="font-semibold">{current.goal || '—'}</div>
            </div>
            {current.instagram && (
              <div className="bg-zinc-800 rounded-xl p-3 col-span-2">
                <div className="text-xs text-zinc-500 mb-1">Instagram</div>
                <div className="font-semibold">@{current.instagram}</div>
              </div>
            )}
          </div>

          {!showOutcome ? (
            <button onClick={() => setShowOutcome(true)}
              className="w-full bg-white text-black font-bold py-3 rounded-xl hover:bg-zinc-200 transition">
              Välj utfall
            </button>
          ) : (
            <div>
              <div className="grid grid-cols-2 gap-2 mb-3">
                {OUTCOMES.map(o => (
                  <button key={o.value} onClick={() => { setOutcome(o.value); setReason('') }}
                    className={`${o.color} ${outcome === o.value ? 'ring-2 ring-white' : ''} text-white font-bold py-3 rounded-xl transition text-sm`}>
                    {o.label}
                  </button>
                ))}
              </div>
              {outcome === 'not_booked' && (
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {NOT_BOOKED_REASONS.map(r => (
                    <button key={r} onClick={() => setReason(r)}
                      className={`${reason === r ? 'bg-red-700 ring-2 ring-white' : 'bg-zinc-800'} text-white py-2 rounded-lg text-sm transition`}>
                      {r}
                    </button>
                  ))}
                </div>
              )}
              <textarea value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="Anteckningar (valfritt)..."
                className="w-full bg-zinc-800 text-white rounded-xl p-3 text-sm mb-3 resize-none h-16 border border-zinc-700" />
              <button onClick={submitOutcome} disabled={!outcome || (outcome === 'not_booked' && !reason) || loading}
                className="w-full bg-yellow-500 hover:bg-yellow-400 disabled:opacity-40 text-black font-bold py-3 rounded-xl transition">
                Spara & nästa lead →
              </button>
            </div>
          )}
        </div>
      ) : (
        <button onClick={claimNext} disabled={loading || uncalled === 0}
          className="w-full bg-yellow-500 hover:bg-yellow-400 disabled:opacity-40 text-black font-bold py-5 rounded-2xl text-xl transition mb-4">
          {uncalled === 0 ? 'Inga fler leads' : `🔔 Nästa lead (${uncalled} kvar)`}
        </button>
      )}

      {/* Queue preview */}
      <div className="mt-4">
        <div className="text-xs text-zinc-600 uppercase tracking-wider mb-2">Kö — topp 10</div>
        {leads.filter(l => l.status === 'uncalled').slice(0, 10).map((l, i) => (
          <div key={l.id} className="flex items-center justify-between py-2 border-b border-zinc-900">
            <div className="flex items-center gap-3">
              <div className="text-zinc-600 text-xs w-4">{i + 1}</div>
              <div>
                <div className="text-sm font-semibold">{l.name || '—'}</div>
                <div className="text-xs text-zinc-500">{l.situation} · {l.income}</div>
              </div>
            </div>
            <div className={`text-sm font-bold ${scoreColor(l.score)}`}>{l.score}p</div>
          </div>
        ))}
      </div>
    </div>
  )
}
