import { AlertTriangle, ChevronRight, Search } from 'lucide-react'
import { type FormEvent, useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { ChangeIndicator } from '../components/ChangeIndicator'
import { RefreshControl } from '../components/RefreshControl'
import { ScoreBadge } from '../components/ScoreBadge'
import { TickerAvatar } from '../components/TickerAvatar'
import { useAutoRefresh } from '../hooks/useAutoRefresh'
import type { ScreenResultItem } from '../api/types'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Skeleton } from '@/components/ui/skeleton'

type ExchangeFilter = 'ALL' | 'TSX' | 'US'
const AUTO_REFRESH_MS = 2 * 60 * 1000

export default function DashboardPage() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [exchange, setExchange] = useState<ExchangeFilter>('ALL')
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

  function goToTicker(ticker: string) {
    navigate(`/stock/${encodeURIComponent(ticker)}`)
  }

  function onSearchSubmit(e: FormEvent) {
    e.preventDefault()
    if (query.trim()) goToTicker(query.trim())
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Stock Screener</h1>
          <p className="mt-1 max-w-2xl text-sm text-foreground-muted">
            Ranked from a curated TSX + US universe using your risk profile — tap any stock for the
            full breakdown. Scores are a heuristic screening tool, not a prediction of future returns.
          </p>
        </div>
        <RefreshControl
          onRefresh={() => load({ force: true })}
          refreshing={refreshing}
          lastUpdated={lastUpdated}
          className="shrink-0 pt-1"
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <form onSubmit={onSearchSubmit} className="flex flex-1 gap-2 sm:max-w-sm">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-subtle" />
            <Input
              className="pl-11"
              placeholder="AAPL, SHOP.TO…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={!query.trim()}>
            Analyze
          </Button>
        </form>

        <SegmentedControl
          value={exchange}
          onChange={setExchange}
          options={[
            { value: 'ALL', label: 'All markets' },
            { value: 'TSX', label: 'TSX' },
            { value: 'US', label: 'US' },
          ]}
        />
      </div>

      <Card className="overflow-hidden p-2">
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
          </div>
        )}

        {!loading && !error && results.length === 0 && (
          <div className="flex flex-col items-center gap-1 py-16 text-center">
            <p className="text-sm font-medium text-foreground">No results</p>
            <p className="text-sm text-foreground-subtle">Try a different market filter.</p>
          </div>
        )}

        {!loading && !error && results.length > 0 && (
          <div className="flex flex-col">
            {results.map((r) => (
              <button
                key={r.ticker}
                onClick={() => goToTicker(r.ticker)}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors hover:bg-surface-hover"
              >
                <TickerAvatar ticker={r.ticker} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">{r.ticker}</span>
                    <span className="rounded-full bg-surface-hover px-2 py-0.5 text-[11px] font-medium text-foreground-subtle">
                      {r.exchange}
                    </span>
                  </div>
                  <p className="truncate text-[13px] text-foreground-subtle">
                    {r.name ?? '—'}
                    {r.sector && <span className="hidden sm:inline"> · {r.sector}</span>}
                  </p>
                </div>
                <ChangeIndicator value={r.price_change_pct} className="hidden w-20 justify-end sm:inline-flex" />
                <ScoreBadge score={r.score} />
                <ChevronRight className="hidden h-4 w-4 text-foreground-subtle sm:block" />
              </button>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
