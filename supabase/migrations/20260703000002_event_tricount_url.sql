-- ============================================================
-- Lien Tricount / cagnotte au niveau de l'event.
--
-- On ne gère pas de dépenses en interne : on stocke juste l'URL de partage d'un
-- Tricount (ou équivalent) que l'orga colle, pour que tous les participants
-- l'ouvrent. Nullable. Écriture réservée au créateur via la policy events
-- existante (created_by = auth.uid()), lecture publique comme le reste de l'event.
-- ============================================================

alter table public.events
  add column if not exists tricount_url text;
