import type { Participant } from '@/lib/types'

export function pseudoOf(participants: Pick<Participant, 'id' | 'pseudo'>[], id: string): string {
  return participants.find((p) => p.id === id)?.pseudo ?? '?'
}
