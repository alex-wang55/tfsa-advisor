import { cn } from '@/lib/utils'

interface SegmentedControlProps<T extends string> {
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
  className?: string
}

function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="tablist"
      className={cn(
        'card-shadow inline-flex items-center gap-0.5 rounded-full border border-border bg-surface p-1',
        className,
      )}
    >
      {options.map((opt) => {
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              'rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30',
              active
                ? 'bg-accent text-accent-foreground'
                : 'text-foreground-muted hover:bg-surface-hover hover:text-foreground',
            )}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

export { SegmentedControl }
