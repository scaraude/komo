-- ============================================================
-- Points de trajet & référence véhicule
-- ============================================================
-- `departure_city` reste la ville côté participant (départ pour un aller,
-- arrivée pour un retour). On ajoute un OVERRIDE optionnel du point côté event :
-- NULL = pas de point custom → on hérite de `events.destination` (source de
-- vérité unique, pas de copie qui dérive). Renseigné = autre point d'arrivée
-- (aller) / de départ (retour). Plus une référence libre (n° de train, etc.).
--
-- NB : ce modèle « participant + override » a été remplacé ensuite par une
-- géométrie de leg (départ → arrivée) dans la migration 20260619000003.
-- Cette migration est conservée telle qu'appliquée — on n'édite pas une
-- migration déjà passée.

alter table public.transport_legs
  add column custom_arrival_city text,
  add column vehicle_ref         text;
