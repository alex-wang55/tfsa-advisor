import * as React from 'react'
import { cn } from '@/lib/utils'

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      className={cn(
        'flex h-11 w-full rounded-full border border-border bg-surface px-4 text-sm text-foreground placeholder:text-foreground-subtle transition-colors',
        'focus-visible:outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/15',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  )
}

export { Input }
