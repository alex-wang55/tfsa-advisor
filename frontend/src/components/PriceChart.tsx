import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { HistoryPoint } from '../api/types'

export function PriceChart({ history, currency }: { history: HistoryPoint[]; currency: string | null }) {
  if (history.length === 0) {
    return <p className="muted">No price history available.</p>
  }
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={history} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
          tickFormatter={(d: string) => d.slice(5)}
          minTickGap={40}
          axisLine={{ stroke: 'var(--border)' }}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
          domain={['auto', 'auto']}
          axisLine={false}
          tickLine={false}
          width={50}
        />
        <Tooltip
          formatter={(value: number) => [`${currency ?? ''} ${value.toFixed(2)}`, 'Close']}
          labelStyle={{ color: '#111' }}
          contentStyle={{ borderRadius: 8, fontSize: 13 }}
        />
        <Line type="monotone" dataKey="close" stroke="var(--accent)" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}
