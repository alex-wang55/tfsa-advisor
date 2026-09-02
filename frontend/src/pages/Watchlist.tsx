import { Star, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { ChangeIndicator } from '../components/ChangeIndicator'
import { RefreshControl } from '../components/RefreshControl'
import { ScoreBadge } from '../components/ScoreBadge'
import { TickerAvatar } from '../components/TickerAvatar'
import { useAutoRefresh } from '../hooks/useAutoRefresh'
import type { ScreenResultItem, WatchlistItemOut } from '../api/types'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

const AUTO_REFRESH_MS = 60 * 1000

export default function WatchlistPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState<WatchlistItemOut[]>([])
  const [snapshots, setSnapshots] = useState<Record<string, ScreenResultItem | 'error'>>({})
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

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
              Analyze a stock and click "Watchlist" to start tracking it here.
            </p>
          </div>
        )}

        {!loading && items.length > 0 && (
          <div className="flex flex-col">
            {items.map((item) => {
              const snap = snapshots[item.ticker]
              return (
                <div
                  key={item.id}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-surface-hover"
                >
                  <button
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    onClick={() => navigate(`/stock/${item.ticker}`)}
                  >
                    <TickerAvatar ticker={item.ticker} />
                    <div className="min-w-0 flex-1">
                      <span className="font-semibold text-foreground">{item.ticker}</span>
                      <p className="truncate text-[13px] text-foreground-subtle">
                        {snap && snap !== 'error' ? snap.name : 'Loading…'}
                      </p>
                    </div>
                  </button>
                  {snap === 'error' && <span className="text-sm text-foreground-subtle">unavailable</span>}
                  {snap && snap !== 'error' && (
                    <>
                      <ChangeIndicator value={snap.price_change_pct} className="hidden w-20 justify-end sm:inline-flex" />
                      <ScoreBadge score={snap.score} />
                    </>
                  )}
                  {!snap && <Skeleton className="h-6 w-10 rounded-full" />}
                  <Button variant="ghost" size="icon" onClick={() => remove(item.id)}>
                    <Trash2 className="text-foreground-subtle" />
                  </Button>
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}
