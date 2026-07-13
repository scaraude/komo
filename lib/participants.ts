import type { Participant } from '@/lib/types'

export function pseudoOf(participants: Pick<Participant, 'id' | 'pseudo'>[], id: string): string {
  return participants.find((p) => p.id === id)?.pseudo ?? '?'
}

export function avatarUrlOf(participants: Pick<Participant, 'id' | 'avatar_url'>[], id: string): string | null {
  return participants.find((p) => p.id === id)?.avatar_url ?? null
}

// Un·e participant·e « concerné·e par le transport » : tout le monde SAUF ceux
// qui ont explicitement répondu « Non » (presence_status 'no'). Les non-déclaré·es
// (presence_status null — ex. les potes qu'on vient d'ajouter à la main) comptent
// donc parmi les « sans solution de transport » : ils n'ont rien dit, on doit
// quand même leur trouver une place. Source unique pour la bannière, le récap et
// le solveur d'auto-affectation.
export function needsTransport(p: Pick<Participant, 'presence_status'>): boolean {
  return p.presence_status !== 'no'
}
