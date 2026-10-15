const PALETTE = ['#16171a', '#1f8a4c', '#b5540e', '#3d5ce0', '#7a5cfa', '#0e7c86', '#c23b6b']

/** A stable colour per ticker, shared by avatars and allocation charts. */
export function tickerColor(ticker: string): string {
  let hash = 0
  for (let i = 0; i < ticker.length; i++) hash = (hash * 31 + ticker.charCodeAt(i)) >>> 0
  return PALETTE[hash % PALETTE.length]
}
