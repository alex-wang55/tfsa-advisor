/** Shared thresholds for colouring 0–100 scores. */
export function scoreTone(score: number): 'success' | 'neutral' | 'warning' {
  if (score >= 65) return 'success'
  if (score >= 45) return 'neutral'
  return 'warning'
}
