'use client'
import { useState, useEffect, useRef } from 'react'

interface Transcript {
  id: string
  date: string
  dialer: string
  leadName: string
  transcript: string
  analysis: string
  created_at: string
}

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

function formatDate(s: string) {
  if (!s) return '—'
  const [y, m, d] = s.split('-')
  return `${d}/${m}/${y}`
}

export default function CallReviewPage() {
  const [transcripts, setTranscripts] = useState<Transcript[]>([])
  const [expanded, setExpanded]       = useState<string | null>(null)
  const [uploading, setUploading]     = useState(false)
  const [error, setError]             = useState('')
  const [success, setSuccess]         = useState('')
  const [deleteId, setDeleteId]       = useState<string | null>(null)

  const [dialer,   setDialer]   = useState<'Edvard' | 'Atlassi'>('Edvard')
  const [leadName, setLeadName] = useState('')
  const [date,     setDate]     = useState(todayStr())
  const [file,     setFile]     = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/transcripts').then(r => r.json()).then(setTranscripts).catch(() => {})
  }, [])

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!file) { setError('Välj en ljudfil'); return }
    if (!leadName.trim()) { setError('Ange leadens namn'); return }

    setUploading(true)
    setError('')
    setSuccess('')

    const form = new FormData()
    form.append('audio',    file)
    form.append('dialer',   dialer)
    form.append('leadName', leadName.trim())
    form.append('date',     date)

    try {
      const res  = await fetch('/api/transcribe', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok || !data.ok) throw new Error(data.error ?? 'Något gick fel')

      setTranscripts(prev => [data.entry, ...prev])
      setExpanded(data.entry.id)
      setLeadName('')
      setFile(null)
      if (fileRef.current) fileRef.current.value = ''
      setSuccess('Transkriberat och analyserat!')
      setTimeout(() => setSuccess(''), 5000)
    } catch (err) {
      setError(String(err))
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(id: string) {
    await fetch('/api/transcripts', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setTranscripts(prev => prev.filter(t => t.id !== id))
    setDeleteId(null)
  }

  // Render analysis with markdown-like formatting
  function renderAnalysis(text: string) {
    return text.split('\n').map((line, i) => {
      if (line.startsWith('**') && line.endsWith('**'))
        return <p key={i} className="font-black text-white mt-4 mb-1 text-[13px]">{line.replace(/\*\*/g, '')}</p>
      if (line.startsWith('- '))
        return <p key={i} className="text-zinc-300 text-[12px] ml-3 mb-0.5">• {line.slice(2)}</p>
      if (line.trim() === '')
        return <div key={i} className="h-1" />
      return <p key={i} className="text-zinc-300 text-[12px] mb-1">{line}</p>
    })
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold">Samtalsgranskning</h1>
        <p className="text-xs text-zinc-500 mt-0.5">Ladda upp ett inspelat samtal — AI analyserar vad som gick bra och vad som borde förbättras</p>
      </div>

      {/* Upload form */}
      <form onSubmit={handleUpload} className="bg-zinc-900 border border-zinc-700 rounded-xl p-5 mb-6 space-y-4">
        <div className="text-[10px] font-black tracking-[2px] uppercase text-zinc-500">Nytt samtal</div>

        <div className="grid grid-cols-2 gap-4">
          {/* Dialer */}
          <div>
            <label className="block text-[10px] font-bold tracking-[1px] uppercase text-zinc-500 mb-1.5">Dialer</label>
            <div className="flex gap-3">
              {(['Edvard', 'Atlassi'] as const).map(d => (
                <button key={d} type="button" onClick={() => setDialer(d)}
                  className={`flex-1 py-2.5 rounded-lg border text-[11px] font-bold transition-all ${
                    dialer === d ? 'border-gold bg-gold/10 text-gold' : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-600'
                  }`}>
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Datum */}
          <div>
            <label className="block text-[10px] font-bold tracking-[1px] uppercase text-zinc-500 mb-1.5">Datum</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-white [color-scheme:dark] cursor-pointer focus:outline-none focus:border-zinc-600" />
          </div>
        </div>

        {/* Lead name */}
        <div>
          <label className="block text-[10px] font-bold tracking-[1px] uppercase text-zinc-500 mb-1.5">Leadens namn</label>
          <input type="text" placeholder="Förnamn" value={leadName} onChange={e => setLeadName(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-zinc-700 focus:outline-none focus:border-zinc-600" />
        </div>

        {/* File upload */}
        <div>
          <label className="block text-[10px] font-bold tracking-[1px] uppercase text-zinc-500 mb-1.5">Ljudfil (mp3, m4a, wav)</label>
          <div
            onClick={() => fileRef.current?.click()}
            className={`w-full border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
              file ? 'border-gold/40 bg-gold/5' : 'border-zinc-700 hover:border-zinc-500'
            }`}>
            <input ref={fileRef} type="file" accept="audio/*,.mp3,.m4a,.wav,.ogg,.webm"
              className="hidden" onChange={e => setFile(e.target.files?.[0] ?? null)} />
            {file ? (
              <div>
                <div className="text-gold font-bold text-sm">{file.name}</div>
                <div className="text-zinc-500 text-xs mt-1">{(file.size / 1024 / 1024).toFixed(1)} MB</div>
              </div>
            ) : (
              <div>
                <div className="text-zinc-500 text-sm">Tryck för att välja fil</div>
                <div className="text-zinc-700 text-xs mt-1">Max 25 MB</div>
              </div>
            )}
          </div>
        </div>

        {error   && <div className="text-red-400 text-sm font-bold">{error}</div>}
        {success && <div className="text-green-400 text-sm font-bold">{success}</div>}

        <button type="submit" disabled={uploading}
          className="bg-gold text-black font-black text-[11px] tracking-widest uppercase px-6 py-3 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 w-full">
          {uploading ? 'Transkriberar och analyserar...' : 'Ladda upp och analysera'}
        </button>
        {uploading && (
          <div className="text-zinc-500 text-xs text-center">Kan ta 30–60 sekunder beroende på längd på samtalet</div>
        )}
      </form>

      {/* List */}
      <div className="space-y-3">
        <div className="text-[9px] font-bold tracking-[1.5px] uppercase text-zinc-600 mb-2">
          {transcripts.length} samtal granskade
        </div>

        {transcripts.length === 0 && (
          <div className="text-center text-zinc-700 py-12 text-sm">Inga samtal granskade ännu.</div>
        )}

        {transcripts.map(t => (
          <div key={t.id} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">

            {/* Header row */}
            <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-zinc-800/50 transition-colors"
              onClick={() => setExpanded(expanded === t.id ? null : t.id)}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-sm">{t.leadName}</span>
                  <span className="text-[10px] text-zinc-500 font-bold uppercase">{t.dialer}</span>
                  <span className="text-[10px] text-zinc-600">{formatDate(t.date)}</span>
                </div>
              </div>
              <span className="text-zinc-600 text-xs">{expanded === t.id ? '▲' : '▼'}</span>
              {deleteId === t.id ? (
                <div className="flex gap-2 items-center" onClick={e => e.stopPropagation()}>
                  <button onClick={() => handleDelete(t.id)}
                    className="text-[11px] font-bold text-red-400 px-2 py-1 border border-red-700 rounded">Ja</button>
                  <button onClick={() => setDeleteId(null)}
                    className="text-[11px] text-zinc-500 px-2 py-1 border border-zinc-700 rounded">Nej</button>
                </div>
              ) : (
                <button onClick={e => { e.stopPropagation(); setDeleteId(t.id) }}
                  className="text-zinc-700 hover:text-red-400 text-[11px] transition-colors">Radera</button>
              )}
            </div>

            {/* Expanded content */}
            {expanded === t.id && (
              <div className="border-t border-zinc-800 grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-zinc-800">

                {/* Transcript */}
                <div className="p-4">
                  <div className="text-[9px] font-black tracking-[2px] uppercase text-zinc-600 mb-3">Transkript</div>
                  <p className="text-zinc-400 text-[12px] leading-relaxed whitespace-pre-wrap">{t.transcript}</p>
                </div>

                {/* Analysis */}
                <div className="p-4">
                  <div className="text-[9px] font-black tracking-[2px] uppercase text-zinc-600 mb-3">AI-analys</div>
                  <div className="text-[12px] leading-relaxed">
                    {renderAnalysis(t.analysis)}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
