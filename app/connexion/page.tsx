'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { sendLoginLink, type LoginState } from '@/lib/actions/auth'
import { Button } from '@/components/ui/Button'
import { Logo } from '@/components/ui/Logo'

export default function ConnexionPage() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(sendLoginLink, {
    status: 'idle',
    email: '',
  })

  return (
    <main className="animate-screen-in mx-auto flex min-h-dvh w-full max-w-[440px] flex-col px-6 pb-10 pt-8">
      <Link href="/" className="mb-12 inline-flex w-fit">
        <Logo />
      </Link>

      {state.status === 'sent' ? (
        <div className="my-auto text-center">
          <div className="mb-4 text-[40px]">📬</div>
          <h1 className="mb-2 font-serif text-[28px] leading-[1.1] text-ink">Regarde tes mails</h1>
          <p className="mx-auto max-w-[300px] text-[14.5px] leading-[1.5] text-faint">
            Si un compte existe pour <b className="text-body">{state.email}</b>, on vient d&apos;y
            envoyer un lien de connexion. Clique-le pour retrouver tes Komos.
          </p>
          <a href="/connexion" className="mt-6 inline-block text-[13.5px] font-semibold text-terracotta">
            Renvoyer / changer d&apos;email
          </a>
        </div>
      ) : (
        <form action={formAction} className="flex flex-1 flex-col">
          <h1 className="mb-3 font-serif text-[34px] leading-[1.08] text-ink">
            Te reconnecter
          </h1>
          <p className="mb-9 text-[15px] leading-[1.5] text-faint">
            Entre l&apos;email que tu as lié à tes Komos — on t&apos;envoie un lien magique,
            sans mot de passe.
          </p>

          <label
            htmlFor="email"
            className="mb-[9px] text-[12px] font-bold uppercase tracking-[0.8px] text-muted-2"
          >
            Ton email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoFocus
            placeholder="ex : marie@email.com"
            className="mb-[18px] w-full rounded-[15px] border-[1.5px] border-line bg-card p-4 text-[15px] text-ink outline-none placeholder:text-disabled focus:border-terracotta"
          />

          <Button type="submit" disabled={pending} className="mt-auto rounded-[17px] p-[18px] text-[16px]">
            {pending ? 'Envoi…' : 'Recevoir le lien →'}
          </Button>
          <Link href="/" className="mt-[14px] text-center text-[13px] text-muted-2">
            ← Créer un nouveau Komo
          </Link>
        </form>
      )}
    </main>
  )
}
