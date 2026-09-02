import { TrendingDown, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ChangeIndicatorProps {
  value: number | null | undefined
  /** Optional dollar amount to show alongside the percent (e.g. "+2.58"). */
  amount?: number | null
  size?: 'sm' | 'md'
  className?: string
}

export function ChangeIndicator({ value, amount, size = 'sm', className }: ChangeIndicatorProps) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return <span className={cn('text-foreground-subtle', className)}>—</span>
  }
  const isUp = value >= 0
  const Icon = isUp ? TrendingUp : TrendingDown
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-semibold tabular-nums',
        isUp ? 'text-success' : 'text-negative',
        size === 'md' ? 'text-base' : 'text-[13px]',
        className,
      )}
    >
      <Icon className={size === 'md' ? 'h-4 w-4' : 'h-3.5 w-3.5'} />
      {amount !== undefined && amount !== null && (
        <span>
          {amount >= 0 ? '+' : ''}
          {amount.toFixed(2)}
        </span>
      )}
      <span>
        {value >= 0 ? '+' : ''}
        {value.toFixed(2)}%
      </span>
    </span>
  )
}
