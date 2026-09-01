import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

function tone(score: number): 'success' | 'default' | 'warning' {
  if (score >= 65) return 'success'
  if (score >= 45) return 'default'
  return 'warning'
}

export function ScoreBadge({ score, className }: { score: number; className?: string }) {
  return (
    <Badge variant={tone(score)} className={cn('font-mono tabular-nums', className)}>
      {Math.round(score)}
    </Badge>
  )
}
