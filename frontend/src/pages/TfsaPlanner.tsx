import { useEffect, useState } from 'react'
import { api } from '../api/client'
import type { AllocationSuggestion, TfsaRoomOut } from '../api/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function TfsaPlannerPage() {
  const [birthYear, setBirthYear] = useState(2003)
  const [residentYear, setResidentYear] = useState(2003)
  const [contributions, setContributions] = useState(0)
  const [withdrawals, setWithdrawals] = useState(0)
  const [room, setRoom] = useState<TfsaRoomOut | null>(null)
  const [allocation, setAllocation] = useState<AllocationSuggestion | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.getRoom().then(setRoom)
    api.getAllocation().then(setAllocation).catch(() => setAllocation(null))
  }, [])

  async function save() {
    setSaving(true)
    try {
      const result = await api.setAccount({
        birth_year: birthYear,
        year_became_resident: residentYear,
        total_contributions_to_date: contributions,
        total_withdrawals_this_year: withdrawals,
      })
      setRoom(result)
      const alloc = await api.getAllocation()
      setAllocation(alloc)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">TFSA Planner</h1>
        <p className="mt-1 text-sm text-foreground-muted">
          Estimate your contribution room and get a starting-point ETF/individual-stock split.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="birthYear">Birth year</Label>
              <Input
                id="birthYear"
                type="number"
                value={birthYear}
                onChange={(e) => setBirthYear(Number(e.target.value))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="residentYear">Year you became a Canadian resident</Label>
              <Input
                id="residentYear"
                type="number"
                value={residentYear}
                onChange={(e) => setResidentYear(Number(e.target.value))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="contributions">Total TFSA contributions to date</Label>
              <Input
                id="contributions"
                type="number"
                value={contributions}
                onChange={(e) => setContributions(Number(e.target.value))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="withdrawals">Withdrawals made this calendar year</Label>
              <Input
                id="withdrawals"
                type="number"
                value={withdrawals}
                onChange={(e) => setWithdrawals(Number(e.target.value))}
              />
            </div>
          </div>
          <Button className="mt-5" onClick={save} disabled={saving}>
            {saving ? 'Calculating…' : 'Calculate room'}
          </Button>
        </CardContent>
      </Card>

      {room && (
        <Card>
          <CardHeader>
            <CardTitle>Contribution room ({room.as_of_year})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-md border border-border bg-background p-3">
                <div className="text-[11px] font-medium uppercase tracking-wide text-foreground-subtle">
                  Lifetime room
                </div>
                <div className="mt-1 font-mono text-lg font-semibold tabular-nums text-foreground">
                  ${room.total_lifetime_room.toLocaleString()}
                </div>
              </div>
              <div className="rounded-md border border-border bg-background p-3">
                <div className="text-[11px] font-medium uppercase tracking-wide text-foreground-subtle">
                  Contributed to date
                </div>
                <div className="mt-1 font-mono text-lg font-semibold tabular-nums text-foreground">
                  ${room.total_contributions_to_date.toLocaleString()}
                </div>
              </div>
              <div className="rounded-md border border-accent/30 bg-accent/5 p-3">
                <div className="text-[11px] font-medium uppercase tracking-wide text-accent">
                  Available now
                </div>
                <div className="mt-1 font-mono text-lg font-semibold tabular-nums text-foreground">
                  ${room.available_room_now.toLocaleString()}
                </div>
              </div>
            </div>
            {room.withdrawals_added_back_next_year > 0 && (
              <p className="mt-4 text-sm text-foreground-subtle">
                Note: withdrawals only restore contribution room starting January 1 of next year — the
                ${room.withdrawals_added_back_next_year.toLocaleString()} you withdrew this year isn't
                available to re-contribute until then.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {allocation && (
        <Card>
          <CardHeader>
            <CardTitle>Suggested starting allocation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-6 overflow-hidden rounded-md">
              <div
                className="bg-accent"
                style={{ width: `${allocation.core_etf_pct}%` }}
              />
              <div
                className="bg-success"
                style={{ width: `${allocation.satellite_stock_pct}%` }}
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-foreground-muted">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-accent" />
                Broad ETF core ({allocation.core_etf_pct}%)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-success" />
                Individual stocks ({allocation.satellite_stock_pct}%)
              </span>
            </div>
            <ul className="mt-5 flex flex-col gap-2">
              {allocation.rationale.map((r, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2.5 rounded-md border border-border bg-surface-hover px-3 py-2.5 text-sm leading-relaxed text-foreground"
                >
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground-subtle" />
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
