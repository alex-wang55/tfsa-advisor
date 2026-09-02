import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { HistoryPoint } from '../api/types'

export function PriceChart({ history, currency }: { history: HistoryPoint[]; currency: string | null }) {
  if (history.length === 0) {
    return <p className="text-sm text-foreground-subtle">No price history available.</p>
  }
  const isUp = history[history.length - 1].close >= history[0].close
  const lineColor = isUp ? 'var(--success)' : 'var(--negative)'
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={history} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
          formatter={(value) => [`${currency ?? ''} ${Number(value).toFixed(2)}`, 'Close']}
          contentStyle={{
            borderRadius: 8,
            fontSize: 13,
            background: 'var(--surface)',
            border: '1px solid var(--border-strong)',
            color: 'var(--foreground)',
          }}
          labelStyle={{ color: 'var(--foreground-muted)' }}
        />
        <Line type="monotone" dataKey="close" stroke={lineColor} strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}
