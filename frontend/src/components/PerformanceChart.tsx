import { useMemo, useState } from 'react'
import { Area, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { PaperHistoryPoint } from '../api/types'
import { fmtCurrency, fmtDate } from '../utils/format'
import { ChangeIndicator } from './ChangeIndicator'
import { cn } from '@/lib/utils'

type Range = '1W' | '1M' | '3M' | '1Y' | 'ALL'

/** Round axis ticks (1, 2, 2.5 or 5 × a power of ten) spanning [lo, hi]. */
function niceTicks(lo: number, hi: number, target = 4): number[] {
  const raw = (hi - lo) / target
  const magnitude = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= raw) ?? raw
  const ticks: number[] = []
  for (let v = Math.floor(lo / step) * step; v <= hi + step * 0.999; v += step) ticks.push(Math.round(v * 100) / 100)
  return ticks
}
const RANGE_DAYS: Record<Range, number | null> = { '1W': 7, '1M': 31, '3M': 92, '1Y': 366, ALL: null }

/** Practice account value over time, with net deposits as a dashed baseline
 * so you can see how much of the balance is gains vs. money you put in. */
export function PerformanceChart({ points }: { points: PaperHistoryPoint[] }) {
  const [range, setRange] = useState<Range>('ALL')

  const visible = useMemo(() => {
    const days = RANGE_DAYS[range]
    if (!days || points.length === 0) return points
    // The last point is always "now", so measure the window back from it.
    const cutoff = new Date(points[points.length - 1].t).getTime() - days * 24 * 60 * 60 * 1000
    const inRange = points.filter((p) => new Date(p.t).getTime() >= cutoff)
    // Anchor the line at the last value before the window so short ranges still have a start.
    const before = points.filter((p) => new Date(p.t).getTime() < cutoff).at(-1)
    return before ? [before, ...inRange] : inRange
  }, [points, range])

  if (points.length === 0) return null

  const first = visible[0]
  const last = visible[visible.length - 1]
  // Performance over the window, net of any deposits made during it.
  const gain = last.value_cad - first.value_cad - (last.deposited_cad - first.deposited_cad)
  const gainPct = first.value_cad > 0 ? (gain / first.value_cad) * 100 : 0
  const up = gain >= 0
  const color = up ? 'var(--success)' : 'var(--negative)'
  // Pad the axis so a near-flat line (e.g. on day one) doesn't print the same label five times.
  const values = visible.flatMap((p) => [p.value_cad, p.deposited_cad])
  const lo = Math.min(...values)
  const hi = Math.max(...values)
  const pad = Math.max((hi - lo) * 0.15, hi * 0.005, 1)
  const ticks = niceTicks(Math.max(0, lo - pad), hi + pad)
  const domain: [number, number] = [ticks[0], ticks[ticks.length - 1]]
  const spansOneDay = new Date(last.t).getTime() - new Date(points[0].t).getTime() < 24 * 60 * 60 * 1000

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-2 text-[13px] text-foreground-muted">
          <ChangeIndicator value={gainPct} amount={gain} currency="CAD" />
          <span>{range === 'ALL' ? 'since you started' : `past ${range}`}</span>
        </div>
        <div className="inline-flex items-center gap-0.5 rounded-full border border-border bg-surface p-1">
          {(Object.keys(RANGE_DAYS) as Range[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={cn(
                'rounded-full px-3 py-1 text-[12px] font-semibold transition-colors',
                range === r ? 'bg-accent text-accent-foreground' : 'text-foreground-muted hover:text-foreground',
              )}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="relative">
        <ResponsiveContainer width="100%" height={240}>
          <ComposedChart data={visible} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="perf-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.22} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="t"
              tick={{ fontSize: 11, fill: 'var(--foreground-subtle)' }}
              tickFormatter={(t: string) => fmtDate(t)}
              minTickGap={48}
              axisLine={{ stroke: 'var(--border)' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: 'var(--foreground-subtle)' }}
              tickFormatter={(v: number) => fmtCurrency(v, 'CAD', { digits: 0 })}
              domain={domain}
              ticks={ticks}
              axisLine={false}
              tickLine={false}
              width={72}
            />
            <Tooltip
              cursor={{ stroke: 'var(--border-strong)', strokeDasharray: '3 3' }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const p = payload[0].payload as PaperHistoryPoint
                return (
                  <div className="rounded-lg border border-border-strong bg-surface px-3 py-2 text-xs text-foreground card-shadow">
                    <div className="mb-1 text-foreground-muted">{fmtDate(p.t, { withTime: true, withYear: true })}</div>
                    <div className="font-semibold tabular-nums">{fmtCurrency(p.value_cad)}</div>
                    <div className="tabular-nums text-foreground-subtle">Deposited {fmtCurrency(p.deposited_cad)}</div>
                  </div>
                )
              }}
            />
            <Line
              type="stepAfter"
              dataKey="deposited_cad"
              stroke="var(--foreground-subtle)"
              strokeDasharray="4 4"
              strokeWidth={1.25}
              dot={false}
              activeDot={false}
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="value_cad"
              stroke={color}
              strokeWidth={2.25}
              fill="url(#perf-fill)"
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0, fill: color }}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
        {spansOneDay && (
          <p className="pointer-events-none absolute inset-x-0 bottom-10 text-center text-[12px] text-foreground-subtle">
            Your chart adds a point at every market close — check back tomorrow to watch it grow.
          </p>
        )}
      </div>
    </div>
  )
}
