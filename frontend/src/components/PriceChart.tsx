import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { HistoryPoint } from '../api/types'
import { fmtCurrency } from '../utils/format'

export function PriceChart({ history, currency }: { history: HistoryPoint[]; currency: string | null }) {
  if (history.length === 0) {
    return <p className="text-sm text-foreground-subtle">No price history available.</p>
  }
  const isUp = history[history.length - 1].close >= history[0].close
  const lineColor = isUp ? 'var(--success)' : 'var(--negative)'
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={history} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="price-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={lineColor} stopOpacity={0.2} />
            <stop offset="100%" stopColor={lineColor} stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: 'var(--foreground-subtle)' }}
          tickFormatter={(d: string) => d.slice(5)}
          minTickGap={40}
          axisLine={{ stroke: 'var(--border)' }}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: 'var(--foreground-subtle)' }}
          domain={['auto', 'auto']}
          axisLine={false}
          tickLine={false}
          width={50}
        />
        <Tooltip
          cursor={{ stroke: 'var(--border-strong)', strokeDasharray: '3 3' }}
          formatter={(value) => [fmtCurrency(Number(value), currency), 'Close']}
          contentStyle={{
            borderRadius: 8,
            fontSize: 13,
            background: 'var(--surface)',
            border: '1px solid var(--border-strong)',
            color: 'var(--foreground)',
          }}
          labelStyle={{ color: 'var(--foreground-muted)' }}
        />
        <Area
          type="monotone"
          dataKey="close"
          stroke={lineColor}
          strokeWidth={2}
          fill="url(#price-fill)"
          dot={false}
          activeDot={{ r: 4, strokeWidth: 0, fill: lineColor }}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
