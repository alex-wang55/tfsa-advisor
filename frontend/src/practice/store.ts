import { createContext, useContext } from 'react'
import type { PaperTransaction } from '../api/types'

/** The practice ledger lives in this browser's localStorage: it survives
 * API restarts (e.g. serverless cold starts) and every visitor gets their own
 * account. The API only prices and values it. */
export const STORAGE_KEY = 'tfsa-teacher.practice-ledger.v1'

export interface PracticeContextValue {
  transactions: PaperTransaction[]
  hasAccount: boolean
  /** Start (or restart) the account with a fresh deposit, discarding any history. */
  open: (startingCash: number) => void
  deposit: (amountCad: number) => void
  append: (txn: PaperTransaction) => void
}

export const PracticeContext = createContext<PracticeContextValue | null>(null)

export function usePractice(): PracticeContextValue {
  const ctx = useContext(PracticeContext)
  if (!ctx) throw new Error('usePractice must be used inside <PracticeProvider>')
  return ctx
}

export function loadLedger(): PaperTransaction[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? (parsed as PaperTransaction[]) : []
  } catch {
    return []
  }
}

export function saveLedger(transactions: PaperTransaction[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions))
  } catch {
    // Storage can be unavailable (private mode, quota); the session still works in memory.
  }
}

export function depositTxn(amountCad: number): PaperTransaction {
  return {
    id: crypto.randomUUID(),
    kind: 'deposit',
    ticker: null,
    name: null,
    exchange: null,
    currency: 'CAD',
    shares: 0,
    price: 0,
    fx_rate: 1,
    amount_cad: Math.round(amountCad * 100) / 100,
    executed_at: new Date().toISOString(),
  }
}
