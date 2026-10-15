import { CheckCircle2, Search } from 'lucide-react'
import { type FormEvent, type ReactNode, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import type { PaperQuote, PaperTransaction } from '../api/types'
import { usePractice } from '../practice/store'
import { fmtCurrency, fmtShares } from '../utils/format'
import { ChangeIndicator } from './ChangeIndicator'
import { StartPracticeForm } from './StartPracticeForm'
import { TickerAvatar } from './TickerAvatar'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

type Side = 'buy' | 'sell'
type SizeMode = 'dollars' | 'shares'

interface TradeDialogProps {
  open: boolean
  onClose: () => void
  /** Omit to let the user type a ticker first. */
  ticker?: string | null
  initialSide?: Side
}

export function TradeDialog({ open, onClose, ticker, initialSide = 'buy' }: TradeDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Practice trade"
      description="Pretend money, real prices — nothing here touches a real account."
    >
      {/* Mounted only while open, so every trade starts from a clean form. */}
      <TradeFlow initialTicker={ticker ?? ''} initialSide={initialSide} onClose={onClose} />
    </Dialog>
  )
}

function TradeFlow({ initialTicker, initialSide, onClose }: {
  initialTicker: string
  initialSide: Side
  onClose: () => void
}) {
  const { hasAccount } = usePractice()
  const [ticker, setTicker] = useState(initialTicker)

  if (!hasAccount) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-foreground-muted">
          First, choose how much pretend cash your practice TFSA starts with. You can add more or start over any time.
        </p>
        <StartPracticeForm submitLabel="Open account" />
      </div>
    )
  }
  if (!ticker) return <TickerPicker onPick={setTicker} />
  return <OrderForm ticker={ticker} initialSide={initialSide} onClose={onClose} />
}

function TickerPicker({ onPick }: { onPick: (ticker: string) => void }) {
  const [value, setValue] = useState('')
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (value.trim()) onPick(value.trim().toUpperCase())
      }}
      className="flex flex-col gap-3"
    >
      <label htmlFor="trade-ticker" className="text-sm font-medium text-foreground">
        Which stock?
      </label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-subtle" />
          <Input
            id="trade-ticker"
            autoFocus
            data-autofocus
            className="pl-11"
            placeholder="AAPL, SHOP.TO…"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </div>
        <Button type="submit" disabled={!value.trim()}>
          Continue
        </Button>
      </div>
      <p className="text-[12px] text-foreground-subtle">TSX tickers end in .TO (e.g. RY.TO). US tickers have no suffix.</p>
    </form>
  )
}

function OrderForm({ ticker, initialSide, onClose }: { ticker: string; initialSide: Side; onClose: () => void }) {
  const navigate = useNavigate()
  const { transactions, append } = usePractice()
  const [quote, setQuote] = useState<PaperQuote | null>(null)
  const [quoteError, setQuoteError] = useState<string | null>(null)
  const [side, setSide] = useState<Side>(initialSide)
  const [mode, setMode] = useState<SizeMode>('dollars')
  const [input, setInput] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fill, setFill] = useState<PaperTransaction | null>(null)

  useEffect(() => {
    let cancelled = false
    api
      .paperQuote(transactions, ticker)
      .then((q) => {
        if (cancelled) return
        setQuote(q)
        if (q.shares_held <= 0) setSide('buy')
      })
      .catch((e) => !cancelled && setQuoteError(e.message ?? 'Could not load a price'))
    return () => {
      cancelled = true
    }
  }, [ticker, transactions])

  if (fill) {
    const verb = fill.kind === 'buy' ? 'Bought' : 'Sold'
    return (
      <div className="flex flex-col items-center gap-3 py-2 text-center">
        <CheckCircle2 className="h-10 w-10 text-success" />
        <div>
          <p className="text-base font-semibold text-foreground">
            {verb} {fmtShares(fill.shares)} {fill.shares === 1 ? 'share' : 'shares'} of {fill.ticker}
          </p>
          <p className="mt-1 text-sm text-foreground-muted">
            at {fmtCurrency(fill.price, fill.currency)} · {fmtCurrency(fill.amount_cad)} total
            {fill.currency !== 'CAD' && <> · USD/CAD {fill.fx_rate.toFixed(4)}</>}
          </p>
        </div>
        <div className="mt-2 flex w-full gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Done
          </Button>
          <Button
            className="flex-1"
            onClick={() => {
              onClose()
              navigate('/portfolio')
            }}
          >
            View portfolio
          </Button>
        </div>
      </div>
    )
  }

  if (quoteError) {
    return (
      <div className="flex flex-col gap-4">
        <p className="rounded-md bg-warning-bg px-4 py-3 text-sm text-warning">{quoteError}</p>
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>
    )
  }

  if (!quote) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-10 w-full rounded-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    )
  }

  const held = quote.shares_held
  const parsed = Number(input)
  const hasInput = input.trim() !== '' && Number.isFinite(parsed) && parsed > 0
  const shares = hasInput ? (mode === 'shares' ? parsed : parsed / quote.price_cad) : 0
  const dollars = hasInput ? (mode === 'dollars' ? parsed : parsed * quote.price_cad) : 0
  const sellsAll = side === 'sell' && hasInput && held - shares < 1e-4

  let problem: string | null = null
  if (hasInput && side === 'buy' && dollars > quote.cash_cad + 0.005) {
    problem = `That's more than your ${fmtCurrency(quote.cash_cad)} of practice cash.`
  } else if (hasInput && side === 'sell' && shares > held + 1e-4) {
    problem = `You only own ${fmtShares(held)} shares.`
  } else if (hasInput && dollars < 1 && !sellsAll) {
    problem = 'The minimum order is $1.00.'
  }

  const cashAfter = quote.cash_cad + (side === 'buy' ? -dollars : dollars)
  const sharesAfter = Math.max(0, held + (side === 'buy' ? shares : -shares))

  function setPreset(nextMode: SizeMode, value: number) {
    setMode(nextMode)
    setInput(nextMode === 'dollars' ? (Math.floor(value * 100) / 100).toFixed(2) : String(value))
    setError(null)
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!hasInput || problem) return
    setSubmitting(true)
    setError(null)
    try {
      const result = await api.paperOrder(transactions, {
        ticker: quote!.ticker,
        side,
        ...(mode === 'dollars' ? { amount_cad: parsed } : { shares: parsed }),
      })
      append(result)
      setFill(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The order failed — try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const submitLabel = !hasInput
    ? side === 'buy' ? 'Enter an amount' : 'Enter how much to sell'
    : side === 'buy'
      ? `Buy ${fmtCurrency(dollars)} of ${quote.ticker}`
      : sellsAll
        ? `Sell all ${quote.ticker}`
        : `Sell ${fmtShares(shares)} ${quote.ticker}`

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <div className="flex items-center gap-3 rounded-md bg-surface-hover px-3.5 py-3">
        <TickerAvatar ticker={quote.ticker} size={36} />
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-foreground">{quote.ticker}</div>
          <div className="truncate text-[12px] text-foreground-subtle">{quote.name ?? quote.exchange}</div>
        </div>
        <div className="text-right">
          <div className="font-semibold tabular-nums text-foreground">{fmtCurrency(quote.price, quote.currency)}</div>
          <ChangeIndicator value={quote.price_change_pct} className="text-[12px]" />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <SegmentedControl
          value={side}
          onChange={(s) => {
            setSide(s)
            setInput('')
            setError(null)
          }}
          options={[
            { value: 'buy', label: 'Buy' },
            ...(held > 0 ? [{ value: 'sell' as const, label: 'Sell' }] : []),
          ]}
        />
        <SegmentedControl
          value={mode}
          onChange={(m) => {
            setMode(m)
            setInput('')
          }}
          options={[
            { value: 'dollars', label: '$ Amount' },
            { value: 'shares', label: 'Shares' },
          ]}
        />
      </div>

      <div>
        <div className="relative">
          {mode === 'dollars' && (
            <span className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-2xl font-semibold text-foreground-subtle">
              $
            </span>
          )}
          <Input
            autoFocus
            data-autofocus
            type="number"
            inputMode="decimal"
            step="any"
            min={0}
            placeholder={mode === 'dollars' ? '0.00' : '0'}
            value={input}
            onChange={(e) => {
              setInput(e.target.value)
              setError(null)
            }}
            aria-label={mode === 'dollars' ? 'Amount in Canadian dollars' : 'Number of shares'}
            className={cn('h-14 text-2xl font-semibold tabular-nums', mode === 'dollars' ? 'pl-10' : 'pl-5')}
          />
          {mode === 'shares' && (
            <span className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-sm text-foreground-subtle">
              shares
            </span>
          )}
        </div>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {side === 'buy'
            ? [100, 500, 1000].map((v) => (
                <Chip key={v} onClick={() => setPreset('dollars', v)} disabled={v > quote.cash_cad}>
                  {fmtCurrency(v, 'CAD', { digits: 0 })}
                </Chip>
              ))
            : [0.25, 0.5].map((f) => (
                <Chip key={f} onClick={() => setPreset('shares', held * f)}>
                  {f * 100}%
                </Chip>
              ))}
          <Chip onClick={() => (side === 'buy' ? setPreset('dollars', quote.cash_cad) : setPreset('shares', held))}>
            {side === 'buy' ? 'All cash' : 'All shares'}
          </Chip>
        </div>
      </div>

      <dl className="flex flex-col gap-2 border-t border-border pt-4 text-sm">
        <Row label={mode === 'dollars' ? 'Estimated shares' : 'Estimated value'}>
          {mode === 'dollars' ? fmtShares(shares) : fmtCurrency(dollars)}
        </Row>
        {quote.currency !== 'CAD' && (
          <Row label="Price in CAD">
            {fmtCurrency(quote.price_cad)}
            <span className="ml-1.5 text-foreground-subtle">@ {quote.fx_rate.toFixed(4)} USD/CAD</span>
          </Row>
        )}
        <Row label="Practice cash">
          {fmtCurrency(quote.cash_cad)}
          {hasInput && <span className="text-foreground-subtle"> → {fmtCurrency(cashAfter)}</span>}
        </Row>
        <Row label={`${quote.ticker} owned`}>
          {fmtShares(held)}
          {hasInput && <span className="text-foreground-subtle"> → {fmtShares(sharesAfter)}</span>}
        </Row>
      </dl>

      {(problem || error) && (
        <p className="rounded-md bg-warning-bg px-3.5 py-2.5 text-[13px] text-warning">{problem ?? error}</p>
      )}

      <Button type="submit" size="lg" disabled={!hasInput || !!problem || submitting}>
        {submitting ? 'Placing order…' : submitLabel}
      </Button>
      <p className="-mt-2 text-center text-[11px] text-foreground-subtle">
        Fills instantly at the latest market price (can lag up to a minute). Fractional shares allowed.
      </p>
    </form>
  )
}

function Chip({ children, onClick, disabled }: { children: ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-full border border-border px-3 py-1 text-[12px] font-semibold text-foreground-muted transition-colors hover:border-border-strong hover:text-foreground disabled:opacity-40"
    >
      {children}
    </button>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-foreground-muted">{label}</dt>
      <dd className="text-right font-medium tabular-nums text-foreground">{children}</dd>
    </div>
  )
}
