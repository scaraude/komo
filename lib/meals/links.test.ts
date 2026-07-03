import { describe, it, expect } from 'vitest'
import { normalizeUrl, linkKind, linkIcon, linkHost } from './links'

describe('normalizeUrl', () => {
  it('prepends https:// when no scheme is present', () => {
    expect(normalizeUrl('maps.google.com/place')).toBe('https://maps.google.com/place')
    expect(normalizeUrl('restaurant.fr')).toBe('https://restaurant.fr')
  })

  it('leaves an existing scheme intact', () => {
    expect(normalizeUrl('https://foo.com')).toBe('https://foo.com')
    expect(normalizeUrl('http://foo.com')).toBe('http://foo.com')
  })

  it('trims and returns empty for blank input', () => {
    expect(normalizeUrl('  https://foo.com  ')).toBe('https://foo.com')
    expect(normalizeUrl('   ')).toBe('')
  })
})

describe('linkKind', () => {
  it('detects Google Maps links', () => {
    expect(linkKind('https://www.google.com/maps/place/Chez+Luigi')).toBe('maps')
    expect(linkKind('maps.google.com/?q=luigi')).toBe('maps')
    expect(linkKind('https://maps.app.goo.gl/abc123')).toBe('maps')
    expect(linkKind('https://goo.gl/maps/abc')).toBe('maps')
    expect(linkKind('https://maps.apple.com/?ll=48.8,2.3')).toBe('maps')
  })

  it('treats everything else as a web link', () => {
    expect(linkKind('https://restaurant.fr')).toBe('web')
    expect(linkKind('https://www.google.com/search?q=luigi')).toBe('web')
    expect(linkKind('not a url')).toBe('web')
  })
})

describe('linkIcon', () => {
  it('maps to a pin, web to a link glyph', () => {
    expect(linkIcon('https://maps.google.com/x')).toBe('📍')
    expect(linkIcon('https://restaurant.fr')).toBe('🔗')
  })
})

describe('linkHost', () => {
  it('returns the hostname without www.', () => {
    expect(linkHost('https://www.restaurant.fr/menu')).toBe('restaurant.fr')
    expect(linkHost('maps.google.com/place')).toBe('maps.google.com')
  })

  it('falls back to the raw string when unparseable', () => {
    expect(linkHost('')).toBe('')
  })
})
