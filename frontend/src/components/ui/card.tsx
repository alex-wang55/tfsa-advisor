import * as React from 'react'
import { cn } from '@/lib/utils'

function Card({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn('card-shadow rounded-lg border border-border bg-surface', className)}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('flex flex-col gap-1 px-6 pt-6', className)} {...props} />
}

function CardTitle({ className, ...props }: React.ComponentProps<'h3'>) {
  return <h3 className={cn('text-[15px] font-semibold tracking-tight text-foreground', className)} {...props} />
}

function CardDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return <p className={cn('text-sm text-foreground-muted', className)} {...props} />
}

function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('px-6 py-6', className)} {...props} />
}

function CardFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('flex items-center px-6 pb-6', className)} {...props} />
}

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter }
