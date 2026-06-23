import { describe, it, expect } from 'vitest'
import { countVotes, hasVote, toggleVote } from './votes'

describe('votes', () => {
  it('countVotes ne compte que les votes positifs', () => {
    expect(countVotes({})).toBe(0)
    expect(countVotes({ a: true, b: false, c: true })).toBe(2)
  })

  it('hasVote distingue présent-faux et absent', () => {
    expect(hasVote({ a: true }, 'a')).toBe(true)
    expect(hasVote({ a: false }, 'a')).toBe(false)
    expect(hasVote({}, 'a')).toBe(false)
  })

  it('toggleVote inverse sans muter la map source', () => {
    const votes = { a: true }
    expect(toggleVote(votes, 'a')).toEqual({ a: false })
    expect(toggleVote(votes, 'b')).toEqual({ a: true, b: true })
    expect(votes).toEqual({ a: true }) // immutable
  })
})
