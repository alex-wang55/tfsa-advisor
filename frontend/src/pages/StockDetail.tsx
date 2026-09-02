import { Check, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api, ApiError } from '../api/client'
import { ChangeIndicator } from '../components/ChangeIndicator'
import { ScoreBadge } from '../components/ScoreBadge'
import { TickerAvatar } from '../components/TickerAvatar'
import { ExplanationPanel } from '../components/ExplanationPanel'
import { StockChart } from '../components/StockChart'
import type { StockAnalysis } from '../api/types'
import { fmtMarketCap, fmtMoney, fmtNum, fmtPct } from '../utils/format'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export default function StockDetailPage() {
  const { ticker } = useParams<{ ticker: string }>()
  const [analysis, setAnalysis] = useState<StockAnalysis | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [addState, setAddState] = useState<'idle' | 'adding' | 'added' | 'error'>('idle')

  useEffect(() => {
    if (!ticker) return
    setLoading(true)
    setError(null)
    setAnalysis(null)
    setAddState('idle')
    api
      .getStock(ticker)
      .then(setAnalysis)
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Failed to load this ticker'))
      .finally(() => setLoading(false))
  }, [ticker])

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
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-8 w-24" />
        </div>
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-2 py-16 text-center">
        <p className="text-sm font-medium text-foreground">Couldn't load {ticker}</p>
        <p className="text-sm text-foreground-subtle">{error}</p>
      </div>
    )
  }

  if (!analysis) return null
  const m = analysis.metrics

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

  const subScores: { label: string; value: number }[] = [
    { label: 'Trend', value: analysis.sub_scores.trend },
    { label: 'Value', value: analysis.sub_scores.value },
    { label: 'Quality', value: analysis.sub_scores.quality },
    { label: 'Income', value: analysis.sub_scores.income },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <TickerAvatar ticker={m.ticker} size={44} />
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              {m.ticker}
              {m.name && <span className="ml-2 text-base font-normal text-foreground-muted">{m.name}</span>}
            </h1>
            <div className="mt-1.5 flex items-center gap-1.5">
              <Badge>{m.exchange}</Badge>
              {m.sector && <Badge>{m.sector}</Badge>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ScoreBadge score={analysis.score} className="px-3 py-1.5 text-sm" />
          <Button
            variant="outline"
            size="sm"
            onClick={addToWatchlist}
            disabled={addState === 'adding' || addState === 'added'}
          >
            {addState === 'added' ? <Check /> : <Plus />}
            {addState === 'added' ? 'Added' : addState === 'adding' ? 'Adding…' : 'Watchlist'}
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-2">
          <div className="mb-4 flex items-baseline gap-3">
            <span className="text-3xl font-bold tabular-nums text-foreground">
              {fmtMoney(m.price, m.currency)}
            </span>
            <ChangeIndicator value={m.price_change_pct} amount={m.price_change} size="md" />
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
                  <div className="mt-1 text-base font-semibold tabular-nums text-foreground">
                    {tile.value}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Score breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {subScores.map((s) => (
              <div key={s.label} className="rounded-md bg-surface-hover p-3.5 text-center">
                <div className="text-[11px] font-medium uppercase tracking-wide text-foreground-subtle">
                  {s.label}
                </div>
                <div className="mt-1 text-xl font-bold tabular-nums text-foreground">
                  {s.value}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>What the teacher sees</CardTitle>
        </CardHeader>
        <CardContent>
          <ExplanationPanel bullets={analysis.explanations} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>TFSA-specific notes</CardTitle>
        </CardHeader>
        <CardContent>
          <ExplanationPanel bullets={analysis.tfsa_notes} />
        </CardContent>
      </Card>
    </div>
  )
}
