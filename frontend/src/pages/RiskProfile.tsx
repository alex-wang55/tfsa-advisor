import { useEffect, useState } from 'react'
import { api } from '../api/client'
import type { Experience, RiskBucket, RiskTolerance } from '../api/types'

const HORIZON_OPTIONS = [
  { value: 2, label: '< 3 years' },
  { value: 6, label: '3–8 years' },
  { value: 12, label: '8+ years' },
]

const TOLERANCE_OPTIONS: { value: RiskTolerance; label: string }[] = [
  { value: 'low', label: 'Low — I\'d panic-sell a 20% drop' },
  { value: 'medium', label: 'Medium — a 20% drop would worry me but I\'d hold' },
  { value: 'high', label: 'High — I\'m comfortable with big swings' },
]

const EXPERIENCE_OPTIONS: { value: Experience; label: string }[] = [
  { value: 'new', label: 'New to investing' },
  { value: 'some', label: 'Some experience' },
  { value: 'experienced', label: 'Experienced' },
]

const BUCKET_DESCRIPTIONS: Record<RiskBucket, string> = {
  conservative: 'Analysis will favor stability and dividend quality over growth, and the TFSA planner will suggest a larger ETF core.',
  balanced: 'Analysis will weigh trend, value, quality, and income fairly evenly.',
  growth: 'Analysis will favor trend/momentum more heavily, and the TFSA planner will allow a larger individual-stock satellite.',
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
      // Map the stored value back onto one of the three horizon buckets
      // (server stores a raw year count, which may not exactly match a
      // preset option's representative value).
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
    <div>
      <div className="page-header">
        <h1>Your Risk Profile</h1>
        <p>
          This drives how every stock is scored and what allocation the TFSA planner suggests. It's
          not a formal suitability assessment — just a simple starting point.
        </p>
      </div>

      <div className="card">
        <div className="section-title">How long until you'd likely need this money?</div>
        <div className="radio-group">
          {HORIZON_OPTIONS.map((opt) => (
            <div
              key={opt.value}
              className={`radio-option ${horizon === opt.value ? 'selected' : ''}`}
              onClick={() => setHorizon(opt.value)}
            >
              {opt.label}
            </div>
          ))}
        </div>

        <div className="section-title">How would you react to a 20% drop in a stock you own?</div>
        <div className="radio-group">
          {TOLERANCE_OPTIONS.map((opt) => (
            <div
              key={opt.value}
              className={`radio-option ${tolerance === opt.value ? 'selected' : ''}`}
              onClick={() => setTolerance(opt.value)}
            >
              {opt.label}
            </div>
          ))}
        </div>

        <div className="section-title">How much investing experience do you have?</div>
        <div className="radio-group">
          {EXPERIENCE_OPTIONS.map((opt) => (
            <div
              key={opt.value}
              className={`radio-option ${experience === opt.value ? 'selected' : ''}`}
              onClick={() => setExperience(opt.value)}
            >
              {opt.label}
            </div>
          ))}
        </div>

        <button className="btn" style={{ marginTop: 8 }} onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save profile'}
        </button>
      </div>

      {bucket && (
        <div className="card">
          <div className="section-title">Your risk bucket: <span className="pill">{bucket}</span></div>
          <p className="muted">{BUCKET_DESCRIPTIONS[bucket]}</p>
        </div>
      )}
    </div>
  )
}
