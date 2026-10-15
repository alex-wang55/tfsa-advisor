import { BriefcaseBusiness, Calculator, Info, LayoutGrid, Star, UserRound, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { TickerSearch } from './components/TickerSearch'
import { PracticeProvider } from './practice/PracticeProvider'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', short: 'Home', icon: LayoutGrid, end: true },
  { to: '/portfolio', label: 'Practice', short: 'Practice', icon: BriefcaseBusiness, end: false },
  { to: '/planner', label: 'TFSA Planner', short: 'Planner', icon: Calculator, end: false },
  { to: '/watchlist', label: 'Watchlist', short: 'Watchlist', icon: Star, end: false },
  { to: '/profile', label: 'Risk Profile', short: 'Profile', icon: UserRound, end: false },
]

const DISCLAIMER_KEY = 'tfsa-teacher.disclaimer-dismissed'

function readDismissed(): boolean {
  try {
    return localStorage.getItem(DISCLAIMER_KEY) === '1'
  } catch {
    return false
  }
}

function Logo() {
  return (
    <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-accent text-accent-foreground">
      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M4 16.5 9 11l3.5 3.5L20 7" />
        <path d="M15 7h5v5" />
      </svg>
    </span>
  )
}

export default function App() {
  const location = useLocation()
  const [showDisclaimer, setShowDisclaimer] = useState(() => !readDismissed())
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // New page, new scroll position.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  function dismissDisclaimer() {
    setShowDisclaimer(false)
    try {
      localStorage.setItem(DISCLAIMER_KEY, '1')
    } catch {
      // Not persisted; it'll show again next visit.
    }
  }

  return (
    <PracticeProvider>
      <div className="flex min-h-screen flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-50 focus:rounded-full focus:bg-accent focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-accent-foreground"
        >
          Skip to content
        </a>

        <header
          className={cn(
            'header-blur sticky top-0 z-40 border-b transition-colors duration-200',
            scrolled ? 'border-border' : 'border-transparent',
          )}
        >
          <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6 lg:px-8">
            <NavLink to="/" className="flex shrink-0 items-center gap-2.5" aria-label="TFSA Teacher home">
              <Logo />
              <span className="hidden text-[15px] font-semibold tracking-tight text-foreground lg:inline">
                TFSA Teacher
              </span>
            </NavLink>

            <nav
              aria-label="Main"
              className="card-shadow ml-3 hidden items-center gap-0.5 rounded-full border border-border bg-surface p-1 md:flex"
            >
              {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold transition-colors',
                      isActive
                        ? 'bg-accent text-accent-foreground'
                        : 'text-foreground-muted hover:bg-surface-hover hover:text-foreground',
                    )
                  }
                >
                  <Icon className="hidden h-3.5 w-3.5 xl:block" />
                  {label}
                </NavLink>
              ))}
            </nav>

            <TickerSearch className="ml-auto w-full max-w-[16rem] md:max-w-[10rem] lg:max-w-[16rem]" />
          </div>
        </header>

        <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-4 sm:px-6 sm:pt-6 md:pb-12 lg:px-8">
          {showDisclaimer && (
            <div className="mb-6 flex items-start gap-3 rounded-lg border border-border bg-surface px-4 py-3 sm:mb-8">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-foreground-subtle" />
              <p className="flex-1 text-[13px] leading-relaxed text-foreground-muted">
                Educational tool only — not licensed financial or investment advice. Analysis is based on public
                market data and simple rules; always do your own research.
              </p>
              <button
                onClick={dismissDisclaimer}
                className="rounded-full p-1 text-foreground-subtle transition-colors hover:bg-surface-hover hover:text-foreground"
                aria-label="Dismiss"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          <div key={location.pathname} className="page-enter">
            <Outlet />
          </div>
        </main>

        <footer className="mx-auto hidden w-full max-w-6xl px-4 pb-8 text-[12px] text-foreground-subtle sm:px-6 md:block lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-5">
            <span>TFSA Teacher — an educational project, not financial advice.</span>
            <span>Market data from Yahoo Finance; may be delayed.</span>
          </div>
        </footer>

        <nav
          aria-label="Main"
          className="header-blur fixed inset-x-0 bottom-0 z-40 border-t border-border pb-[env(safe-area-inset-bottom)] md:hidden"
        >
          <div className="mx-auto grid max-w-md grid-cols-5">
            {NAV_ITEMS.map(({ to, short, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    'flex flex-col items-center gap-1 py-2.5 text-[10.5px] font-semibold transition-colors',
                    isActive ? 'text-foreground' : 'text-foreground-subtle hover:text-foreground-muted',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={cn(
                        'flex h-7 w-12 items-center justify-center rounded-full transition-colors',
                        isActive && 'bg-accent text-accent-foreground',
                      )}
                    >
                      <Icon className="h-[18px] w-[18px]" />
                    </span>
                    {short}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </nav>
      </div>
    </PracticeProvider>
  )
}
