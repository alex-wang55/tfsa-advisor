import { CandlestickChart as CandlestickIcon, LineChart as LineIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { HistoryPoint } from '../api/types'
import { CandlestickChart } from './CandlestickChart'
import { PriceChart } from './PriceChart'
import { cn } from '@/lib/utils'

type Range = '1M' | '3M' | '6M' | '1Y' | 'ALL'
type ChartType = 'line' | 'candle'

const RANGE_DAYS: Record<Range, number | null> = {
  '1M': 21,
  '3M': 63,
  '6M': 126,
  '1Y': 252,
  ALL: null,
}

export function StockChart({ history, currency }: { history: HistoryPoint[]; currency: string | null }) {
  const [range, setRange] = useState<Range>('1Y')
  const [chartType, setChartType] = useState<ChartType>('candle')

  const visible = useMemo(() => {
    const days = RANGE_DAYS[range]
    return days ? history.slice(-days) : history
  }, [history, range])

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center gap-0.5 rounded-full border border-border bg-surface p-1">
          {(['1M', '3M', '6M', '1Y', 'ALL'] as Range[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={cn(
                'rounded-full px-3 py-1 text-[12px] font-semibold transition-colors',
                range === r
                  ? 'bg-accent text-accent-foreground'
                  : 'text-foreground-muted hover:text-foreground',
              )}
            >
              {r}
            </button>
          ))}
        </div>

        <div className="inline-flex items-center gap-0.5 rounded-full border border-border bg-surface p-1">
          <button
            onClick={() => setChartType('candle')}
            aria-label="Candlestick chart"
            className={cn(
              'flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-semibold transition-colors',
              chartType === 'candle'
                ? 'bg-accent text-accent-foreground'
                : 'text-foreground-muted hover:text-foreground',
            )}
          >
            <CandlestickIcon className="h-3.5 w-3.5" />
            Candles
          </button>
          <button
            onClick={() => setChartType('line')}
            aria-label="Line chart"
            className={cn(
              'flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-semibold transition-colors',
              chartType === 'line'
                ? 'bg-accent text-accent-foreground'
                : 'text-foreground-muted hover:text-foreground',
            )}
          >
            <LineIcon className="h-3.5 w-3.5" />
            Line
          </button>
        </div>
      </div>

      {chartType === 'candle' ? (
        <CandlestickChart history={visible} currency={currency} />
      ) : (
        <PriceChart history={visible} currency={currency} />
      )}
    </div>
  )
}
