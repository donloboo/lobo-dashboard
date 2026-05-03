'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(false)

    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })

    if (res.ok) {
      router.push('/overview')
      router.refresh()
    } else {
      setError(true)
      setPassword('')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-[13px] font-black tracking-[3px] uppercase text-gold mb-1">
            The Money Team.
          </div>
          <div className="text-xs text-zinc-600">Dashboard — ange lösenord för att fortsätta</div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Lösenord"
            autoFocus
            required
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3.5 text-white text-sm placeholder:text-zinc-700 focus:outline-none focus:border-zinc-600 transition-colors text-center tracking-widest"
          />

          {error && (
            <p className="text-red-400 text-xs text-center font-bold">
              Fel lösenord. Försök igen.
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full bg-gold text-black font-black text-[11px] tracking-widest uppercase py-3.5 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            {loading ? 'Loggar in...' : 'Logga in'}
          </button>
        </form>
      </div>
    </div>
  )
}
