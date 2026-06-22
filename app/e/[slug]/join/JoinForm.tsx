'use client'

import { useActionState } from 'react'
import { joinEvent, type JoinState } from '@/lib/actions/participants'

export function JoinForm({ slug, showEmail }: { slug: string; showEmail: boolean }) {
  const action = joinEvent.bind(null, slug)
  const [state, formAction, pending] = useActionState<JoinState, FormData>(action, {
    status: 'idle',
  })

  if (state.status === 'verify') {
    return (
      <div className="bg-card border-[1.5px] border-line-2 rounded-[18px] p-6 shadow-[0_2px_8px_rgba(60,45,20,0.04)]">
        <p className="font-semibold text-lg mb-1">Vérifie tes mails 📬</p>
        <p className="text-muted text-sm">
          Cet email a déjà un compte Komo. On t&apos;a envoyé un lien pour te
          reconnecter et rejoindre l&apos;event — ça t&apos;évite un doublon.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-card border-[1.5px] border-line-2 rounded-[18px] p-6 shadow-[0_2px_8px_rgba(60,45,20,0.04)]">
      <p className="font-semibold text-lg mb-1">Tu es invité·e 🎉</p>
      <p className="text-muted text-sm mb-5">Choisis un pseudo pour rejoindre.</p>

      <form action={formAction}>
        <label className="block text-sm font-semibold mb-1.5" htmlFor="pseudo">
          Ton pseudo
        </label>
        <input
          id="pseudo"
          name="pseudo"
          type="text"
          required
          minLength={1}
          maxLength={30}
          placeholder="ex: Marco, Inès, YoYo…"
          autoFocus
          className="w-full border-[1.5px] border-line rounded-[13px] px-4 py-3 text-base bg-card focus:outline-none focus:border-terracotta transition-colors mb-4"
        />
        {showEmail && (
          <>
            <label className="block text-sm font-semibold mb-1.5" htmlFor="email">
              Ton email <span className="font-normal text-muted">· pour te reconnecter · facultatif</span>
            </label>
            <input
              id="email"
              name="email"
              type="email"
              maxLength={120}
              placeholder="ex: marie@email.com"
              className="w-full border-[1.5px] border-line rounded-[13px] px-4 py-3 text-base bg-card focus:outline-none focus:border-terracotta transition-colors mb-4"
            />
          </>
        )}
        <button
          type="submit"
          disabled={pending}
          className="w-full bg-terracotta text-white rounded-[15px] px-6 py-3.5 font-bold text-base shadow-[0_4px_0_var(--color-terracotta-dk)] active:translate-y-1 active:shadow-none transition-all disabled:opacity-60"
        >
          {pending ? 'Un instant…' : 'Rejoindre l’event →'}
        </button>
      </form>
    </div>
  )
}
