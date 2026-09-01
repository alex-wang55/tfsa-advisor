import type { ExplanationBullet } from '../api/types'
import { cn } from '@/lib/utils'

const TONE_STYLES: Record<ExplanationBullet['tone'], string> = {
  positive: 'border-success/40 bg-success-bg',
  caution: 'border-warning/40 bg-warning-bg',
  neutral: 'border-border bg-surface-hover',
}

const DOT_STYLES: Record<ExplanationBullet['tone'], string> = {
  positive: 'bg-success',
  caution: 'bg-warning',
  neutral: 'bg-foreground-subtle',
}

export function ExplanationPanel({ bullets }: { bullets: ExplanationBullet[] }) {
  if (bullets.length === 0) {
    return <p className="text-sm text-foreground-subtle">No notes available for this stock yet.</p>
  }
  return (
    <ul className="flex flex-col gap-2">
      {bullets.map((b, i) => (
        <li
          key={i}
          className={cn('flex items-start gap-2.5 rounded-md border px-3 py-2.5 text-sm leading-relaxed text-foreground', TONE_STYLES[b.tone])}
        >
          <span className={cn('mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full', DOT_STYLES[b.tone])} />
          <span>{b.text}</span>
        </li>
      ))}
    </ul>
  )
}
