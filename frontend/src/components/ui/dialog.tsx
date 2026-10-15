import { X } from 'lucide-react'
import { type ReactNode, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

interface DialogProps {
  open: boolean
  onClose: () => void
  title: ReactNode
  description?: ReactNode
  children: ReactNode
  className?: string
}

/** Modal built on the native <dialog> element, which gives us focus
 * trapping, Esc-to-close and a top-layer backdrop for free. */
function Dialog({ open, onClose, title, description, children, className }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (open && !el.open) {
      el.showModal()
      // showModal() focuses the first focusable element (the close button);
      // move focus to the field the content marked as primary instead.
      el.querySelector<HTMLElement>('[data-autofocus]')?.focus()
    }
    if (!open && el.open) el.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        // The panel fills the dialog box, so a click that lands on the dialog itself is the backdrop.
        if (e.target === e.currentTarget) onClose()
      }}
      className={cn(
        'dialog-panel m-auto w-[calc(100%-2rem)] max-w-md overflow-visible rounded-lg border border-border bg-surface p-0 text-foreground card-shadow',
        'backdrop:bg-black/45 backdrop:backdrop-blur-[2px]',
        className,
      )}
    >
      {open && (
        <div className="p-6">
          <div className="mb-5 flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
              {description && <p className="mt-1 text-sm text-foreground-muted">{description}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="-mr-2 -mt-1 rounded-full p-2 text-foreground-subtle transition-colors hover:bg-surface-hover hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  )
}

export { Dialog }
