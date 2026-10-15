import { type ReactNode, useEffect, useMemo, useState } from 'react'
import type { PaperTransaction } from '../api/types'
import { PracticeContext, STORAGE_KEY, depositTxn, loadLedger, saveLedger } from './store'

export function PracticeProvider({ children }: { children: ReactNode }) {
  const [transactions, setTransactions] = useState<PaperTransaction[]>(loadLedger)

  // Keep other open tabs in sync.
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === STORAGE_KEY) setTransactions(loadLedger())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const value = useMemo(() => {
    function commit(next: PaperTransaction[]) {
      saveLedger(next)
      setTransactions(next)
    }
    return {
      transactions,
      hasAccount: transactions.some((t) => t.kind === 'deposit'),
      open: (startingCash: number) => commit([depositTxn(startingCash)]),
      deposit: (amountCad: number) => commit([...transactions, depositTxn(amountCad)]),
      append: (txn: PaperTransaction) => commit([...transactions, txn]),
    }
  }, [transactions])

  return <PracticeContext.Provider value={value}>{children}</PracticeContext.Provider>
}
