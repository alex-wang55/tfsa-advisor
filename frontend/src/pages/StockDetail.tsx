import { ArrowRight, Check, GraduationCap, Landmark, Plus, SearchX, ShoppingCart } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api, ApiError } from '../api/client'
import { ChangeIndicator } from '../components/ChangeIndicator'
import { ExplanationPanel } from '../components/ExplanationPanel'
import { RefreshControl } from '../components/RefreshControl'
import { ScoreRing } from '../components/ScoreRing'
import { StockChart } from '../components/StockChart'
import { SubScoreBars } from '../components/SubScoreBars'
import { TickerAvatar } from '../components/TickerAvatar'
import { TradeDialog } from '../components/TradeDialog'
import { useAutoRefresh } from '../hooks/useAutoRefresh'
import { usePracticePortfolio } from '../hooks/usePracticePortfolio'
import type { HistoryPoint, PaperHolding, StockAnalysis } from '../api/types'
import { fmtCurrency, fmtMarketCap, fmtNum, fmtPct, fmtShares } from '../utils/format'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

const AUTO_REFRESH_MS = 30 * 1000

export default function StockDetailPage() {
  const { ticker } = useParams<{ ticker: string }>()
  const [analysis, setAnalysis] = useState<StockAnalysis | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [addState, setAddState] = useState<'idle' | 'adding' | 'added' | 'error'>('idle')
  const [trade, setTrade] = useState<'buy' | 'sell' | null>(null)
  const { portfolio } = usePracticePortfolio()

  const load = useCallback(
    (opts: { showSkeleton?: boolean; force?: boolean } = {}) => {
      if (!ticker) return
      if (opts.showSkeleton) {
        setLoading(true)
        setAnalysis(null)
        setAddState('idle')
      } else {
        setRefreshing(true)
      }
      setError(null)
      return api
        .getStock(ticker, { refresh: opts.force })
        .then((a) => {
          setAnalysis(a)
          setLastUpdated(new Date())
        })
        .catch((e) => setError(e instanceof ApiError ? e.message : 'Failed to load this ticker'))
        .finally(() => {
          setLoading(false)
          setRefreshing(false)
        })
    },
    [ticker],
  )

  useEffect(() => {
    load({ showSkeleton: true })
  }, [load])

  useAutoRefresh(() => load(), AUTO_REFRESH_MS)

  async function addToWatchlist() {
    if (!analysis) return
    setAddState('adding')
    try {
      await api.addWatchlistItem({ ticker: analysis.metrics.ticker, notes: '' })
      setAddState('added')
    } catch {
      setAddState('error')
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-12 w-12 rounded-full" />
            <Skeleton className="h-7 w-48" />
          </div>
          <Skeleton className="h-8 w-40 rounded-full" />
        </div>
        <Skeleton className="h-[480px] w-full rounded-lg" />
        <Skeleton className="h-48 w-full rounded-lg" />
      </div>
    )
  }

  if (error) {
    return (
      <Card className="flex flex-col items-center gap-2 px-6 py-16 text-center">
        <SearchX className="h-6 w-6 text-foreground-subtle" />
        <p className="mt-1 text-base font-semibold text-foreground">Couldn't load {ticker?.toUpperCase()}</p>
        <p className="max-w-sm text-sm text-foreground-subtle">{error}</p>
        <p className="max-w-sm text-[13px] text-foreground-subtle">
          TSX tickers need a .TO suffix (e.g. RY.TO); US tickers don't.
        </p>
        <Button variant="outline" size="sm" className="mt-3" asChild>
          <Link to="/">Back to the screener</Link>
        </Button>
      </Card>
    )
  }

  if (!analysis) return null
  const m = analysis.metrics
  const position = portfolio?.holdings.find((h) => h.ticker === m.ticker) ?? null

  const metricTiles: { label: string; value: string; change?: number | null }[] = [
    { label: '3m momentum', value: fmtPct(m.momentum_3m), change: m.momentum_3m },
    { label: '12m momentum', value: fmtPct(m.momentum_12m), change: m.momentum_12m },
    { label: 'RSI (14)', value: fmtNum(m.rsi14, 0) },
    { label: 'Volatility (ann.)', value: `${fmtNum(m.volatility_annualized, 0)}%` },
    { label: 'P/E (trailing)', value: fmtNum(m.pe_trailing, 1) },
    { label: 'Dividend yield', value: `${fmtNum(m.dividend_yield, 2)}%` },
    { label: 'Beta', value: fmtNum(m.beta, 2) },
    { label: 'Market cap', value: fmtMarketCap(m.market_cap) },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3.5">
          <TickerAvatar ticker={m.ticker} size={48} />
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{m.ticker}</h1>
            <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
              {m.name && <span className="mr-1 text-sm text-foreground-muted">{m.name}</span>}
              <Badge>{m.exchange}</Badge>
              {m.sector && <Badge>{m.sector}</Badge>}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <RefreshControl
            onRefresh={() => load({ force: true })}
            refreshing={refreshing}
            lastUpdated={lastUpdated}
            className="mr-1"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={addToWatchlist}
            disabled={addState === 'adding' || addState === 'added'}
          >
            {addState === 'added' ? <Check /> : <Plus />}
            {addState === 'added' ? 'Watching' : addState === 'adding' ? 'Adding…' : 'Watchlist'}
          </Button>
          <Button size="sm" onClick={() => setTrade('buy')}>
            <ShoppingCart />
            Practice trade
          </Button>
        </div>
      </div>
      {addState === 'error' && (
        <p className="-mt-3 text-[13px] text-warning">Couldn't add to your watchlist — it may already be there.</p>
      )}

      <Card>
        <CardContent>
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-[40px] font-bold leading-none tracking-tight tabular-nums text-foreground">
                {fmtCurrency(m.price, m.currency)}
              </div>
              <div className="mt-2.5 flex items-center gap-1.5 text-[13px] text-foreground-subtle">
                <ChangeIndicator value={m.price_change_pct} amount={m.price_change} currency={m.currency} size="md" />
                today
              </div>
            </div>
            <YearRange history={m.history} price={m.price} currency={m.currency} />
          </div>
          <StockChart history={m.history} currency={m.currency} />
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {metricTiles.map((tile) => (
              <div key={tile.label} className="rounded-md bg-surface-hover p-3.5">
                <div className="text-[11px] font-medium uppercase tracking-wide text-foreground-subtle">
                  {tile.label}
                </div>
                {tile.change !== undefined ? (
                  <div className="mt-1">
                    <ChangeIndicator value={tile.change} />
                  </div>
                ) : (
                  <div className="mt-1 text-base font-semibold tabular-nums text-foreground">{tile.value}</div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {position && <PositionCard position={position} onTrade={setTrade} />}

      <Card>
        <CardHeader>
          <CardTitle>Score breakdown</CardTitle>
        </CardHeader>
        <CardContent className="grid items-center gap-8 md:grid-cols-[220px_1fr]">
          <ScoreRing score={analysis.score} size={96} />
          <SubScoreBars scores={analysis.sub_scores} />
        </CardContent>
      </Card>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center gap-2">
            <GraduationCap className="h-4 w-4 text-foreground-muted" />
            <CardTitle>What the teacher sees</CardTitle>
          </CardHeader>
          <CardContent>
            <ExplanationPanel bullets={analysis.explanations} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center gap-2">
            <Landmark className="h-4 w-4 text-foreground-muted" />
            <CardTitle>TFSA-specific notes</CardTitle>
          </CardHeader>
          <CardContent>
            <ExplanationPanel bullets={analysis.tfsa_notes} />
          </CardContent>
        </Card>
      </div>

      <TradeDialog
        open={trade !== null}
        ticker={m.ticker}
        initialSide={trade ?? 'buy'}
        onClose={() => setTrade(null)}
      />
    </div>
  )
}

function YearRange({ history, price, currency }: {
  history: HistoryPoint[]
  price: number | null
  currency: string | null
}) {
  const range = useMemo(() => {
    const year = history.slice(-252)
    if (year.length === 0) return null
    return { low: Math.min(...year.map((p) => p.low)), high: Math.max(...year.map((p) => p.high)) }
  }, [history])
  if (!range || price === null) return null
  const pct = range.high > range.low ? ((price - range.low) / (range.high - range.low)) * 100 : 50
  const clamped = Math.max(0, Math.min(100, pct))
  return (
    <div className="w-full sm:w-64">
      <div className="mb-2 text-[11px] font-medium uppercase tracking-wide text-foreground-subtle">52-week range</div>
      <div className="relative h-1.5 rounded-full bg-surface-hover">
        <div className="absolute inset-y-0 left-0 rounded-full bg-border-strong" style={{ width: `${clamped}%` }} />
        <span
          className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface bg-foreground shadow-sm"
          style={{ left: `${clamped}%` }}
          title={`${pct.toFixed(0)}% of the way from the 52-week low to the high`}
        />
      </div>
      <div className="mt-2 flex justify-between text-[12px] tabular-nums text-foreground-muted">
        <span>{fmtCurrency(range.low, currency)}</span>
        <span>{fmtCurrency(range.high, currency)}</span>
      </div>
    </div>
  )
}

function PositionCard({ position: h, onTrade }: { position: PaperHolding; onTrade: (side: 'buy' | 'sell') => void }) {
  const tone = h.unrealized_pnl_cad >= 0 ? 'text-success' : 'text-negative'
  const tiles = [
    { label: 'Shares', value: fmtShares(h.shares) },
    { label: 'Average cost', value: fmtCurrency(h.avg_cost, h.currency) },
    { label: 'Market value', value: fmtCurrency(h.market_value_cad) },
  ]
  return (
    <Card className="border-success/30">
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Your practice position</CardTitle>
        <Link
          to="/portfolio"
          className="flex items-center gap-1 text-[13px] font-semibold text-foreground-muted transition-colors hover:text-foreground"
        >
          Portfolio <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {tiles.map((t) => (
            <div key={t.label} className="rounded-md bg-surface-hover p-3.5">
              <div className="text-[11px] font-medium uppercase tracking-wide text-foreground-subtle">{t.label}</div>
              <div className="mt-1 text-base font-semibold tabular-nums text-foreground">{t.value}</div>
            </div>
          ))}
          <div className="rounded-md bg-surface-hover p-3.5">
            <div className="text-[11px] font-medium uppercase tracking-wide text-foreground-subtle">Return</div>
            <div className={cn('mt-1 text-base font-semibold tabular-nums', tone)}>
              {fmtCurrency(h.unrealized_pnl_cad, 'CAD', { signed: true })}
              <span className="ml-1.5 text-[12px]">({fmtPct(h.unrealized_pnl_pct, 2)})</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => onTrade('buy')}>
            Buy more
          </Button>
          <Button size="sm" variant="outline" onClick={() => onTrade('sell')}>
            Sell
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
