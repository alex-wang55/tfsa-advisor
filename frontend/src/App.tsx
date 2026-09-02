import { Info, X } from 'lucide-react'
import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/planner', label: 'TFSA Planner', end: false },
  { to: '/watchlist', label: 'Watchlist', end: false },
  { to: '/profile', label: 'Risk Profile', end: false },
]

export default function App() {
  const [showDisclaimer, setShowDisclaimer] = useState(true)

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 bg-background">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-[13px] font-bold text-accent-foreground">
              T
            </span>
            <span className="hidden text-[15px] font-semibold tracking-tight text-foreground sm:inline">
              TFSA Teacher
            </span>
          </div>

          <nav className="ml-auto flex items-center gap-0.5 rounded-full border border-border bg-surface p-1 card-shadow">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-colors sm:px-4',
                    isActive
                      ? 'bg-accent text-accent-foreground'
                      : 'text-foreground-muted hover:text-foreground',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-10 sm:px-6 lg:px-8">
        {showDisclaimer && (
          <div className="mb-6 flex items-start gap-3 rounded-lg bg-surface-hover px-4 py-3.5 sm:mb-8">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-foreground-subtle" />
            <p className="flex-1 text-[13px] leading-relaxed text-foreground-muted">
              Educational tool only — not licensed financial or investment advice. Analysis is based
              on public market data and simple rules; always do your own research.
            </p>
            <button
              onClick={() => setShowDisclaimer(false)}
              className="rounded-full p-1 text-foreground-subtle transition-colors hover:bg-surface hover:text-foreground"
              aria-label="Dismiss"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        <Outlet />
      </main>
    </div>
  )
}
