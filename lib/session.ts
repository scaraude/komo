import { cookies } from 'next/headers'

export function sessionCookieName(slug: string) {
  return `komo_session_${slug}`
}

export async function getSessionToken(slug: string): Promise<string | null> {
  const store = await cookies()
  return store.get(sessionCookieName(slug))?.value ?? null
}

export async function setSessionCookie(slug: string, token: string) {
  const store = await cookies()
  store.set(sessionCookieName(slug), token, {
    httpOnly: false, // readable by JS for Supabase Realtime headers
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 365, // 1 year
    path: '/',
  })
}

export function creatorCookieName(slug: string) {
  return `komo_creator_${slug}`
}

export async function getCreatorToken(slug: string): Promise<string | null> {
  const store = await cookies()
  return store.get(creatorCookieName(slug))?.value ?? null
}

export async function setCreatorCookie(slug: string, token: string) {
  const store = await cookies()
  store.set(creatorCookieName(slug), token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 365,
    path: '/',
  })
}
