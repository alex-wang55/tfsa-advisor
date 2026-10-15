import {
  AlertTriangle,
  ArrowDownRight,
  ArrowLeftRight,
  ArrowUpRight,
  ChartLine,
  ChevronDown,
  CircleDollarSign,
  Plus,
  ShoppingCart,
  Sparkles,
} from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { Link } from 'react-router-dom'
import type { PaperHistoryPoint, PaperPortfolio, PaperTransaction } from '../api/types'
import { ChangeIndicator } from '../components/ChangeIndicator'
import { PerformanceChart } from '../components/PerformanceChart'
import { RefreshControl } from '../components/RefreshControl'
import { StartPracticeForm } from '../components/StartPracticeForm'
import { TickerAvatar } from '../components/TickerAvatar'
import { TradeDialog } from '../components/TradeDialog'
import { usePracticePortfolio } from '../hooks/usePracticePortfolio'
import { usePractice } from '../practice/store'
import { fmtCurrency, fmtDate, fmtShares } from '../utils/format'
import { tickerColor } from '../utils/tickerColor'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

type TradeTarget = { ticker: string | null; side: 'buy' | 'sell' }

export default function PortfolioPage() {
  const { hasAccount, transactions } = usePractice()
  const { portfolio, history, loading, refreshing, error, lastUpdated, refresh } = usePracticePortfolio({
    withHistory: true,
  })
  const [trade, setTrade] = useState<TradeTarget | null>(null)
  const [panel, setPanel] = useState<'funds' | 'reset' | null>(null)

  if (!hasAccount) return <Onboarding />

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Practice Portfolio</h1>
          <p className="mt-1 text-sm text-foreground-muted">
            Pretend money, real prices.
            {portfolio && <> Started {fmtDate(portfolio.started_at, { withYear: true })}.</>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <RefreshControl onRefresh={refresh} refreshing={refreshing} lastUpdated={lastUpdated} className="mr-1" />
          <Button variant="outline" size="sm" onClick={() => setPanel('funds')}>
            <Plus />
            Add cash
          </Button>
          <Button size="sm" onClick={() => setTrade({ ticker: null, side: 'buy' })}>
            <ShoppingCart />
            Buy a stock
          </Button>
        </div>
      </div>

      {error && !portfolio && (
        <Card className="flex flex-col items-center gap-2 py-14 text-center">
          <AlertTriangle className="h-5 w-5 text-warning" />
          <p className="text-sm text-foreground-muted">{error}</p>
          <Button variant="outline" size="sm" className="mt-2" onClick={refresh}>
            Try again
          </Button>
        </Card>
      )}

      {loading && !portfolio && (
        <div className="flex flex-col gap-6">
          <Skeleton className="h-[420px] w-full rounded-lg" />
          <Skeleton className="h-56 w-full rounded-lg" />
        </div>
      )}

      {portfolio && (
        <>
          <Summary portfolio={portfolio} history={history} />

          <div className="grid items-start gap-6 lg:grid-cols-3">
            <Holdings portfolio={portfolio} onTrade={setTrade} className="lg:col-span-2" />
            <div className="flex flex-col gap-6">
              <Allocation portfolio={portfolio} />
              <HowItWorks />
            </div>
          </div>

          <Activity transactions={transactions} />

          <div className="flex justify-center">
            <button
              onClick={() => setPanel('reset')}
              className="text-[13px] font-medium text-foreground-subtle underline-offset-4 transition-colors hover:text-negative hover:underline"
            >
              Start over with a new balance
            </button>
          </div>
        </>
      )}

      <TradeDialog
        open={trade !== null}
        ticker={trade?.ticker}
        initialSide={trade?.side}
        onClose={() => setTrade(null)}
      />
      <Dialog
        open={panel === 'funds'}
        onClose={() => setPanel(null)}
        title="Add practice cash"
        description="Like a new TFSA contribution — it raises your cash, not your returns."
      >
        <AddFundsForm onDone={() => setPanel(null)} />
      </Dialog>
      <Dialog
        open={panel === 'reset'}
        onClose={() => setPanel(null)}
        title="Start over?"
        description="This erases your practice holdings, trades and chart in this browser. Pick a new starting balance."
      >
        <StartPracticeForm submitLabel="Erase and restart" onStarted={() => setPanel(null)} />
      </Dialog>
    </div>
  )
}

function Onboarding() {
  const steps = [
    { icon: CircleDollarSign, title: 'Fund it', text: 'Pick a pretend starting balance — even your real TFSA room.' },
    { icon: ShoppingCart, title: 'Buy real stocks', text: 'Any TSX or US ticker, at live prices, fractional shares included.' },
    { icon: ChartLine, title: 'Watch it play out', text: 'Come back over days and weeks to see how your picks actually did.' },
  ]
  return (
    <div className="grid items-start gap-8 lg:grid-cols-[1fr_1.1fr] lg:gap-12">
      <div className="flex flex-col gap-5 lg:pt-4">
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-success-bg px-3 py-1 text-[12px] font-semibold text-success">
          <Sparkles className="h-3.5 w-3.5" />
          Practice mode
        </span>
        <h1 className="text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-4xl">
          Invest pretend money.
          <br />
          Watch real results.
        </h1>
        <p className="max-w-md text-[15px] leading-relaxed text-foreground-muted">
          A practice TFSA lets you test what you've learned here before any real money is on the line.
        </p>
        <ol className="mt-2 flex flex-col gap-4">
          {steps.map(({ icon: Icon, title, text }, i) => (
            <li key={title} className="flex items-start gap-3.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface card-shadow">
                <Icon className="h-4 w-4 text-foreground" />
              </span>
              <div>
                <div className="text-sm font-semibold text-foreground">
                  {i + 1}. {title}
                </div>
                <div className="text-sm text-foreground-muted">{text}</div>
              </div>
            </li>
          ))}
        </ol>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>How much pretend cash?</CardTitle>
          <CardDescription>Saved in this browser. You can add more or start over any time.</CardDescription>
        </CardHeader>
        <CardContent>
          <StartPracticeForm />
        </CardContent>
      </Card>
    </div>
  )
}

function Summary({ portfolio: p, history }: { portfolio: PaperPortfolio; history: PaperHistoryPoint[] }) {
  const returnTone = p.total_return_cad >= 0 ? 'text-success' : 'text-negative'
  return (
    <Card>
      <CardContent className="flex flex-col gap-6">
        <div>
          <div className="text-[13px] font-medium text-foreground-muted">Total value</div>
          <div className="mt-1 text-4xl font-bold tracking-tight tabular-nums text-foreground sm:text-[44px]">
            {fmtCurrency(p.total_value_cad)}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-[13px]">
            <span className="inline-flex items-center gap-1.5">
              <ChangeIndicator value={p.day_change_pct} amount={p.day_change_cad} currency="CAD" />
              <span className="text-foreground-subtle">today</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ChangeIndicator value={p.total_return_pct} amount={p.total_return_cad} currency="CAD" />
              <span className="text-foreground-subtle">all time</span>
            </span>
          </div>
        </div>

        <PerformanceChart points={history} />

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Cash" value={fmtCurrency(p.cash_cad)} />
          <Stat label="Invested" value={fmtCurrency(p.holdings_value_cad)} />
          <Stat
            label="Total return"
            value={fmtCurrency(p.total_return_cad, 'CAD', { signed: true })}
            valueClassName={returnTone}
            sub={`on ${fmtCurrency(p.deposited_cad, 'CAD', { digits: 0 })} deposited`}
          />
          <Stat
            label="Realized gains"
            value={fmtCurrency(p.realized_pnl_cad, 'CAD', { signed: true })}
            sub="from shares you've sold"
          />
        </div>
      </CardContent>
    </Card>
  )
}

function Stat({ label, value, sub, valueClassName }: { label: string; value: string; sub?: string; valueClassName?: string }) {
  return (
    <div className="rounded-md bg-surface-hover p-3.5">
      <div className="text-[11px] font-medium uppercase tracking-wide text-foreground-subtle">{label}</div>
      <div className={cn('mt-1 text-base font-semibold tabular-nums text-foreground', valueClassName)}>{value}</div>
      {sub && <div className="mt-0.5 text-[11px] text-foreground-subtle">{sub}</div>}
    </div>
  )
}

function Holdings({ portfolio, onTrade, className }: {
  portfolio: PaperPortfolio
  onTrade: (t: TradeTarget) => void
  className?: string
}) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Holdings</CardTitle>
        <span className="text-[13px] text-foreground-subtle">
          {portfolio.holdings.length} {portfolio.holdings.length === 1 ? 'stock' : 'stocks'}
        </span>
      </CardHeader>
      <CardContent className="px-3 pb-3 pt-3">
        {portfolio.holdings.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
            <ShoppingCart className="h-5 w-5 text-foreground-subtle" />
            <p className="text-sm font-medium text-foreground">No stocks yet</p>
            <p className="max-w-xs text-sm text-foreground-subtle">
              Browse the <Link to="/" className="font-medium text-foreground underline underline-offset-4">screener</Link>{' '}
              for ideas, then hit “Practice trade” on any stock.
            </p>
            <Button size="sm" className="mt-3" onClick={() => onTrade({ ticker: null, side: 'buy' })}>
              Buy your first stock
            </Button>
          </div>
        ) : (
          <>
            <div className="hidden grid-cols-[minmax(0,1fr)_88px_128px_104px_40px] gap-3 px-3 pb-2 text-[11px] font-semibold uppercase tracking-wide text-foreground-subtle sm:grid">
              <span>Stock</span>
              <span className="text-right">Today</span>
              <span className="text-right">Value</span>
              <span className="text-right">Return</span>
              <span />
            </div>
            <div className="flex flex-col">
              {portfolio.holdings.map((h) => {
                const tone = h.unrealized_pnl_cad >= 0 ? 'text-success' : 'text-negative'
                return (
                  <div
                    key={h.ticker}
                    className="grid grid-cols-[minmax(0,1fr)_auto_40px] items-center gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-surface-hover sm:grid-cols-[minmax(0,1fr)_88px_128px_104px_40px]"
                  >
                    <Link to={`/stock/${encodeURIComponent(h.ticker)}`} className="flex min-w-0 items-center gap-3">
                      <TickerAvatar ticker={h.ticker} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-foreground">{h.ticker}</span>
                          {h.price_stale && (
                            <span title="Live price unavailable — showing your last fill price">
                              <AlertTriangle className="h-3.5 w-3.5 text-warning" />
                            </span>
                          )}
                        </div>
                        <p className="truncate text-[12px] text-foreground-subtle">
                          {fmtShares(h.shares)} {h.shares === 1 ? 'share' : 'shares'}
                        </p>
                      </div>
                    </Link>
                    <div className="hidden text-right sm:block">
                      <ChangeIndicator value={h.day_change_pct} className="justify-end" />
                      <div className="text-[11px] tabular-nums text-foreground-subtle">
                        {fmtCurrency(h.day_change_cad, 'CAD', { signed: true })}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold tabular-nums text-foreground">{fmtCurrency(h.market_value_cad)}</div>
                      <div className={cn('text-[11px] tabular-nums sm:hidden', tone)}>
                        {h.unrealized_pnl_pct >= 0 ? '+' : ''}
                        {h.unrealized_pnl_pct.toFixed(2)}%
                      </div>
                      <div className="hidden text-[11px] tabular-nums text-foreground-subtle sm:block">
                        avg {fmtCurrency(h.avg_cost, h.currency)}
                      </div>
                    </div>
                    <div className={cn('hidden text-right tabular-nums sm:block', tone)}>
                      <div className="font-semibold">{fmtCurrency(h.unrealized_pnl_cad, 'CAD', { signed: true })}</div>
                      <div className="text-[11px]">
                        {h.unrealized_pnl_pct >= 0 ? '+' : ''}
                        {h.unrealized_pnl_pct.toFixed(2)}%
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Trade ${h.ticker}`}
                      title={`Buy or sell ${h.ticker}`}
                      onClick={() => onTrade({ ticker: h.ticker, side: 'buy' })}
                    >
                      <ArrowLeftRight />
                    </Button>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

function Allocation({ portfolio: p }: { portfolio: PaperPortfolio }) {
  const cashPct = p.total_value_cad > 0 ? (p.cash_cad / p.total_value_cad) * 100 : 100
  const slices = [
    ...p.holdings.map((h) => ({ key: h.ticker, label: h.ticker, pct: h.weight_pct, color: tickerColor(h.ticker) })),
    { key: '__cash', label: 'Cash', pct: cashPct, color: 'var(--border-strong)' },
  ]
  const biggest = p.holdings[0]
  return (
    <Card>
      <CardHeader>
        <CardTitle>Allocation</CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="flex h-3 gap-0.5 overflow-hidden rounded-full">
          {slices
            .filter((s) => s.pct > 0.2)
            .map((s) => (
              <div key={s.key} className="bar-grow h-full" style={{ width: `${s.pct}%`, background: s.color }} title={`${s.label} ${s.pct.toFixed(1)}%`} />
            ))}
        </div>
        <ul className="mt-4 flex flex-col gap-2 text-sm">
          {slices.map((s) => (
            <li key={s.key} className="flex items-center gap-2.5">
              <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: s.color }} />
              <span className="flex-1 text-foreground">{s.label}</span>
              <span className="tabular-nums text-foreground-muted">{s.pct.toFixed(1)}%</span>
            </li>
          ))}
        </ul>
        {biggest && biggest.weight_pct > 30 && (
          <p className="mt-4 rounded-md bg-warning-bg px-3 py-2.5 text-[13px] leading-relaxed text-warning">
            {biggest.ticker} is {biggest.weight_pct.toFixed(0)}% of your account. In a real TFSA, a single stock that
            large means one bad quarter can sink the whole portfolio.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

function HowItWorks() {
  const notes = [
    'Orders fill instantly at the latest price from Yahoo Finance, which can lag the market by a minute or so.',
    'US stocks are bought in USD at the live exchange rate, so your CAD return includes currency moves — like a real TFSA.',
    "Dividends aren't credited yet, so dividend payers' returns are slightly understated.",
    'Your account is saved in this browser only — clearing site data resets it.',
  ]
  return (
    <Card>
      <CardHeader>
        <CardTitle>Good to know</CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <ul className="flex flex-col gap-3">
          {notes.map((n) => (
            <li key={n} className="flex items-start gap-2.5 text-[13px] leading-relaxed text-foreground-muted">
              <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-foreground-subtle" />
              <span>{n}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

const ACTIVITY_PREVIEW = 8

function Activity({ transactions }: { transactions: PaperTransaction[] }) {
  const [showAll, setShowAll] = useState(false)
  const newestFirst = [...transactions].sort((a, b) => b.executed_at.localeCompare(a.executed_at))
  const shown = showAll ? newestFirst : newestFirst.slice(0, ACTIVITY_PREVIEW)
  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity</CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3 pt-3">
        <ul className="flex flex-col">
          {shown.map((t) => (
            <ActivityRow key={t.id} txn={t} />
          ))}
        </ul>
        {newestFirst.length > ACTIVITY_PREVIEW && (
          <button
            onClick={() => setShowAll((v) => !v)}
            className="mx-auto mt-2 flex items-center gap-1 rounded-full px-3 py-1.5 text-[13px] font-semibold text-foreground-muted hover:bg-surface-hover hover:text-foreground"
          >
            {showAll ? 'Show less' : `Show all ${newestFirst.length}`}
            <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', showAll && 'rotate-180')} />
          </button>
        )}
      </CardContent>
    </Card>
  )
}

function ActivityRow({ txn: t }: { txn: PaperTransaction }) {
  let icon: ReactNode
  let title: string
  let detail: string
  let cashFlow: number
  if (t.kind === 'deposit') {
    icon = <Plus className="h-4 w-4 text-foreground" />
    title = 'Added practice cash'
    detail = fmtDate(t.executed_at, { withTime: true, withYear: true })
    cashFlow = t.amount_cad
  } else {
    const bought = t.kind === 'buy'
    icon = bought ? <ArrowDownRight className="h-4 w-4 text-success" /> : <ArrowUpRight className="h-4 w-4 text-negative" />
    title = `${bought ? 'Bought' : 'Sold'} ${fmtShares(t.shares)} ${t.ticker}`
    detail = `${fmtDate(t.executed_at, { withTime: true, withYear: true })} · at ${fmtCurrency(t.price, t.currency)}`
    cashFlow = bought ? -t.amount_cad : t.amount_cad
  }
  return (
    <li className="flex items-center gap-3 rounded-lg px-3 py-2.5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-hover">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-foreground">{title}</div>
        <div className="truncate text-[12px] text-foreground-subtle">{detail}</div>
      </div>
      <span className="text-sm font-semibold tabular-nums text-foreground">
        {fmtCurrency(cashFlow, 'CAD', { signed: true })}
      </span>
    </li>
  )
}

function AddFundsForm({ onDone }: { onDone: () => void }) {
  const { deposit } = usePractice()
  const [value, setValue] = useState('')
  const amount = Number(value)
  const valid = value !== '' && Number.isFinite(amount) && amount >= 1 && amount <= 10_000_000
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (!valid) return
        deposit(amount)
        onDone()
      }}
      className="flex flex-col gap-3"
    >
      <div className="relative">
        <span className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-xl font-semibold text-foreground-subtle">$</span>
        <Input
          autoFocus
          data-autofocus
          type="number"
          inputMode="decimal"
          min={1}
          step="any"
          placeholder="0.00"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="h-12 pl-10 text-xl font-semibold tabular-nums"
          aria-label="Amount to add"
        />
      </div>
      <div className="flex gap-1.5">
        {[500, 1000, 7000].map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setValue(String(v))}
            className="rounded-full border border-border px-3 py-1 text-[12px] font-semibold text-foreground-muted transition-colors hover:border-border-strong hover:text-foreground"
          >
            {fmtCurrency(v, 'CAD', { digits: 0 })}
          </button>
        ))}
      </div>
      <Button type="submit" className="mt-2" disabled={!valid}>
        Add {valid ? fmtCurrency(amount) : 'cash'}
      </Button>
    </form>
  )
}
