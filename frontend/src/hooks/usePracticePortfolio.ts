import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../api/client'
import type { PaperHistoryPoint, PaperPortfolio } from '../api/types'
import { usePractice } from '../practice/store'
import { useAutoRefresh } from './useAutoRefresh'

/** Values the browser's practice ledger through the API, re-pricing it on an
 * interval and whenever the ledger changes. */
export function usePracticePortfolio({ withHistory = false, autoRefreshMs = 60_000 } = {}) {
  const { transactions, hasAccount } = usePractice()
  const [portfolio, setPortfolio] = useState<PaperPortfolio | null>(null)
  const [history, setHistory] = useState<PaperHistoryPoint[]>([])
  const [loading, setLoading] = useState(hasAccount)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  // Ignore responses that arrive after a newer request (e.g. right after a trade).
  const requestId = useRef(0)

  const load = useCallback(
    async (opts: { background?: boolean } = {}) => {
      const id = ++requestId.current
      if (!hasAccount) {
        setPortfolio(null)
        setHistory([])
        setLoading(false)
        return
      }
      if (opts.background) setRefreshing(true)
      try {
        const [p, h] = await Promise.all([
          api.paperPortfolio(transactions),
          withHistory ? api.paperHistory(transactions) : Promise.resolve(null),
        ])
        if (id !== requestId.current) return
        setPortfolio(p)
        if (h) setHistory(h)
        setError(null)
        setLastUpdated(new Date())
      } catch (e) {
        if (id === requestId.current) setError(e instanceof Error ? e.message : 'Could not load your practice portfolio')
      } finally {
        if (id === requestId.current) {
          setLoading(false)
          setRefreshing(false)
        }
      }
    },
    [transactions, hasAccount, withHistory],
  )

  useEffect(() => {
    load()
  }, [load])

  useAutoRefresh(() => load({ background: true }), autoRefreshMs)

  return { portfolio, history, loading, refreshing, error, lastUpdated, refresh: () => load({ background: true }) }
}
