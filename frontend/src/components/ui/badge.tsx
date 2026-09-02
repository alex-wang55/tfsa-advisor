import { type VariantProps, cva } from 'class-variance-authority'
import * as React from 'react'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-surface-hover text-foreground-muted',
        accent: 'border-transparent bg-accent/10 text-accent',
        success: 'border-transparent bg-success-bg text-success',
        warning: 'border-transparent bg-warning-bg text-warning',
        outline: 'border-border-strong text-foreground-muted',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

interface BadgeProps extends React.ComponentProps<'span'>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, className }))} {...props} />
}

export { Badge, badgeVariants }
