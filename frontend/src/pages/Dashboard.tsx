import { AlertTriangle, ArrowRight, BriefcaseBusiness, ChevronRight, Gauge, type LucideIcon, Sparkles } from 'lucide-react'
import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { ChangeIndicator } from '../components/ChangeIndicator'
import { RefreshControl } from '../components/RefreshControl'
import { ScoreBadge } from '../components/ScoreBadge'
import { MiniSubScores } from '../components/SubScoreBars'
import { TickerAvatar } from '../components/TickerAvatar'
import { useAutoRefresh } from '../hooks/useAutoRefresh'
import { usePracticePortfolio } from '../hooks/usePracticePortfolio'
import { usePractice } from '../practice/store'
import type { RiskProfileOut, ScreenResultItem } from '../api/types'
import { fmtCurrency } from '../utils/format'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

type ExchangeFilter = 'ALL' | 'TSX' | 'US'
type SortKey = 'score' | 'change' | 'name'
const AUTO_REFRESH_MS = 2 * 60 * 1000

export default function DashboardPage() {
  const navigate = useNavigate()
  const [exchange, setExchange] = useState<ExchangeFilter>('ALL')
  const [sort, setSort] = useState<SortKey>('score')
  const [sector, setSector] = useState<string | null>(null)
  const [results, setResults] = useState<ScreenResultItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(
    (opts: { showSkeleton?: boolean; force?: boolean } = {}) => {
      if (opts.showSkeleton) setLoading(true)
      else setRefreshing(true)
      setError(null)
      return api
        .screen(exchange === 'ALL' ? undefined : exchange, { refresh: opts.force })
        .then((data) => {
          setResults(data)
          setLastUpdated(new Date())
        })
        .catch((e) => setError(e.message ?? 'Failed to load screener results'))
        .finally(() => {
          setLoading(false)
          setRefreshing(false)
        })
    },
    [exchange],
  )

  useEffect(() => {
    load({ showSkeleton: true })
  }, [load])

  useAutoRefresh(() => load(), AUTO_REFRESH_MS)

  const sectors = useMemo(
    () => [...new Set(results.map((r) => r.sector).filter((s): s is string => !!s))].sort(),
    [results],
  )

  const visible = useMemo(() => {
    const filtered = sector ? results.filter((r) => r.sector === sector) : results
    return [...filtered].sort((a, b) => {
      if (sort === 'change') return (b.price_change_pct ?? -Infinity) - (a.price_change_pct ?? -Infinity)
      if (sort === 'name') return a.ticker.localeCompare(b.ticker)
      return b.score - a.score
    })
  }, [results, sector, sort])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-[28px]">Dashboard</h1>
        <p className="mt-1 max-w-2xl text-sm text-foreground-muted">
          Learn how stocks score, then put your picks to the test with pretend money.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <PracticeCard />
        <ProfileCard />
        <MarketPulse results={results} loading={loading} />
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-4 px-5 pb-2 pt-5 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-foreground">Stock screener</h2>
              <p className="mt-0.5 text-[13px] text-foreground-muted">
                A curated TSX + US list ranked for your risk profile. Scores are a screening aid, not a forecast.
              </p>
            </div>
            <RefreshControl
              onRefresh={() => load({ force: true })}
              refreshing={refreshing}
              lastUpdated={lastUpdated}
              className="shrink-0"
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <SegmentedControl
              value={exchange}
              onChange={(v) => {
                setExchange(v)
                setSector(null)
              }}
              options={[
                { value: 'ALL', label: 'All markets' },
                { value: 'TSX', label: 'TSX' },
                { value: 'US', label: 'US' },
              ]}
            />
            <div className="flex items-center gap-2 text-[13px] text-foreground-subtle">
              Sort by
              <SegmentedControl
                value={sort}
                onChange={setSort}
                options={[
                  { value: 'score', label: 'Score' },
                  { value: 'change', label: 'Today' },
                  { value: 'name', label: 'A–Z' },
                ]}
              />
            </div>
          </div>

          {sectors.length > 1 && (
            <div className="-mx-5 flex gap-1.5 overflow-x-auto px-5 pb-1 sm:-mx-6 sm:px-6 [scrollbar-width:none]">
              <SectorChip active={sector === null} onClick={() => setSector(null)}>
                All sectors
              </SectorChip>
              {sectors.map((s) => (
                <SectorChip key={s} active={sector === s} onClick={() => setSector(sector === s ? null : s)}>
                  {s}
                </SectorChip>
              ))}
            </div>
          )}
        </div>

        <div className="p-2">
          {loading && (
            <div className="flex flex-col gap-2 p-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          )}

          {!loading && error && (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <AlertTriangle className="h-5 w-5 text-warning" />
              <p className="text-sm text-foreground-muted">{error}</p>
              <Button variant="outline" size="sm" className="mt-2" onClick={() => load({ showSkeleton: true })}>
                Try again
              </Button>
            </div>
          )}

          {!loading && !error && visible.length === 0 && (
            <div className="flex flex-col items-center gap-1 py-16 text-center">
              <p className="text-sm font-medium text-foreground">No results</p>
              <p className="text-sm text-foreground-subtle">Try a different market or sector.</p>
            </div>
          )}

          {!loading && !error && visible.length > 0 && (
            <>
              <div className="hidden grid-cols-[28px_minmax(0,1fr)_88px_76px_56px_16px] items-center gap-3 px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-foreground-subtle md:grid">
                <span>#</span>
                <span>Stock</span>
                <span className="text-right">Today</span>
                <span className="text-center" title="Trend · Value · Quality · Income">
                  Factors
                </span>
                <span className="text-right">Score</span>
                <span />
              </div>
              <div className="flex flex-col">
                {visible.map((r, i) => (
                  <button
                    key={r.ticker}
                    onClick={() => navigate(`/stock/${encodeURIComponent(r.ticker)}`)}
                    className="grid w-full grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors hover:bg-surface-hover md:grid-cols-[28px_minmax(0,1fr)_88px_76px_56px_16px]"
                  >
                    <span className="hidden text-[13px] font-medium tabular-nums text-foreground-subtle md:block">
                      {i + 1}
                    </span>
                    <span className="flex min-w-0 items-center gap-3">
                      <TickerAvatar ticker={r.ticker} />
                      <span className="min-w-0">
                        <span className="flex items-center gap-2">
                          <span className="font-semibold text-foreground">{r.ticker}</span>
                          <span className="rounded-full bg-surface-hover px-2 py-0.5 text-[11px] font-medium text-foreground-subtle">
                            {r.exchange}
                          </span>
                        </span>
                        <span className="block truncate text-[13px] text-foreground-subtle">
                          {r.name ?? '—'}
                          {r.sector && <span className="hidden sm:inline"> · {r.sector}</span>}
                        </span>
                      </span>
                    </span>
                    <ChangeIndicator value={r.price_change_pct} className="justify-end" />
                    <MiniSubScores scores={r.sub_scores} className="hidden justify-center md:flex" />
                    <span className="flex justify-end">
                      <ScoreBadge score={r.score} />
                    </span>
                    <ChevronRight className="hidden h-4 w-4 text-foreground-subtle md:block" />
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  )
}

function SectorChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'shrink-0 rounded-full border px-3 py-1 text-[12px] font-semibold transition-colors',
        active
          ? 'border-accent bg-accent text-accent-foreground'
          : 'border-border text-foreground-muted hover:border-border-strong hover:text-foreground',
      )}
    >
      {children}
    </button>
  )
}

function SummaryCard({ to, icon: Icon, label, children }: {
  to: string
  icon: LucideIcon
  label: string
  children: ReactNode
}) {
  return (
    <Link
      to={to}
      className="card-shadow group flex flex-col gap-3 rounded-lg border border-border bg-surface p-5 transition-colors hover:border-border-strong"
    >
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wide text-foreground-subtle">
          <Icon className="h-3.5 w-3.5" />
          {label}
        </span>
        <ArrowRight className="h-4 w-4 text-foreground-subtle transition-transform group-hover:translate-x-0.5" />
      </div>
      {children}
    </Link>
  )
}

function PracticeCard() {
  const { hasAccount } = usePractice()
  const { portfolio, loading } = usePracticePortfolio({ autoRefreshMs: 2 * 60 * 1000 })

  if (!hasAccount) {
    return (
      <SummaryCard to="/portfolio" icon={Sparkles} label="Practice trading">
        <div>
          <div className="text-[17px] font-semibold leading-snug tracking-tight text-foreground">
            Try your picks with pretend money
          </div>
          <p className="mt-1 text-[13px] text-foreground-muted">Real prices, zero risk. Start with any balance.</p>
        </div>
      </SummaryCard>
    )
  }

  return (
    <SummaryCard to="/portfolio" icon={BriefcaseBusiness} label="Practice portfolio">
      {loading || !portfolio ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-4 w-40" />
        </div>
      ) : (
        <div>
          <div className="text-2xl font-bold tracking-tight tabular-nums text-foreground">
            {fmtCurrency(portfolio.total_value_cad)}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12px] text-foreground-subtle">
            <span className="inline-flex items-center gap-1">
              <ChangeIndicator value={portfolio.day_change_pct} className="text-[12px]" /> today
            </span>
            <span className="inline-flex items-center gap-1">
              <ChangeIndicator value={portfolio.total_return_pct} className="text-[12px]" /> all time
            </span>
          </div>
        </div>
      )}
    </SummaryCard>
  )
}

const BUCKET_COPY: Record<RiskProfileOut['risk_bucket'], string> = {
  conservative: 'Favouring stability and dividends',
  balanced: 'Weighing all four factors evenly',
  growth: 'Favouring trend and momentum',
}

function ProfileCard() {
  const [profile, setProfile] = useState<RiskProfileOut | null | undefined>(undefined)
  useEffect(() => {
    api
      .getProfile()
      .then(setProfile)
      .catch(() => setProfile(null))
  }, [])

  return (
    <SummaryCard to="/profile" icon={Gauge} label="Scoring for">
      {profile === undefined ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-7 w-28" />
          <Skeleton className="h-4 w-44" />
        </div>
      ) : (
        <div>
          <div className="text-2xl font-bold capitalize tracking-tight text-foreground">
            {profile?.risk_bucket ?? 'Balanced'}
          </div>
          <p className="mt-1 text-[12px] text-foreground-subtle">
            {profile ? BUCKET_COPY[profile.risk_bucket] : 'Default profile — set yours for tailored scores'}
          </p>
        </div>
      )}
    </SummaryCard>
  )
}

function MarketPulse({ results, loading }: { results: ScreenResultItem[]; loading: boolean }) {
  const withChange = results.filter((r) => r.price_change_pct !== null)
  const up = withChange.filter((r) => (r.price_change_pct ?? 0) >= 0).length
  const upPct = withChange.length ? (up / withChange.length) * 100 : 0
  const top = [...withChange].sort((a, b) => (b.price_change_pct ?? 0) - (a.price_change_pct ?? 0))[0]

  return (
    <div className="card-shadow flex flex-col gap-3 rounded-lg border border-border bg-surface p-5">
      <span className="text-[12px] font-semibold uppercase tracking-wide text-foreground-subtle">Market pulse</span>
      {loading ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-7 w-24" />
          <Skeleton className="h-2 w-full rounded-full" />
        </div>
      ) : withChange.length === 0 ? (
        <p className="text-[13px] text-foreground-subtle">No price data yet.</p>
      ) : (
        <div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold tabular-nums tracking-tight text-foreground">{up}</span>
            <span className="text-[13px] text-foreground-muted">of {withChange.length} up today</span>
          </div>
          <div className="mt-2.5 flex h-1.5 overflow-hidden rounded-full bg-negative/70">
            <div className="bar-grow h-full rounded-full bg-success" style={{ width: `${upPct}%` }} />
          </div>
          {top && (
            <p className="mt-2.5 flex items-center gap-1.5 text-[12px] text-foreground-subtle">
              Top mover <span className="font-semibold text-foreground">{top.ticker}</span>
              <ChangeIndicator value={top.price_change_pct} className="text-[12px]" />
            </p>
          )}
        </div>
      )}
    </div>
  )
}
