'use client'

import { useEffect, useState } from 'react'

// Événement Chromium déclenché quand l'app est installable.
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISS_KEY = 'komo-install-dismissed'

// Affichage du bandeau d'installation :
//  - 'on'   : toujours affiché (prévisualisation ; bouton « Installer » inerte)
//  - 'off'  : jamais affiché
//  - 'auto' : règles normales (masqué si app installée / desktop / déjà fermé)
const INSTALL_BANNER: 'on' | 'off' | 'auto' = 'auto'

type Mode = 'none' | 'button' | 'ios'

/**
 * Bannière d'installation PWA. Sur Chromium (Android/desktop) : capture
 * `beforeinstallprompt` et propose un bouton « Installer » qui déclenche le
 * prompt natif. Sur iOS Safari (pas de beforeinstallprompt) : affiche les
 * instructions « Partager → Sur l'écran d'accueil ». Cachée si déjà installée
 * (standalone) ou si l'utilisateur a fermé la bannière.
 */
export function InstallPrompt() {
  const [mode, setMode] = useState<Mode>('none')
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    if (INSTALL_BANNER === 'off') return
    // 'on' : force l'affichage sans aucune garde (bouton « Installer » inerte,
    // aucun prompt capturé) — utile pour prévisualiser le rendu.
    if (INSTALL_BANNER === 'on') {
      Promise.resolve().then(() => setMode('button'))
      return
    }
    // 'auto' : règles normales ci-dessous.
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true
    if (standalone) return
    if (localStorage.getItem(DISMISS_KEY)) return

    // Bannière réservée au mobile : sur desktop, l'install se fait via la barre
    // d'adresse du navigateur.
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(
      navigator.userAgent,
    )
    if (!isMobile) return

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)

    let onBeforeInstall: ((e: Event) => void) | undefined
    if (isIOS) {
      // setState différé (microtask) pour ne pas le faire en synchrone dans
      // l'effet, et éviter un mismatch d'hydratation (rendu initial = null).
      Promise.resolve().then(() => setMode('ios'))
    } else {
      onBeforeInstall = (e: Event) => {
        e.preventDefault()
        setDeferred(e as BeforeInstallPromptEvent)
        setMode('button')
      }
      window.addEventListener('beforeinstallprompt', onBeforeInstall)
    }

    const onInstalled = () => setMode('none')
    window.addEventListener('appinstalled', onInstalled)

    return () => {
      if (onBeforeInstall) window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (mode === 'none') return null

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, '1')
    setMode('none')
  }

  async function install() {
    if (!deferred) return
    await deferred.prompt()
    await deferred.userChoice
    setDeferred(null)
    setMode('none')
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] flex justify-center px-3 pb-[max(12px,env(safe-area-inset-bottom))]">
      <div className="flex w-full max-w-[440px] items-center gap-3 rounded-[18px] border-[1.5px] border-line-2 bg-card px-4 py-[13px] shadow-[0_8px_30px_rgba(60,45,20,0.18)]">
        {/* eslint-disable-next-line @next/next/no-img-element -- petite icône statique, pas besoin de next/image */}
        <img src="/icon-192.png" alt="" className="h-10 w-10 shrink-0 rounded-[10px]" />
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-bold text-ink">Installer Komo</p>
          {mode === 'ios' ? (
            <p className="text-[12px] leading-[1.35] text-muted">
              Appuie sur Partager <span aria-hidden>⎋</span> puis « Sur l’écran d’accueil ».
            </p>
          ) : (
            <p className="text-[12px] text-muted">Accès direct, plein écran, comme une app.</p>
          )}
        </div>
        {mode === 'button' && (
          <button
            type="button"
            onClick={install}
            className="shrink-0 rounded-[12px] bg-terracotta px-4 py-[9px] text-[13px] font-bold text-white shadow-[0_3px_0_var(--color-terracotta-dk)] active:translate-y-[2px] active:shadow-none"
          >
            Installer
          </button>
        )}
        <button
          type="button"
          onClick={dismiss}
          aria-label="Fermer"
          className="shrink-0 rounded-full p-1 text-[18px] leading-none text-faint"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
