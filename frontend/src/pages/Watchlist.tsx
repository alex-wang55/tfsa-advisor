import { Plus, ShoppingCart, Star, Trash2 } from 'lucide-react'
import { type FormEvent, useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, ApiError } from '../api/client'
import { ChangeIndicator } from '../components/ChangeIndicator'
import { RefreshControl } from '../components/RefreshControl'
import { ScoreBadge } from '../components/ScoreBadge'
import { MiniSubScores } from '../components/SubScoreBars'
import { TickerAvatar } from '../components/TickerAvatar'
import { TradeDialog } from '../components/TradeDialog'
import { useAutoRefresh } from '../hooks/useAutoRefresh'
import type { ScreenResultItem, WatchlistItemOut } from '../api/types'
import { fmtCurrency } from '../utils/format'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'

const AUTO_REFRESH_MS = 60 * 1000

type Snapshot = ScreenResultItem & { price: number | null; currency: string | null }

export default function WatchlistPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState<WatchlistItemOut[]>([])
  const [snapshots, setSnapshots] = useState<Record<string, Snapshot | 'error'>>({})
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [newTicker, setNewTicker] = useState('')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [trade, setTrade] = useState<string | null>(null)

  const load = useCallback(
    async (opts: { showSkeleton?: boolean; force?: boolean } = {}) => {
      if (opts.showSkeleton) setLoading(true)
      else setRefreshing(true)
      const list = await api.getWatchlist()
      setItems(list)
      setLoading(false)
      await Promise.all(
        list.map((item) =>
          api
            .getStock(item.ticker, { refresh: opts.force })
            .then((a) =>
              setSnapshots((prev) => ({
                ...prev,
                [item.ticker]: {
                  ticker: a.metrics.ticker,
                  name: a.metrics.name,
                  exchange: a.metrics.exchange,
                  sector: a.metrics.sector,
                  score: a.score,
                  sub_scores: a.sub_scores,
                  price_change_pct: a.metrics.price_change_pct,
                  price: a.metrics.price,
                  currency: a.metrics.currency,
                },
              })),
            )
            .catch(() => setSnapshots((prev) => ({ ...prev, [item.ticker]: 'error' }))),
        ),
      )
      setLastUpdated(new Date())
      setRefreshing(false)
    },
    [],
  )

  useEffect(() => {
    load({ showSkeleton: true })
  }, [load])

  useAutoRefresh(() => load(), AUTO_REFRESH_MS)

  async function remove(id: number) {
    await api.removeWatchlistItem(id)
    load()
  }

  async function add(e: FormEvent) {
    e.preventDefault()
    const ticker = newTicker.trim().toUpperCase()
    if (!ticker) return
    setAdding(true)
    setAddError(null)
    try {
      // Validate it's a real ticker before saving it.
      await api.getStock(ticker)
      await api.addWatchlistItem({ ticker, notes: '' })
      setNewTicker('')
      await load()
    } catch (err) {
      setAddError(err instanceof ApiError && err.status !== 404 ? err.message : `Couldn't find "${ticker}".`)
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Watchlist</h1>
          <p className="mt-1 text-sm text-foreground-muted">
            Tickers you're tracking, with a live score snapshot each time you visit.
          </p>
        </div>
        <RefreshControl
          onRefresh={() => load({ force: true })}
          refreshing={refreshing}
          lastUpdated={lastUpdated}
          className="shrink-0 pt-1"
        />
      </div>

      <form onSubmit={add} className="flex flex-col gap-2 sm:max-w-md">
        <div className="flex gap-2">
          <Input
            placeholder="Add a ticker — e.g. SHOP.TO or MSFT"
            value={newTicker}
            onChange={(e) => {
              setNewTicker(e.target.value)
              setAddError(null)
            }}
            aria-label="Ticker to add"
          />
          <Button type="submit" disabled={!newTicker.trim() || adding}>
            <Plus />
            {adding ? 'Adding…' : 'Add'}
          </Button>
        </div>
        {addError && <p className="px-2 text-[13px] text-warning">{addError}</p>}
      </form>

      <Card className="overflow-hidden p-2">
        {loading && (
          <div className="flex flex-col gap-2 p-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        )}

        {!loading && items.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <Star className="h-5 w-5 text-foreground-subtle" />
            <p className="text-sm font-medium text-foreground">Nothing here yet</p>
            <p className="max-w-xs text-sm text-foreground-subtle">
              Add a ticker above, or hit "Watchlist" on any stock's page to start tracking it here.
            </p>
          </div>
        )}

        {!loading && items.length > 0 && (
          <div className="flex flex-col">
            {items.map((item) => {
              const snap = snapshots[item.ticker]
              const ready = snap && snap !== 'error'
              return (
                <div
                  key={item.id}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-surface-hover"
                >
                  <button
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    onClick={() => navigate(`/stock/${encodeURIComponent(item.ticker)}`)}
                  >
                    <TickerAvatar ticker={item.ticker} />
                    <div className="min-w-0 flex-1">
                      <span className="font-semibold text-foreground">{item.ticker}</span>
                      <p className="truncate text-[13px] text-foreground-subtle">
                        {ready ? snap.name : snap === 'error' ? 'Data unavailable' : 'Loading…'}
                      </p>
                    </div>
                  </button>
                  {ready && (
                    <>
                      <div className="hidden w-28 text-right sm:block">
                        <div className="text-sm font-semibold tabular-nums text-foreground">
                          {fmtCurrency(snap.price, snap.currency)}
                        </div>
                        <ChangeIndicator value={snap.price_change_pct} className="justify-end text-[12px]" />
                      </div>
                      <ChangeIndicator value={snap.price_change_pct} className="sm:hidden" />
                      <MiniSubScores scores={snap.sub_scores} className="hidden md:flex" />
                      <ScoreBadge score={snap.score} />
                    </>
                  )}
                  {!snap && <Skeleton className="h-6 w-10 rounded-full" />}
                  <div className="flex items-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setTrade(item.ticker)}
                      aria-label={`Practice trade ${item.ticker}`}
                      title="Practice trade"
                    >
                      <ShoppingCart />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => remove(item.id)}
                      aria-label={`Remove ${item.ticker}`}
                      title="Remove"
                    >
                      <Trash2 className="text-foreground-subtle" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      <TradeDialog open={trade !== null} ticker={trade} onClose={() => setTrade(null)} />
    </div>
  )
}
