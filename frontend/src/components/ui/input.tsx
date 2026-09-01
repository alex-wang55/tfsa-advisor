import * as React from 'react'
import { cn } from '@/lib/utils'

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      className={cn(
        'flex h-9 w-full rounded-md border border-border bg-surface px-3 text-sm text-foreground placeholder:text-foreground-subtle transition-colors',
        'focus-visible:outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/20',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  )
}

export { Input }
