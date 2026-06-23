// Accesseurs partagés pour la map de votes `jsonb` (date_proposals,
// accommodation_options). Centralise la logique recopiée dans DatePoll et
// AccommodationSection. Le type est déjà fourni par database.types — d'où
// l'absence de cast ici.
export type Votes = Record<string, boolean>

/** Nombre de votes positifs. */
export function countVotes(votes: Votes): number {
  return Object.values(votes).filter(Boolean).length
}

/** Le participant a-t-il voté pour cette option ? */
export function hasVote(votes: Votes, participantId: string): boolean {
  return votes[participantId] === true
}

/** Map de votes avec le vote du participant inversé (immutable). */
export function toggleVote(votes: Votes, participantId: string): Votes {
  return { ...votes, [participantId]: !votes[participantId] }
}
