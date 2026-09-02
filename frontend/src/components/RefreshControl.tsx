import { RotateCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { fmtTimeAgo } from '../utils/format'
import { cn } from '@/lib/utils'

interface RefreshControlProps {
  onRefresh: () => void
  refreshing: boolean
  lastUpdated: Date | null
  className?: string
}

export function RefreshControl({ onRefresh, refreshing, lastUpdated, className }: RefreshControlProps) {
  // Re-render periodically so the "Xs ago" label stays live without needing
  // the parent to re-render on its own.
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 5000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className={cn('flex items-center gap-2 text-foreground-subtle', className)}>
      {lastUpdated && <span className="text-[12px]">Updated {fmtTimeAgo(lastUpdated)}</span>}
      <button
        onClick={onRefresh}
        disabled={refreshing}
        aria-label="Refresh"
        className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface text-foreground-muted transition-colors hover:text-foreground disabled:opacity-60"
      >
        <RotateCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
      </button>
    </div>
  )
}
