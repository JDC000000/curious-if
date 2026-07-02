import { Question } from '@/lib/types/database'
import { accentForMonth } from '@/lib/palette'

/**
 * Resolves the accent colour for a question: the question's own stored
 * accent_colour if set, otherwise falls back to the 12-colour monthly deck
 * keyed off its published_at month. Shared by the archive grid, the browse
 * past-questions deck, and the homepage archive preview — keep these in
 * sync rather than reimplementing per page.
 */
export function accentForQuestion(q: Question): string {
  if (q.accent_colour) return q.accent_colour
  const date = q.published_at ? new Date(q.published_at) : new Date()
  return accentForMonth(date.getMonth() + 1).hex
}
