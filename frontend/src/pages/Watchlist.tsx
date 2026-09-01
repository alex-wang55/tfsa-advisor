import { Star, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { ScoreBadge } from '../components/ScoreBadge'
import type { ScreenResultItem, WatchlistItemOut } from '../api/types'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export default function WatchlistPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState<WatchlistItemOut[]>([])
  const [snapshots, setSnapshots] = useState<Record<string, ScreenResultItem | 'error'>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    refresh()
  }, [])

  async function refresh() {
    setLoading(true)
    const list = await api.getWatchlist()
    setItems(list)
    setLoading(false)
    for (const item of list) {
      api
        .getStock(item.ticker)
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
            },
          })),
        )
        .catch(() => setSnapshots((prev) => ({ ...prev, [item.ticker]: 'error' })))
    }
  }

  async function remove(id: number) {
    await api.removeWatchlistItem(id)
    refresh()
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Watchlist</h1>
        <p className="mt-1 text-sm text-foreground-muted">
          Tickers you're tracking, with a live score snapshot each time you visit.
        </p>
      </div>

      <Card className="p-2 sm:p-4">
        {loading && (
          <div className="flex flex-col gap-3 p-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
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
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-3">Ticker</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Score</TableHead>
                <TableHead className="hidden sm:table-cell">Added</TableHead>
                <TableHead className="pr-3" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => {
                const snap = snapshots[item.ticker]
                return (
                  <TableRow key={item.id}>
                    <TableCell
                      className="cursor-pointer pl-3 font-mono text-[13px] font-semibold text-foreground"
                      onClick={() => navigate(`/stock/${item.ticker}`)}
                    >
                      {item.ticker}
                    </TableCell>
                    <TableCell className="text-foreground-muted">
                      {snap && snap !== 'error' ? snap.name : '—'}
                    </TableCell>
                    <TableCell>
                      {snap === 'error' && <span className="text-sm text-foreground-subtle">unavailable</span>}
                      {snap && snap !== 'error' && <ScoreBadge score={snap.score} />}
                      {!snap && <Skeleton className="h-5 w-9" />}
                    </TableCell>
                    <TableCell className="hidden text-foreground-muted sm:table-cell">
                      {item.added_on}
                    </TableCell>
                    <TableCell className="pr-3 text-right">
                      <Button variant="ghost" size="icon" onClick={() => remove(item.id)}>
                        <Trash2 className="text-foreground-subtle" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  )
}
