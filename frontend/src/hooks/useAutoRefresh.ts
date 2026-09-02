import { useEffect, useRef } from 'react'

/** Calls `callback` every `intervalMs`. Pauses while the tab is hidden so we
 * don't burn API calls (and yfinance requests) on a backgrounded tab. */
export function useAutoRefresh(callback: () => void, intervalMs: number) {
  const callbackRef = useRef(callback)
  callbackRef.current = callback

  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') callbackRef.current()
    }, intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
}
