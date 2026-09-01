import { type ReactNode, useEffect, useState } from 'react'
import { api } from '../api/client'
import type { Experience, RiskBucket, RiskTolerance } from '../api/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const HORIZON_OPTIONS = [
  { value: 2, label: '< 3 years' },
  { value: 6, label: '3–8 years' },
  { value: 12, label: '8+ years' },
]

const TOLERANCE_OPTIONS: { value: RiskTolerance; label: string }[] = [
  { value: 'low', label: "Low — I'd panic-sell a 20% drop" },
  { value: 'medium', label: "Medium — a 20% drop would worry me but I'd hold" },
  { value: 'high', label: "High — I'm comfortable with big swings" },
]

const EXPERIENCE_OPTIONS: { value: Experience; label: string }[] = [
  { value: 'new', label: 'New to investing' },
  { value: 'some', label: 'Some experience' },
  { value: 'experienced', label: 'Experienced' },
]

const BUCKET_DESCRIPTIONS: Record<RiskBucket, string> = {
  conservative:
    'Analysis will favor stability and dividend quality over growth, and the TFSA planner will suggest a larger ETF core.',
  balanced: 'Analysis will weigh trend, value, quality, and income fairly evenly.',
  growth:
    'Analysis will favor trend/momentum more heavily, and the TFSA planner will allow a larger individual-stock satellite.',
}

function OptionPill({
  selected,
  onClick,
  children,
}: {
  selected: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-md border px-3 py-2 text-left text-[13px] font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40',
        selected
          ? 'border-accent bg-accent/10 text-accent'
          : 'border-border text-foreground-muted hover:border-border-strong hover:text-foreground',
      )}
    >
      {children}
    </button>
  )
}

export default function RiskProfilePage() {
  const [horizon, setHorizon] = useState(6)
  const [tolerance, setTolerance] = useState<RiskTolerance>('medium')
  const [experience, setExperience] = useState<Experience>('some')
  const [bucket, setBucket] = useState<RiskBucket | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.getProfile().then((profile) => {
      if (!profile) return
      const years = profile.time_horizon_years
      setHorizon(years < 3 ? 2 : years < 8 ? 6 : 12)
      setTolerance(profile.risk_tolerance)
      setExperience(profile.experience)
      setBucket(profile.risk_bucket)
    })
  }, [])

  async function save() {
    setSaving(true)
    try {
      const result = await api.setProfile({
        time_horizon_years: horizon,
        risk_tolerance: tolerance,
        experience,
      })
      setBucket(result.risk_bucket)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Your Risk Profile</h1>
        <p className="mt-1 max-w-2xl text-sm text-foreground-muted">
          This drives how every stock is scored and what allocation the TFSA planner suggests. It's not
          a formal suitability assessment — just a simple starting point.
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-6 pt-6">
          <div>
            <p className="mb-2.5 text-sm font-medium text-foreground">
              How long until you'd likely need this money?
            </p>
            <div className="flex flex-wrap gap-2">
              {HORIZON_OPTIONS.map((opt) => (
                <OptionPill key={opt.value} selected={horizon === opt.value} onClick={() => setHorizon(opt.value)}>
                  {opt.label}
                </OptionPill>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2.5 text-sm font-medium text-foreground">
              How would you react to a 20% drop in a stock you own?
            </p>
            <div className="flex flex-wrap gap-2">
              {TOLERANCE_OPTIONS.map((opt) => (
                <OptionPill key={opt.value} selected={tolerance === opt.value} onClick={() => setTolerance(opt.value)}>
                  {opt.label}
                </OptionPill>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2.5 text-sm font-medium text-foreground">
              How much investing experience do you have?
            </p>
            <div className="flex flex-wrap gap-2">
              {EXPERIENCE_OPTIONS.map((opt) => (
                <OptionPill key={opt.value} selected={experience === opt.value} onClick={() => setExperience(opt.value)}>
                  {opt.label}
                </OptionPill>
              ))}
            </div>
          </div>

          <div>
            <Button onClick={save} disabled={saving}>
              {saving ? 'Saving…' : 'Save profile'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {bucket && (
        <Card>
          <CardHeader className="flex-row items-center gap-2 space-y-0">
            <CardTitle>Your risk bucket</CardTitle>
            <Badge variant="accent" className="capitalize">
              {bucket}
            </Badge>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm text-foreground-muted">{BUCKET_DESCRIPTIONS[bucket]}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
