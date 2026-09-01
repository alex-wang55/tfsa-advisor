import { AlertTriangle, Search } from 'lucide-react'
import { type FormEvent, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { ScoreBadge } from '../components/ScoreBadge'
import type { ScreenResultItem } from '../api/types'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

type ExchangeFilter = 'ALL' | 'TSX' | 'US'

export default function DashboardPage() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [exchange, setExchange] = useState<ExchangeFilter>('ALL')
  const [results, setResults] = useState<ScreenResultItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    api
      .screen(exchange === 'ALL' ? undefined : exchange)
      .then(setResults)
      .catch((e) => setError(e.message ?? 'Failed to load screener results'))
      .finally(() => setLoading(false))
  }, [exchange])

  function goToTicker(ticker: string) {
    navigate(`/stock/${encodeURIComponent(ticker)}`)
  }

  function onSearchSubmit(e: FormEvent) {
    e.preventDefault()
    if (query.trim()) goToTicker(query.trim())
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Stock Screener</h1>
        <p className="mt-1 max-w-2xl text-sm text-foreground-muted">
          Ranked from a curated TSX + US universe using your risk profile. Scores are a heuristic
          screening tool, not a prediction of future returns — click any row for the full breakdown.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <form onSubmit={onSearchSubmit} className="flex flex-1 gap-2 sm:max-w-sm">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-subtle" />
            <Input
              className="pl-9"
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

      <Card className="p-2 sm:p-4">
        {loading && (
          <div className="flex flex-col gap-3 p-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
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
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-3">Ticker</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="hidden sm:table-cell">Sector</TableHead>
                <TableHead>Market</TableHead>
                <TableHead className="pr-3 text-right">Score</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map((r) => (
                <TableRow
                  key={r.ticker}
                  className="cursor-pointer"
                  onClick={() => goToTicker(r.ticker)}
                >
                  <TableCell className="pl-3 font-mono text-[13px] font-semibold text-foreground">
                    {r.ticker}
                  </TableCell>
                  <TableCell className="max-w-[220px] truncate text-foreground-muted">
                    {r.name ?? '—'}
                  </TableCell>
                  <TableCell className="hidden text-foreground-muted sm:table-cell">
                    {r.sector ?? '—'}
                  </TableCell>
                  <TableCell>
                    <span className="rounded border border-border px-1.5 py-0.5 text-[11px] font-medium text-foreground-muted">
                      {r.exchange}
                    </span>
                  </TableCell>
                  <TableCell className="pr-3 text-right">
                    <ScoreBadge score={r.score} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  )
}
