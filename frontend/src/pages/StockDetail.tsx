import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api, ApiError } from '../api/client'
import { ScoreBadge } from '../components/ScoreBadge'
import { ExplanationPanel } from '../components/ExplanationPanel'
import { PriceChart } from '../components/PriceChart'
import type { StockAnalysis } from '../api/types'
import { fmtMarketCap, fmtMoney, fmtNum, fmtPct } from '../utils/format'

export default function StockDetailPage() {
  const { ticker } = useParams<{ ticker: string }>()
  const [analysis, setAnalysis] = useState<StockAnalysis | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [addState, setAddState] = useState<'idle' | 'adding' | 'added' | 'error'>('idle')

  useEffect(() => {
    if (!ticker) return
    setLoading(true)
    setError(null)
    setAnalysis(null)
    setAddState('idle')
    api
      .getStock(ticker)
      .then(setAnalysis)
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Failed to load this ticker'))
      .finally(() => setLoading(false))
  }, [ticker])

  async function addToWatchlist() {
    if (!analysis) return
    setAddState('adding')
    try {
      await api.addWatchlistItem({ ticker: analysis.metrics.ticker, notes: '' })
      setAddState('added')
    } catch {
      setAddState('error')
    }
  }

  if (loading) return <p className="center-message">Loading {ticker}…</p>
  if (error) return <p className="center-message">{error}</p>
  if (!analysis) return null

  const m = analysis.metrics

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>{m.ticker} {m.name && <span className="muted" style={{ fontWeight: 400 }}>— {m.name}</span>}</h1>
          <p>
            <span className="pill">{m.exchange}</span>{' '}
            {m.sector && <span className="pill">{m.sector}</span>}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <ScoreBadge score={analysis.score} />
          <button className="btn secondary" onClick={addToWatchlist} disabled={addState === 'adding' || addState === 'added'}>
            {addState === 'added' ? 'Added ✓' : addState === 'adding' ? 'Adding…' : '+ Watchlist'}
          </button>
        </div>
      </div>

      <div className="card">
        <PriceChart history={m.history} currency={m.currency} />
        <div className="metric-grid">
          <div className="metric-tile">
            <div className="label">Price</div>
            <div className="value">{fmtMoney(m.price, m.currency)}</div>
          </div>
          <div className="metric-tile">
            <div className="label">12m momentum</div>
            <div className="value">{fmtPct(m.momentum_12m)}</div>
          </div>
          <div className="metric-tile">
            <div className="label">RSI (14)</div>
            <div className="value">{fmtNum(m.rsi14, 0)}</div>
          </div>
          <div className="metric-tile">
            <div className="label">Volatility (ann.)</div>
            <div className="value">{fmtNum(m.volatility_annualized, 0)}%</div>
          </div>
          <div className="metric-tile">
            <div className="label">P/E (trailing)</div>
            <div className="value">{fmtNum(m.pe_trailing, 1)}</div>
          </div>
          <div className="metric-tile">
            <div className="label">Dividend yield</div>
            <div className="value">{fmtNum(m.dividend_yield, 2)}%</div>
          </div>
          <div className="metric-tile">
            <div className="label">Beta</div>
            <div className="value">{fmtNum(m.beta, 2)}</div>
          </div>
          <div className="metric-tile">
            <div className="label">Market cap</div>
            <div className="value">{fmtMarketCap(m.market_cap)}</div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="section-title">Score breakdown</div>
        <div className="sub-score-row">
          <div className="item"><div className="label">Trend</div><div className="value">{analysis.sub_scores.trend}</div></div>
          <div className="item"><div className="label">Value</div><div className="value">{analysis.sub_scores.value}</div></div>
          <div className="item"><div className="label">Quality</div><div className="value">{analysis.sub_scores.quality}</div></div>
          <div className="item"><div className="label">Income</div><div className="value">{analysis.sub_scores.income}</div></div>
        </div>
      </div>

      <div className="card">
        <div className="section-title">What the teacher sees</div>
        <ExplanationPanel bullets={analysis.explanations} />
      </div>

      <div className="card">
        <div className="section-title">TFSA-specific notes</div>
        <ExplanationPanel bullets={analysis.tfsa_notes} />
      </div>
    </div>
  )
}
