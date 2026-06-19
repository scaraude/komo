-- ============================================================
-- Plage horaire de départ (voiture / location)
-- ============================================================
-- `departure_time` = début de la fenêtre (ou heure fixe). On ajoute une fin
-- optionnelle : renseignée → plage « 08:00–10:00 », null → heure fixe.

alter table public.transport_legs
  add column departure_time_end timestamptz;
