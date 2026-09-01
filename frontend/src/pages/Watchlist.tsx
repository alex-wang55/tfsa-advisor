import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { ScoreBadge } from '../components/ScoreBadge'
import type { ScreenResultItem, WatchlistItemOut } from '../api/types'

export default function WatchlistPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState<WatchlistItemOut[]>([])
  const [snapshots, setSnapshots] = useState<Record<string, ScreenResultItem | 'error'>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    refresh()
  }, [])

  async function refresh() {
    setLoading(true)
    const list = await api.getWatchlist()
    setItems(list)
    setLoading(false)
    for (const item of list) {
      api
        .getStock(item.ticker)
        .then((a) =>
          setSnapshots((prev) => ({
            ...prev,
            [item.ticker]: {
              ticker: a.metrics.ticker,
              name: a.metrics.name,
              exchange: a.metrics.exchange,
              sector: a.metrics.sector,
              score: a.score,
              sub_scores: a.sub_scores,
            },
          })),
        )
        .catch(() => setSnapshots((prev) => ({ ...prev, [item.ticker]: 'error' })))
    }
  }

  async function remove(id: number) {
    await api.removeWatchlistItem(id)
    refresh()
  }

  return (
    <div>
      <div className="page-header">
        <h1>Watchlist</h1>
        <p>Tickers you're tracking, with a live score snapshot each time you visit.</p>
      </div>

      <div className="card">
        {loading && <p className="center-message">Loading…</p>}
        {!loading && items.length === 0 && (
          <p className="center-message">
            Nothing here yet — analyze a stock and click "+ Watchlist" to add it.
          </p>
        )}
        {!loading && items.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>Ticker</th>
                <th>Name</th>
                <th>Score</th>
                <th>Added</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const snap = snapshots[item.ticker]
                return (
                  <tr key={item.id}>
                    <td className="clickable" onClick={() => navigate(`/stock/${item.ticker}`)}>
                      <strong>{item.ticker}</strong>
                    </td>
                    <td className="muted">{snap && snap !== 'error' ? snap.name : '—'}</td>
                    <td>
                      {snap === 'error' && <span className="muted">unavailable</span>}
                      {snap && snap !== 'error' && <ScoreBadge score={snap.score} />}
                      {!snap && <span className="muted">loading…</span>}
                    </td>
                    <td className="muted">{item.added_on}</td>
                    <td>
                      <button className="btn danger" onClick={() => remove(item.id)}>Remove</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
