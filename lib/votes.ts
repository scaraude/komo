export type Votes = Record<string, boolean>

export function countVotes(votes: Votes): number {
  return Object.values(votes).filter(Boolean).length
}

export function hasVote(votes: Votes, participantId: string): boolean {
  return votes[participantId] === true
}

export function toggleVote(votes: Votes, participantId: string): Votes {
  return { ...votes, [participantId]: !votes[participantId] }
}
