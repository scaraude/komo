import { NextResponse, type NextRequest } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

// Atterrissage des magic links / confirmations email. Gère les deux formes :
//  • PKCE  : ?code=...            → exchangeCodeForSession
//  • OTP   : ?token_hash=&type=   → verifyOtp
// puis redirige vers `next` (défaut : Mes Komos). La session est posée via les
// cookies du client serveur (autorisé dans un Route Handler).
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const next = searchParams.get('next') ?? '/mes-komos'
  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null

  const supabase = await createClient()
  let ok = false

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    ok = !error
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
    ok = !error
  }

  return NextResponse.redirect(`${origin}${ok ? next : '/connexion?error=expired'}`)
}
