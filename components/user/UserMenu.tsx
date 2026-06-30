'use client'

import Link from 'next/link'
import { useEffect, useState, useTransition } from 'react'
import { Sheet } from '@/components/ui/Sheet'
import { Switch } from '@/components/ui/Switch'
import { Avatar } from '@/components/ui/Avatar'
import { signOut } from '@/lib/actions/auth'
import {
  getNotifications,
  getNotificationPrefs,
  markNotificationsRead,
  updateNotificationPrefs,
  savePushSubscription,
  deletePushSubscription,
} from '@/lib/actions/push'
import {
  isPushSupported,
  subscribeToPush,
  unsubscribeFromPush,
  getExistingSubscription,
} from '@/lib/notifications/client'
import { PREF_DEFAULTS, PREF_LABELS, type NotificationPrefValues } from '@/lib/notifications/prefs'
import type { Notification } from '@/lib/types'

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return "à l'instant"
  if (min < 60) return `il y a ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `il y a ${h} h`
  const d = Math.floor(h / 24)
  return `il y a ${d} j`
}

export function UserMenu({ email }: { email: string | null }) {
  const [open, setOpen] = useState(false)
  const [notifs, setNotifs] = useState<Notification[]>([])
  const [unread, setUnread] = useState(0)
  const [prefs, setPrefs] = useState<NotificationPrefValues>(PREF_DEFAULTS)
  const [prefsLoaded, setPrefsLoaded] = useState(false)
  const [pushOn, setPushOn] = useState(false)
  const [pushBusy, setPushBusy] = useState(false)
  const [, startTransition] = useTransition()

  const initial = (email ?? '?').trim().charAt(0).toUpperCase() || '?'
  const pushSupported = isPushSupported()

  // Au montage : on charge les notifs (pour la pastille « non lu » de l'avatar).
  useEffect(() => {
    getNotifications()
      .then((rows) => {
        setNotifs(rows)
        setUnread(rows.filter((n) => !n.read_at).length)
      })
      .catch(() => {})
  }, [])

  function handleOpen() {
    setOpen(true)
    // Chargement lazy (une seule fois) des préférences + état de souscription.
    if (!prefsLoaded) {
      setPrefsLoaded(true)
      getNotificationPrefs().then(setPrefs).catch(() => {})
      getExistingSubscription()
        .then((sub) => setPushOn(!!sub))
        .catch(() => {})
    }
    // Marque les notifs comme lues (badge → 0).
    if (unread > 0) {
      setUnread(0)
      startTransition(() => {
        markNotificationsRead().catch(() => {})
      })
    }
  }

  function togglePush(next: boolean) {
    setPushBusy(true)
    ;(async () => {
      try {
        if (next) {
          const sub = await subscribeToPush()
          if (!sub) {
            setPushOn(false)
            return
          }
          await savePushSubscription(sub)
          setPushOn(true)
        } else {
          const endpoint = await unsubscribeFromPush()
          if (endpoint) await deletePushSubscription(endpoint)
          setPushOn(false)
        }
      } catch {
        // best-effort : on resynchronise sur l'état réel du navigateur.
        getExistingSubscription().then((s) => setPushOn(!!s)).catch(() => {})
      } finally {
        setPushBusy(false)
      }
    })()
  }

  function togglePref(key: keyof NotificationPrefValues, next: boolean) {
    const updated = { ...prefs, [key]: next }
    setPrefs(updated)
    startTransition(() => {
      updateNotificationPrefs(updated).catch(() => {})
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        aria-label="Menu et notifications"
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border-[1.5px] border-line-3 bg-card text-[14px] text-ink"
      >
        <Avatar pseudo={initial} className="h-full w-full text-[14px]" />
        {unread > 0 && (
          <span className="absolute -right-[2px] -top-[2px] flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-terracotta px-1 text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <Sheet onClose={() => setOpen(false)} variant="bottom" labelledBy="user-menu-title">
          <div className="mb-4 flex items-center justify-between">
            <h2 id="user-menu-title" className="font-serif text-[20px] text-ink">
              Mon compte
            </h2>
            <span className="max-w-[55%] truncate text-[12.5px] text-faint">{email ?? 'Invité'}</span>
          </div>

          <Link
            href="/mes-komos"
            onClick={() => setOpen(false)}
            className="mb-4 flex items-center justify-between rounded-[14px] border-[1.5px] border-line-2 bg-card px-4 py-[13px] text-[14.5px] font-bold text-ink"
          >
            <span>🗺️ Mes Komos</span>
            <span className="text-[13px] font-bold text-terracotta">ouvrir ›</span>
          </Link>

          {/* Notifs */}
          <div className="mb-5">
            <p className="mb-2 text-[12px] font-bold uppercase tracking-[1px] text-faint">Tes notifs</p>
            {notifs.length === 0 ? (
              <p className="rounded-[14px] bg-soft px-4 py-5 text-center text-[13px] text-muted">
                Rien pour le moment.
              </p>
            ) : (
              <ul className="flex max-h-[230px] flex-col gap-[6px] overflow-y-auto">
                {notifs.map((n) => (
                  <li key={n.id}>
                    <Link
                      href={n.url ?? '#'}
                      onClick={() => setOpen(false)}
                      className="flex items-start gap-2 rounded-[12px] border-[1.5px] border-line-2 bg-card px-3 py-[10px]"
                    >
                      {!n.read_at && (
                        <span className="mt-[6px] h-[7px] w-[7px] shrink-0 rounded-full bg-terracotta" />
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13.5px] leading-[1.35] text-ink">{n.body}</span>
                        <span className="mt-[2px] block text-[11.5px] text-faint">{timeAgo(n.created_at)}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Préférences */}
          <div className="mb-5">
            <p className="mb-2 text-[12px] font-bold uppercase tracking-[1px] text-faint">Préférences</p>
            <div className="rounded-[14px] border-[1.5px] border-line-2 bg-card">
              <div className="flex items-center justify-between border-b-[1.5px] border-line-2 px-4 py-[12px]">
                <span className="min-w-0 pr-3">
                  <span className="block text-[14px] font-bold text-ink">Notifications push</span>
                  <span className="block text-[11.5px] text-faint">
                    {pushSupported ? 'Sur cet appareil' : 'Non supporté par ce navigateur'}
                  </span>
                </span>
                <Switch
                  checked={pushOn}
                  disabled={!pushSupported || pushBusy}
                  onChange={togglePush}
                  label="Activer les notifications push"
                />
              </div>
              {PREF_LABELS.map(({ key, label }) => (
                <div
                  key={key}
                  className="flex items-center justify-between px-4 py-[11px] [&:not(:last-child)]:border-b-[1.5px] [&:not(:last-child)]:border-line-2"
                >
                  <span className="pr-3 text-[14px] text-ink">{label}</span>
                  <Switch
                    checked={prefs[key]}
                    onChange={(next) => togglePref(key, next)}
                    label={label}
                  />
                </div>
              ))}
            </div>
          </div>

          <form action={signOut}>
            <button
              type="submit"
              className="w-full rounded-[14px] border-[1.5px] border-line-3 bg-card py-[13px] text-[14.5px] font-bold text-ink"
            >
              Se déconnecter
            </button>
          </form>
        </Sheet>
      )}
    </>
  )
}
