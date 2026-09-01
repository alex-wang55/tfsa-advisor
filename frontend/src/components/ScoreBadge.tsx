function bucket(score: number): 'high' | 'mid' | 'low' {
  if (score >= 65) return 'high'
  if (score >= 45) return 'mid'
  return 'low'
}

export function ScoreBadge({ score }: { score: number }) {
  return <span className={`score-badge ${bucket(score)}`}>{Math.round(score)}</span>
}
