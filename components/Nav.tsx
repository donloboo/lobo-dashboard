'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

const TABS = [
  { href: '/overview',        label: 'Overview' },
  { href: '/scorecard',       label: 'Sales Scorecard' },
  { href: '/call-reports',    label: 'Call Reports' },
  { href: '/dialer-reports',  label: 'Dialer Reports' },
  { href: '/setter-reports',  label: 'Setter Reports' },
  { href: '/call-review',     label: 'Granskning' },
  { href: '/owner',           label: '🔒' },
]

export default function Nav() {
  const path = usePathname()
  const router = useRouter()

  async function logout() {
    await fetch('/api/auth', { method: 'DELETE' })
    router.push('/login')
    router.refresh()
  }

  return (
    <nav className="bg-zinc-900 border-b border-zinc-800 px-4 flex items-center gap-6 sticky top-0 z-50 overflow-x-auto" style={{ height: 52 }}>
      <span className="text-[13px] font-black tracking-[2.5px] uppercase text-gold shrink-0">
        The Money Team.
      </span>
      <div className="flex h-full flex-1 min-w-0">
        {TABS.map(t => (
          <Link
            key={t.href}
            href={t.href}
            className={`px-3 h-full flex items-center text-[11px] font-bold uppercase tracking-widest border-b-2 transition-colors shrink-0 ${
              path === t.href
                ? 'border-gold text-gold'
                : 'border-transparent text-zinc-500 hover:text-zinc-400'
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>
      <button
        onClick={logout}
        className="shrink-0 text-[10px] font-bold uppercase tracking-widest text-zinc-700 hover:text-zinc-400 transition-colors px-2"
      >
        Logga ut
      </button>
    </nav>
  )
}
