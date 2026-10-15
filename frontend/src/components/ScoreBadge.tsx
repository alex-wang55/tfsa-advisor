import { scoreTone } from '../utils/score'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const VARIANT = { success: 'success', neutral: 'default', warning: 'warning' } as const

export function ScoreBadge({ score, className }: { score: number; className?: string }) {
  return (
    <Badge variant={VARIANT[scoreTone(score)]} className={cn('tabular-nums px-2.5 py-1 text-[13px]', className)}>
      {Math.round(score)}
    </Badge>
  )
}
