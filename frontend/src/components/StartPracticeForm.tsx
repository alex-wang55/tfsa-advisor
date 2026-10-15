import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { usePractice } from '../practice/store'
import { fmtCurrency } from '../utils/format'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

const PRESETS = [1_000, 10_000, 25_000, 50_000]

/** Picks a pretend starting balance and opens the practice account. Offers
 * the user's own TFSA room (from the planner) when we know it. */
export function StartPracticeForm({ onStarted, submitLabel = 'Start practicing' }: {
  onStarted?: () => void
  submitLabel?: string
}) {
  const { open } = usePractice()
  const [room, setRoom] = useState<number | null>(null)
  const [amount, setAmount] = useState(10_000)
  const [custom, setCustom] = useState('')

  useEffect(() => {
    api
      .getRoom()
      .then((r) => {
        if (r.available_room_now > 0) setRoom(r.available_room_now)
      })
      .catch(() => {})
  }, [])

  const customValue = Number(custom)
  const chosen = custom ? customValue : amount
  const valid = Number.isFinite(chosen) && chosen >= 100 && chosen <= 10_000_000

  const options = [
    ...(room ? [{ value: room, label: fmtCurrency(room, 'CAD', { digits: 0 }), note: 'Your TFSA room' }] : []),
    ...PRESETS.filter((p) => p !== room).map((p) => ({ value: p, label: fmtCurrency(p, 'CAD', { digits: 0 }), note: null })),
  ].slice(0, 4)

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (!valid) return
        open(chosen)
        onStarted?.()
      }}
      className="flex flex-col gap-4"
    >
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {options.map((opt) => {
          const selected = !custom && amount === opt.value
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                setAmount(opt.value)
                setCustom('')
              }}
              aria-pressed={selected}
              className={cn(
                'flex flex-col items-start rounded-md border px-3.5 py-3 text-left transition-colors',
                selected
                  ? 'border-accent bg-accent text-accent-foreground'
                  : 'border-border bg-surface text-foreground hover:border-border-strong',
              )}
            >
              <span className="text-[15px] font-bold tabular-nums">{opt.label}</span>
              <span className={cn('text-[11px] font-medium', selected ? 'opacity-75' : 'text-foreground-subtle')}>
                {opt.note ?? 'Practice cash'}
              </span>
            </button>
          )
        })}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-foreground-subtle">$</span>
          <Input
            type="number"
            inputMode="decimal"
            min={100}
            step="any"
            placeholder="Or enter any amount"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            className="pl-8"
            aria-label="Custom starting amount"
          />
        </div>
        <Button type="submit" disabled={!valid}>
          {submitLabel}
        </Button>
      </div>
      {custom && !valid && (
        <p className="text-[13px] text-warning">Pick an amount between $100 and $10,000,000.</p>
      )}
    </form>
  )
}
