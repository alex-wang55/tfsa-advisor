import type { SubScores } from '../api/types'
import { scoreTone } from '../utils/score'
import { cn } from '@/lib/utils'

const LABELS: { key: keyof SubScores; label: string; hint: string }[] = [
  { key: 'trend', label: 'Trend', hint: 'Price vs. moving averages, momentum, RSI' },
  { key: 'value', label: 'Value', hint: 'Trailing and forward P/E — lower is cheaper' },
  { key: 'quality', label: 'Quality', hint: 'Debt, beta and price volatility' },
  { key: 'income', label: 'Income', hint: 'Dividend yield and how sustainable it looks' },
]

const BAR_COLOR = {
  success: 'bg-success',
  neutral: 'bg-foreground-muted',
  warning: 'bg-warning',
}

/** Full-size labelled bars for the stock detail page. */
export function SubScoreBars({ scores }: { scores: SubScores }) {
  return (
    <div className="flex flex-col gap-4">
      {LABELS.map(({ key, label, hint }) => {
        const value = scores[key]
        return (
          <div key={key}>
            <div className="mb-1.5 flex items-baseline justify-between gap-3">
              <div>
                <span className="text-sm font-semibold text-foreground">{label}</span>
                <span className="ml-2 hidden text-[12px] text-foreground-subtle sm:inline">{hint}</span>
              </div>
              <span className="text-sm font-semibold tabular-nums text-foreground">{Math.round(value)}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-surface-hover">
              <div
                className={cn('bar-grow h-full rounded-full', BAR_COLOR[scoreTone(value)])}
                style={{ width: `${Math.max(2, Math.min(100, value))}%` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

/** Four tiny bars for list rows, so you can compare stocks at a glance. */
export function MiniSubScores({ scores, className }: { scores: SubScores; className?: string }) {
  return (
    <div className={cn('flex items-end gap-1', className)} aria-label="Trend, value, quality and income scores">
      {LABELS.map(({ key, label }) => {
        const value = scores[key]
        return (
          <div key={key} className="flex flex-col items-center gap-1" title={`${label}: ${Math.round(value)}`}>
            <div className="flex h-6 w-2 items-end overflow-hidden rounded-full bg-surface-hover">
              <div
                className={cn('w-full rounded-full', BAR_COLOR[scoreTone(value)])}
                style={{ height: `${Math.max(8, Math.min(100, value))}%` }}
              />
            </div>
            <span className="text-[9px] font-semibold uppercase text-foreground-subtle">{label[0]}</span>
          </div>
        )
      })}
    </div>
  )
}
