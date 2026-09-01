import { useEffect, useState } from 'react'
import { api } from '../api/client'
import type { AllocationSuggestion, TfsaRoomOut } from '../api/types'

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
    <div>
      <div className="page-header">
        <h1>TFSA Planner</h1>
        <p>Estimate your contribution room and get a starting-point ETF/individual-stock split.</p>
      </div>

      <div className="card">
        <div className="section-title">Your details</div>
        <div className="metric-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
          <div className="field">
            <label>Birth year</label>
            <input type="number" value={birthYear} onChange={(e) => setBirthYear(Number(e.target.value))} />
          </div>
          <div className="field">
            <label>Year you became a Canadian resident</label>
            <input
              type="number"
              value={residentYear}
              onChange={(e) => setResidentYear(Number(e.target.value))}
            />
          </div>
          <div className="field">
            <label>Total TFSA contributions to date</label>
            <input
              type="number"
              value={contributions}
              onChange={(e) => setContributions(Number(e.target.value))}
            />
          </div>
          <div className="field">
            <label>Withdrawals made this calendar year</label>
            <input
              type="number"
              value={withdrawals}
              onChange={(e) => setWithdrawals(Number(e.target.value))}
            />
          </div>
        </div>
        <button className="btn" onClick={save} disabled={saving}>
          {saving ? 'Calculating…' : 'Calculate room'}
        </button>
      </div>

      {room && (
        <div className="card">
          <div className="section-title">Contribution room ({room.as_of_year})</div>
          <div className="metric-grid">
            <div className="metric-tile">
              <div className="label">Lifetime room</div>
              <div className="value">${room.total_lifetime_room.toLocaleString()}</div>
            </div>
            <div className="metric-tile">
              <div className="label">Contributed to date</div>
              <div className="value">${room.total_contributions_to_date.toLocaleString()}</div>
            </div>
            <div className="metric-tile">
              <div className="label">Available now</div>
              <div className="value">${room.available_room_now.toLocaleString()}</div>
            </div>
          </div>
          {room.withdrawals_added_back_next_year > 0 && (
            <p className="muted">
              Note: withdrawals only restore contribution room starting January 1 of next year — the
              ${room.withdrawals_added_back_next_year.toLocaleString()} you withdrew this year isn't
              available to re-contribute until then.
            </p>
          )}
        </div>
      )}

      {allocation && (
        <div className="card">
          <div className="section-title">Suggested starting allocation</div>
          <div className="allocation-bar">
            <div className="core" style={{ width: `${allocation.core_etf_pct}%` }} />
            <div className="satellite" style={{ width: `${allocation.satellite_stock_pct}%` }} />
          </div>
          <div className="allocation-legend">
            <span><span className="swatch" style={{ background: 'var(--accent)' }} />Broad ETF core ({allocation.core_etf_pct}%)</span>
            <span><span className="swatch" style={{ background: 'var(--positive)' }} />Individual stocks ({allocation.satellite_stock_pct}%)</span>
          </div>
          <ul className="bullet-list" style={{ marginTop: 16 }}>
            {allocation.rationale.map((r, i) => (
              <li key={i} className="bullet neutral">
                <span className="dot" />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
