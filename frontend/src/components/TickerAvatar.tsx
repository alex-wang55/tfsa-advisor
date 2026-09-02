const PALETTE = ['#16171a', '#1f8a4c', '#b5540e', '#3d5ce0', '#7a5cfa', '#0e7c86', '#c23b6b']

function colorFor(ticker: string): string {
  let hash = 0
  for (let i = 0; i < ticker.length; i++) hash = (hash * 31 + ticker.charCodeAt(i)) >>> 0
  return PALETTE[hash % PALETTE.length]
}

export function TickerAvatar({ ticker, size = 32 }: { ticker: string; size?: number }) {
  const letters = ticker.replace(/\..*/, '').slice(0, 2).toUpperCase()
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
      style={{
        width: size,
        height: size,
        background: colorFor(ticker),
        fontSize: size * 0.36,
      }}
    >
      {letters}
    </span>
  )
}
