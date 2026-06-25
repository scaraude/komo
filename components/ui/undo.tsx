'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import { randomId } from '@/lib/uuid'

/**
 * Infra « annulation façon Gmail ».
 *
 * Le pattern : l'appelant retire l'élément de son UI tout de suite (optimiste),
 * puis appelle `requestUndo(...)`. Un bandeau apparaît en bas pendant `duration`
 * (30 s par défaut) :
 *  - « Annuler » → on appelle `undo()` (restaure l'UI), AUCUN appel serveur ;
 *  - délai écoulé → on appelle `commit()` (la vraie action serveur).
 *
 * `commit()` n'est donc déclenché qu'à l'expiration. Si la commit échoue, on
 * rejoue `undo()` pour réafficher l'élément.
 */
export type UndoRequest = {
  /** Texte affiché dans le bandeau, ex. « Trajet supprimé ». */
  message: string
  /** Action serveur réelle, jouée à l'expiration du délai. */
  commit: () => void | Promise<void>
  /** Restaure l'UI optimiste, joué sur « Annuler » (ou si la commit échoue). */
  undo: () => void
  /** Durée du délai d'annulation en ms (défaut 30 000). */
  duration?: number
}

type PendingUndo = Required<UndoRequest> & { id: string }

const DEFAULT_DURATION = 30_000

const UndoContext = createContext<((req: UndoRequest) => void) | null>(null)

/** Hook : renvoie `requestUndo(req)`. À utiliser sous `<UndoProvider>`. */
export function useUndo(): (req: UndoRequest) => void {
  const ctx = useContext(UndoContext)
  if (!ctx) throw new Error('useUndo doit être utilisé dans <UndoProvider>')
  return ctx
}

export function UndoProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<PendingUndo[]>([])
  // Miroir des actions en attente, pour pouvoir les committer au déchargement.
  const pending = useRef(new Map<string, PendingUndo>())

  const drop = useCallback((id: string) => {
    pending.current.delete(id)
    setItems((list) => list.filter((x) => x.id !== id))
  }, [])

  const commit = useCallback(
    (id: string) => {
      const item = pending.current.get(id)
      if (!item) return
      drop(id)
      try {
        const r = item.commit()
        if (r instanceof Promise) r.catch(() => item.undo())
      } catch {
        item.undo()
      }
    },
    [drop],
  )

  const cancel = useCallback(
    (id: string) => {
      const item = pending.current.get(id)
      if (!item) return
      drop(id)
      item.undo()
    },
    [drop],
  )

  const requestUndo = useCallback((req: UndoRequest) => {
    const item: PendingUndo = {
      id: randomId(),
      message: req.message,
      commit: req.commit,
      undo: req.undo,
      duration: req.duration ?? DEFAULT_DURATION,
    }
    pending.current.set(item.id, item)
    setItems((list) => [...list, item])
  }, [])

  // Si l'utilisateur ferme/quitte la page avec des suppressions en attente, on
  // les committe (best-effort) — sinon elles seraient silencieusement perdues.
  useEffect(() => {
    function flush() {
      for (const item of pending.current.values()) {
        try {
          item.commit()
        } catch {
          /* best-effort */
        }
      }
      pending.current.clear()
    }
    window.addEventListener('pagehide', flush)
    return () => window.removeEventListener('pagehide', flush)
  }, [])

  return (
    <UndoContext.Provider value={requestUndo}>
      {children}
      {items.length > 0 && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 px-4 pb-[max(16px,env(safe-area-inset-bottom))]">
          {items.map((item) => (
            <UndoToast key={item.id} item={item} onCommit={commit} onUndo={cancel} />
          ))}
        </div>
      )}
    </UndoContext.Provider>
  )
}

function UndoToast({
  item,
  onCommit,
  onUndo,
}: {
  item: PendingUndo
  onCommit: (id: string) => void
  onUndo: (id: string) => void
}) {
  useEffect(() => {
    const t = setTimeout(() => onCommit(item.id), item.duration)
    return () => clearTimeout(t)
  }, [item.id, item.duration, onCommit])

  return (
    <div
      role="status"
      className="animate-sheet-up pointer-events-auto relative flex w-full max-w-[440px] items-center gap-3 overflow-hidden rounded-[14px] bg-ink py-[11px] pl-4 pr-[10px] shadow-[0_8px_30px_rgba(25,20,12,0.35)]"
    >
      <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-on-dark">
        {item.message}
      </span>
      <button
        type="button"
        onClick={() => onUndo(item.id)}
        className="shrink-0 rounded-[9px] px-3 py-[7px] text-[13px] font-bold text-terracotta transition-colors hover:bg-white/10"
      >
        Annuler
      </button>
      {/* Barre de décompte : se vide sur la durée d'annulation. */}
      <span
        className="animate-undo-bar absolute inset-x-0 bottom-0 h-[2.5px] origin-left bg-terracotta"
        style={{ animationDuration: `${item.duration}ms` }}
      />
    </div>
  )
}
