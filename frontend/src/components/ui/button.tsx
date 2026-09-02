import { Slot } from '@radix-ui/react-slot'
import { type VariantProps, cva } from 'class-variance-authority'
import * as React from 'react'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
  {
    variants: {
      variant: {
        default: 'bg-accent text-accent-foreground hover:bg-accent-hover active:bg-accent-hover',
        outline:
          'border border-border-strong bg-transparent text-foreground hover:bg-surface-hover active:bg-surface-hover',
        ghost: 'text-foreground-muted hover:bg-surface-hover hover:text-foreground',
        destructive: 'border border-warning/40 text-warning bg-transparent hover:bg-warning-bg',
      },
      size: {
        default: 'h-10 px-5',
        sm: 'h-8 px-4 text-[13px]',
        icon: 'h-9 w-9 rounded-full',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : 'button'
  return <Comp className={cn(buttonVariants({ variant, size, className }))} {...props} />
}

export { Button, buttonVariants }
