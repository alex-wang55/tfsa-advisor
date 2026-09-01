import type { ExplanationBullet } from '../api/types'

export function ExplanationPanel({ bullets }: { bullets: ExplanationBullet[] }) {
  if (bullets.length === 0) {
    return <p className="muted">No notes available for this stock yet.</p>
  }
  return (
    <ul className="bullet-list">
      {bullets.map((b, i) => (
        <li key={i} className={`bullet ${b.tone}`}>
          <span className="dot" />
          <span>{b.text}</span>
        </li>
      ))}
    </ul>
  )
}
