import type {
  AllocationSuggestion,
  RiskProfileIn,
  RiskProfileOut,
  ScreenResultItem,
  StockAnalysis,
  TfsaAccountIn,
  TfsaRoomOut,
  WatchlistItemIn,
  WatchlistItemOut,
} from './types'

const BASE_URL = 'http://127.0.0.1:8000'

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
  getStock: (ticker: string) => request<StockAnalysis>(`/api/stocks/${encodeURIComponent(ticker)}`),
  screen: (exchange?: 'TSX' | 'US') =>
    request<ScreenResultItem[]>(`/api/screen${exchange ? `?exchange=${exchange}` : ''}`),

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
}
