export function fmtNum(value: number | null | undefined, digits = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  return value.toFixed(digits)
}

export function fmtPct(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(digits)}%`
}

const currencyFormats = new Map<string, Intl.NumberFormat>()

/** Locale-aware money: "$1,234.56" for CAD, "US$1,234.56" for USD. `signed`
 * adds a leading +/− (for gains and losses). */
export function fmtCurrency(
  value: number | null | undefined,
  currency: string | null = 'CAD',
  opts: { signed?: boolean; digits?: number } = {},
): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  const digits = opts.digits ?? 2
  const key = `${currency}:${opts.signed}:${digits}`
  let fmt = currencyFormats.get(key)
  if (!fmt) {
    try {
      fmt = new Intl.NumberFormat('en-CA', {
        style: 'currency',
        currency: currency ?? 'CAD',
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
        signDisplay: opts.signed ? 'exceptZero' : 'auto',
      })
    } catch {
      return `${currency ?? ''} ${value.toFixed(digits)}`.trim()
    }
    currencyFormats.set(key, fmt)
  }
  return fmt.format(value)
}

export function fmtMoney(value: number | null | undefined, currency: string | null = 'USD'): string {
  return fmtCurrency(value, currency)
}

export function fmtShares(value: number): string {
  return value.toLocaleString('en-CA', { maximumFractionDigits: value < 1 ? 6 : 4 })
}

export function fmtDate(iso: string, opts: { withTime?: boolean; withYear?: boolean } = {}): string {
  return new Date(iso).toLocaleString('en-CA', {
    month: 'short',
    day: 'numeric',
    ...(opts.withYear ? { year: 'numeric' } : {}),
    ...(opts.withTime ? { hour: 'numeric', minute: '2-digit' } : {}),
  })
}

export function fmtTimeAgo(date: Date | null): string {
  if (!date) return ''
  const seconds = Math.max(0, Math.round((Date.now() - date.getTime()) / 1000))
  if (seconds < 5) return 'just now'
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  return `${hours}h ago`
}

export function fmtMarketCap(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  if (value >= 1e12) return `${(value / 1e12).toFixed(2)}T`
  if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`
  if (value >= 1e6) return `${(value / 1e6).toFixed(0)}M`
  return value.toFixed(0)
}
