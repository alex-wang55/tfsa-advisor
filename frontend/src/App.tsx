import { Info } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/planner', label: 'TFSA Planner', end: false },
  { to: '/watchlist', label: 'Watchlist', end: false },
  { to: '/profile', label: 'Risk Profile', end: false },
]

export default function App() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-surface/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-1 px-4 sm:px-6 lg:px-8">
          <div className="mr-6 flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-[5px] bg-accent text-[11px] font-bold text-accent-foreground">
              T
            </span>
            <span className="text-[14px] font-semibold tracking-tight text-foreground">TFSA Teacher</span>
          </div>
          <nav className="flex flex-wrap items-center gap-0.5">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors',
                    isActive
                      ? 'text-foreground'
                      : 'text-foreground-muted hover:bg-surface-hover hover:text-foreground',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <div className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-2 sm:px-6 lg:px-8">
          <Info className="h-3.5 w-3.5 shrink-0 text-foreground-subtle" />
          <p className="text-xs text-foreground-subtle">
            Educational tool only — not licensed financial or investment advice. Analysis is based on
            public market data and simple rules; always do your own research.
          </p>
        </div>
      </div>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <Outlet />
      </main>
    </div>
  )
}
