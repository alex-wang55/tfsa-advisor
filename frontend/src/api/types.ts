export interface SubScores {
  trend: number
  value: number
  quality: number
  income: number
}

export interface ExplanationBullet {
  text: string
  tone: 'positive' | 'neutral' | 'caution'
}

export interface HistoryPoint {
  date: string
  open: number
  high: number
  low: number
  close: number
}

export interface StockMetrics {
  ticker: string
  exchange: 'TSX' | 'US'
  name: string | null
  sector: string | null
  currency: string | null
  price: number | null
  price_change: number | null
  price_change_pct: number | null
  sma50: number | null
  sma200: number | null
  rsi14: number | null
  momentum_3m: number | null
  momentum_12m: number | null
  volatility_annualized: number | null
  pe_trailing: number | null
  pe_forward: number | null
  dividend_yield: number | null
  payout_ratio: number | null
  debt_to_equity: number | null
  market_cap: number | null
  beta: number | null
  history: HistoryPoint[]
}

export interface StockAnalysis {
  metrics: StockMetrics
  score: number
  sub_scores: SubScores
  explanations: ExplanationBullet[]
  tfsa_notes: ExplanationBullet[]
}

export interface ScreenResultItem {
  ticker: string
  name: string | null
  exchange: string
  sector: string | null
  score: number
  sub_scores: SubScores
  price_change_pct: number | null
}

export type RiskTolerance = 'low' | 'medium' | 'high'
export type Experience = 'new' | 'some' | 'experienced'
export type RiskBucket = 'conservative' | 'balanced' | 'growth'

export interface RiskProfileIn {
  time_horizon_years: number
  risk_tolerance: RiskTolerance
  experience: Experience
}

export interface RiskProfileOut extends RiskProfileIn {
  risk_bucket: RiskBucket
}

export interface TfsaAccountIn {
  birth_year: number
  year_became_resident: number
  total_contributions_to_date: number
  total_withdrawals_this_year: number
}

export interface TfsaRoomOut {
  total_lifetime_room: number
  total_contributions_to_date: number
  withdrawals_added_back_next_year: number
  available_room_now: number
  as_of_year: number
}

export interface AllocationSuggestion {
  core_etf_pct: number
  satellite_stock_pct: number
  rationale: string[]
}

export interface WatchlistItemIn {
  ticker: string
  notes: string
}

export interface WatchlistItemOut extends WatchlistItemIn {
  id: number
  added_on: string
}
