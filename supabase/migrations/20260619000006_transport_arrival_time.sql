-- Heure d'arrivée (surtout pour les trains : on sait quand ça arrive à
-- destination). Colonne dédiée, distincte de departure_time_end qui, lui,
-- représente la FIN d'une plage de départ (voiture/location).
alter table public.transport_legs
  add column if not exists arrival_time timestamptz;
