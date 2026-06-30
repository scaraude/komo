'use client'

import { useActionState, useState } from 'react'
import { joinEvent, type JoinState } from '@/lib/actions/participants'
import { Card } from '@/components/ui/Card'

type Profile = { id: string; pseudo: string }

// Valeur sentinelle du choix « je crée un nouveau profil » (pas un id de profil).
const NEW_PROFILE = '__new__'

export function JoinForm({
  slug,
  initialStatus,
  profiles,
}: {
  slug: string
  initialStatus: 'email' | 'choose'
  profiles: Profile[]
}) {
  const action = joinEvent.bind(null, slug)
  const [state, formAction, pending] = useActionState<JoinState, FormData>(
    action,
    { status: initialStatus },
  )

  // Sélection courante (étape `choose`) : un id de profil à revendiquer, ou
  // NEW_PROFILE pour créer. Quand il y a des profils, on ne présélectionne rien
  // (l'utilisateur choisit). Sans profil, on est forcément en création.
  const [selected, setSelected] = useState<string | null>(
    profiles.length > 0 ? null : NEW_PROFILE,
  )
  const isClaiming = selected !== null && selected !== NEW_PROFILE
  const isNew = selected === NEW_PROFILE

  // Email reconnu (déjà participant) → magic link envoyé.
  if (state.status === 'verify') {
    return (
      <Card className="rounded-[18px] p-6">
        <p className="font-semibold text-lg mb-1">Vérifie tes mails 📬</p>
        <p className="text-muted text-sm">
          Cet email a déjà un compte Komo sur cet event. On t&apos;a envoyé un
          lien pour te reconnecter et rejoindre — ça t&apos;évite un doublon.
        </p>
      </Card>
    )
  }

  // Étape 1 — email d'abord.
  if (state.status === 'email') {
    return (
      <Card className="rounded-[18px] p-6">
        <p className="font-semibold text-lg mb-1">Tu es invité·e 🎉</p>
        <p className="text-muted text-sm mb-5">
          Entre ton email pour rejoindre — ou te reconnecter si tu as déjà un
          compte sur cet event.
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
            className="w-full border-[1.5px] border-line rounded-[13px] px-4 py-3 text-base bg-card focus:outline-none focus:border-terracotta transition-colors mb-4"
          />
          <button
            type="submit"
            disabled={pending}
            className="w-full bg-terracotta text-white rounded-[15px] px-6 py-3.5 font-bold text-base shadow-[0_4px_0_var(--color-terracotta-dk)] active:translate-y-1 active:shadow-none transition-all disabled:opacity-60"
          >
            {pending ? 'Un instant…' : 'Continuer →'}
          </button>
        </form>
      </Card>
    )
  }

  // Étape 2 — choix d'un profil de la liste ou saisie d'un pseudo.
  return (
    <Card className="rounded-[18px] p-6">
      <p className="font-semibold text-lg mb-1">Tu es invité·e 🎉</p>
      <p className="text-muted text-sm mb-5">
        {profiles.length > 0
          ? 'Retrouve-toi dans la liste, ou crée un nouveau profil.'
          : 'Choisis un pseudo pour rejoindre.'}
      </p>

      <form action={formAction}>
        {/* Email porté depuis l'étape 1 : on le rattache à l'identité créée. */}
        {state.email && <input type="hidden" name="email" value={state.email} />}

        {profiles.length > 0 && (
          <div className="mb-4">
            <p className="block text-sm font-semibold mb-1.5">Je suis déjà dans la liste</p>
            <div className="flex flex-col gap-2">
              {profiles.map((p) => {
                const active = selected === p.id
                return (
                  <label
                    key={p.id}
                    className={`flex items-center gap-3 border-[1.5px] rounded-[13px] px-4 py-3 cursor-pointer transition-colors ${
                      active ? 'border-terracotta bg-terracotta/5' : 'border-line bg-card'
                    }`}
                  >
                    <input
                      type="radio"
                      name="profileChoice"
                      value={p.id}
                      checked={active}
                      onChange={() => setSelected(p.id)}
                      className="accent-terracotta"
                    />
                    <span className="font-medium">{p.pseudo}</span>
                  </label>
                )
              })}
              <label
                className={`flex items-center gap-3 border-[1.5px] rounded-[13px] px-4 py-3 cursor-pointer transition-colors ${
                  isNew ? 'border-terracotta bg-terracotta/5' : 'border-line bg-card'
                }`}
              >
                <input
                  type="radio"
                  name="profileChoice"
                  value={NEW_PROFILE}
                  checked={isNew}
                  onChange={() => setSelected(NEW_PROFILE)}
                  className="accent-terracotta"
                />
                <span className="font-medium">➕ Je ne suis pas dans la liste</span>
              </label>
            </div>
          </div>
        )}

        {/* Id du profil revendiqué transmis à l'action (sinon création). */}
        {isClaiming && <input type="hidden" name="profileId" value={selected ?? ''} />}

        {(isNew || profiles.length === 0) && (
          <>
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
              autoFocus={profiles.length === 0}
              className="w-full border-[1.5px] border-line rounded-[13px] px-4 py-3 text-base bg-card focus:outline-none focus:border-terracotta transition-colors mb-4"
            />
          </>
        )}

        <button
          type="submit"
          disabled={pending || selected === null}
          className="w-full bg-terracotta text-white rounded-[15px] px-6 py-3.5 font-bold text-base shadow-[0_4px_0_var(--color-terracotta-dk)] active:translate-y-1 active:shadow-none transition-all disabled:opacity-60"
        >
          {pending ? 'Un instant…' : 'Rejoindre l’event →'}
        </button>
      </form>
    </Card>
  )
}
