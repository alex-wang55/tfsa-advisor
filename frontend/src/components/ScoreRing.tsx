import { scoreTone } from '../utils/score'
import { cn } from '@/lib/utils'

const TONE_COLOR = {
  success: 'var(--success)',
  neutral: 'var(--foreground)',
  warning: 'var(--warning)',
}

const TONE_LABEL = {
  success: 'Strong fit',
  neutral: 'Mixed',
  warning: 'Weak fit',
}

/** Circular 0–100 gauge for the overall score. */
export function ScoreRing({ score, size = 76, className }: { score: number; size?: number; className?: string }) {
  const stroke = Math.max(5, size * 0.085)
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const clamped = Math.max(0, Math.min(100, score))
  const tone = scoreTone(clamped)

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" aria-hidden>
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--surface-hover)" strokeWidth={stroke} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={TONE_COLOR[tone]}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - clamped / 100)}
            className="score-ring-arc"
          />
        </svg>
        <span
          className="absolute inset-0 flex items-center justify-center font-bold tabular-nums text-foreground"
          style={{ fontSize: size * 0.3 }}
        >
          {Math.round(clamped)}
        </span>
      </div>
      <div className="leading-tight">
        <div className="text-[11px] font-medium uppercase tracking-wide text-foreground-subtle">Teacher score</div>
        <div className="text-sm font-semibold" style={{ color: TONE_COLOR[tone] }}>
          {TONE_LABEL[tone]}
        </div>
      </div>
    </div>
  )
}
