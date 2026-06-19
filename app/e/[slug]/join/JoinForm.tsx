'use client'

import { useActionState } from 'react'
import { joinEvent, type JoinState } from '@/lib/actions/participants'

const card =
  'bg-card border-2 border-ink rounded-2xl p-6 shadow-[5px_5px_0_rgba(26,20,16,0.9)]'
const field =
  'w-full border-2 border-ink rounded-xl px-4 py-3 text-base bg-paper focus:outline-none focus:border-terracotta transition-colors mb-4'
const button =
  'w-full bg-terracotta text-white border-2 border-ink rounded-full px-6 py-3.5 font-bold text-base shadow-[0_4px_0_rgba(26,20,16,0.9)] active:translate-y-1 active:shadow-none transition-all disabled:opacity-60'

export function JoinForm({ slug }: { slug: string }) {
  const action = joinEvent.bind(null, slug)
  const [state, formAction, pending] = useActionState<JoinState, FormData>(action, {
    status: 'email',
  })

  if (state.status === 'verify') {
    return (
      <div className={card}>
        <p className="font-semibold text-lg mb-1">Vérifie tes mails 📬</p>
        <p className="text-muted text-sm">
          Tu as déjà un compte Komo. On t&apos;a envoyé un lien pour te reconnecter
          et rejoindre l&apos;event direct — pas besoin de re-choisir un pseudo.
        </p>
      </div>
    )
  }

  // Étape pseudo (compte inexistant) : l'email est conservé dans l'état serveur.
  if (state.status === 'need_pseudo') {
    return (
      <div className={card}>
        <p className="font-semibold text-lg mb-1">Première fois ici 👋</p>
        <p className="text-muted text-sm mb-5">
          Choisis un pseudo pour rejoindre (avec {state.email}).
        </p>
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
            className={field}
          />
          <button type="submit" disabled={pending} className={button}>
            {pending ? 'Un instant…' : 'Rejoindre l’event →'}
          </button>
        </form>
      </div>
    )
  }

  // Étape initiale : email d'abord.
  return (
    <div className={card}>
      <p className="font-semibold text-lg mb-1">Tu es invité·e 🎉</p>
      <p className="text-muted text-sm mb-5">
        Entre ton email pour rejoindre — ou te reconnecter si tu as déjà un compte.
      </p>
      <form action={formAction}>
        <label className="block text-sm font-semibold mb-1.5" htmlFor="email">
          Ton email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          maxLength={120}
          placeholder="ex: marie@email.com"
          autoFocus
          className={field}
        />
        <button type="submit" disabled={pending} className={button}>
          {pending ? 'Un instant…' : 'Continuer →'}
        </button>
      </form>
    </div>
  )
}
