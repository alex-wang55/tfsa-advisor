import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { ScoreBadge } from '../components/ScoreBadge'
import type { ScreenResultItem } from '../api/types'

type ExchangeFilter = 'ALL' | 'TSX' | 'US'

export default function DashboardPage() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [exchange, setExchange] = useState<ExchangeFilter>('ALL')
  const [results, setResults] = useState<ScreenResultItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    api
      .screen(exchange === 'ALL' ? undefined : exchange)
      .then(setResults)
      .catch((e) => setError(e.message ?? 'Failed to load screener results'))
      .finally(() => setLoading(false))
  }, [exchange])

  function goToTicker(ticker: string) {
    navigate(`/stock/${encodeURIComponent(ticker)}`)
  }

  function onSearchSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (query.trim()) goToTicker(query.trim())
  }

  return (
    <div>
      <div className="page-header">
        <h1>Stock Screener</h1>
        <p>
          Ranked from a curated TSX + US universe using your risk profile. Scores are a heuristic
          screening tool, not a prediction of future returns — click any row for the full breakdown.
        </p>
      </div>

      <form className="search-row" onSubmit={onSearchSubmit}>
        <input
          placeholder="Look up any ticker (e.g. AAPL, SHOP.TO)…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button className="btn" type="submit">Analyze</button>
      </form>

      <div className="radio-group" style={{ marginBottom: 16 }}>
        {(['ALL', 'TSX', 'US'] as ExchangeFilter[]).map((opt) => (
          <div
            key={opt}
            className={`radio-option ${exchange === opt ? 'selected' : ''}`}
            onClick={() => setExchange(opt)}
          >
            {opt === 'ALL' ? 'All markets' : opt}
          </div>
        ))}
      </div>

      <div className="card">
        {loading && <p className="center-message">Loading screener results…</p>}
        {error && <p className="center-message">{error}</p>}
        {!loading && !error && (
          <table>
            <thead>
              <tr>
                <th>Ticker</th>
                <th>Name</th>
                <th>Sector</th>
                <th>Market</th>
                <th>Score</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => (
                <tr key={r.ticker} className="clickable" onClick={() => goToTicker(r.ticker)}>
                  <td><strong>{r.ticker}</strong></td>
                  <td className="muted">{r.name ?? '—'}</td>
                  <td className="muted">{r.sector ?? '—'}</td>
                  <td><span className="pill">{r.exchange}</span></td>
                  <td><ScoreBadge score={r.score} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
