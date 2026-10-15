import type {
  AllocationSuggestion,
  PaperHistoryPoint,
  PaperOrder,
  PaperPortfolio,
  PaperQuote,
  PaperTransaction,
  RiskProfileIn,
  RiskProfileOut,
  ScreenResultItem,
  StockAnalysis,
  TfsaAccountIn,
  TfsaRoomOut,
  WatchlistItemIn,
  WatchlistItemOut,
} from './types'

// Set VITE_API_URL when deploying (e.g. on Vercel). Falls back to the local API.
const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000'

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new ApiError(res.status, body.detail ?? res.statusText)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export const api = {
  getStock: (ticker: string, opts?: { refresh?: boolean }) =>
    request<StockAnalysis>(
      `/api/stocks/${encodeURIComponent(ticker)}${opts?.refresh ? '?refresh=true' : ''}`,
    ),
  screen: (exchange?: 'TSX' | 'US', opts?: { refresh?: boolean }) => {
    const params = new URLSearchParams()
    if (exchange) params.set('exchange', exchange)
    if (opts?.refresh) params.set('refresh', 'true')
    const qs = params.toString()
    return request<ScreenResultItem[]>(`/api/screen${qs ? `?${qs}` : ''}`)
  },

  getProfile: () => request<RiskProfileOut | null>('/api/profile'),
  setProfile: (payload: RiskProfileIn) =>
    request<RiskProfileOut>('/api/profile', { method: 'PUT', body: JSON.stringify(payload) }),

  getRoom: () => request<TfsaRoomOut>('/api/tfsa/room'),
  setAccount: (payload: TfsaAccountIn) =>
    request<TfsaRoomOut>('/api/tfsa/account', { method: 'PUT', body: JSON.stringify(payload) }),
  getAllocation: () => request<AllocationSuggestion>('/api/tfsa/allocation'),

  getWatchlist: () => request<WatchlistItemOut[]>('/api/watchlist'),
  addWatchlistItem: (payload: WatchlistItemIn) =>
    request<WatchlistItemOut>('/api/watchlist', { method: 'POST', body: JSON.stringify(payload) }),
  removeWatchlistItem: (id: number) => request<void>(`/api/watchlist/${id}`, { method: 'DELETE' }),

  // Practice trading endpoints are stateless: each call carries the ledger.
  paperPortfolio: (transactions: PaperTransaction[]) =>
    request<PaperPortfolio | null>('/api/paper/portfolio', post({ transactions })),
  paperHistory: (transactions: PaperTransaction[]) =>
    request<PaperHistoryPoint[]>('/api/paper/history', post({ transactions })),
  paperQuote: (transactions: PaperTransaction[], ticker: string) =>
    request<PaperQuote>('/api/paper/quote', post({ transactions, ticker })),
  paperOrder: (transactions: PaperTransaction[], order: PaperOrder) =>
    request<PaperTransaction>('/api/paper/orders', post({ transactions, order })),
}

function post(body: unknown): RequestInit {
  return { method: 'POST', body: JSON.stringify(body) }
}
