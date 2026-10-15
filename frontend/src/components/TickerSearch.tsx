import { Search } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'

/** Header search: type a ticker and press Enter to open its analysis.
 * Press "/" anywhere to focus it. */
export function TickerSearch({ className }: { className?: string }) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null
      const typing = target?.closest('input, textarea, select, [contenteditable="true"]')
      if (e.key === '/' && !typing && !e.metaKey && !e.ctrlKey) {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault()
        const ticker = query.trim().toUpperCase()
        if (!ticker) return
        navigate(`/stock/${encodeURIComponent(ticker)}`)
        setQuery('')
        inputRef.current?.blur()
      }}
      className={cn('group relative', className)}
    >
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-subtle" />
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Look up a ticker…"
        aria-label="Look up a ticker"
        autoCapitalize="characters"
        autoCorrect="off"
        spellCheck={false}
        className="h-10 w-full rounded-full border border-border bg-surface pl-10 pr-10 text-sm text-foreground placeholder:text-foreground-subtle transition-colors focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/15"
      />
      <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-border px-1.5 text-[11px] font-medium text-foreground-subtle group-focus-within:hidden sm:block">
        /
      </kbd>
    </form>
  )
}
