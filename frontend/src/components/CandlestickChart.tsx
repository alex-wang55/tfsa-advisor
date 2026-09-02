import { Bar, ComposedChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { HistoryPoint } from '../api/types'

interface CandleShapeProps {
  x?: number
  y?: number
  width?: number
  height?: number
  payload?: HistoryPoint
}

function CandleShape(props: CandleShapeProps) {
  const { x, y, width, height, payload } = props
  if (x === undefined || y === undefined || width === undefined || height === undefined || !payload) {
    return null
  }
  const { open, close, high, low } = payload
  const isUp = close >= open
  const color = isUp ? 'var(--success)' : 'var(--negative)'
  const range = high - low || 1
  const pxPerUnit = height / range
  const bodyTop = y + (high - Math.max(open, close)) * pxPerUnit
  const bodyBottom = y + (high - Math.min(open, close)) * pxPerUnit
  const bodyHeight = Math.max(bodyBottom - bodyTop, 1)
  const centerX = x + width / 2
  const bodyWidth = Math.max(width * 0.6, 2)

  return (
    <g>
      <line x1={centerX} x2={centerX} y1={y} y2={y + height} stroke={color} strokeWidth={1} />
      <rect
        x={centerX - bodyWidth / 2}
        y={bodyTop}
        width={bodyWidth}
        height={bodyHeight}
        fill={color}
        rx={1}
      />
    </g>
  )
}

export function CandlestickChart({ history }: { history: HistoryPoint[]; currency: string | null }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <ComposedChart data={history} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null
            const d = payload[0].payload as HistoryPoint
            const isUp = d.close >= d.open
            return (
              <div
                className="rounded-lg border px-3 py-2 text-xs"
                style={{ background: 'var(--surface)', borderColor: 'var(--border-strong)', color: 'var(--foreground)' }}
              >
                <div className="mb-1 font-semibold">{d.date}</div>
                <div>Open {d.open.toFixed(2)}</div>
                <div>High {d.high.toFixed(2)}</div>
                <div>Low {d.low.toFixed(2)}</div>
                <div style={{ color: isUp ? 'var(--success)' : 'var(--negative)' }}>Close {d.close.toFixed(2)}</div>
              </div>
            )
          }}
        />
        <Bar dataKey={(d: HistoryPoint) => [d.low, d.high]} shape={<CandleShape />} isAnimationActive={false} />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
