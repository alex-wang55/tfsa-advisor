import { tickerColor } from '../utils/tickerColor'

export function TickerAvatar({ ticker, size = 32 }: { ticker: string; size?: number }) {
  const letters = ticker.replace(/\..*/, '').slice(0, 2).toUpperCase()
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
      style={{
        width: size,
        height: size,
        background: tickerColor(ticker),
        fontSize: size * 0.36,
      }}
    >
      {letters}
    </span>
  )
}
