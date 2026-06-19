-- ============================================================
-- Géométrie du trajet : départ → arrivée
-- ============================================================
-- Remplace le modèle « participant + override » (custom_arrival_city) par une
-- géométrie de leg honnête : departure_city → arrival_city.
--   • Côté participant (départ d'un aller, arrivée d'un retour) : TOUJOURS rempli.
--   • Côté event : nullable → NULL = hérite de events.destination.
-- Une contrainte garantit que seul le côté event peut être NULL selon la
-- direction → un NULL signifie TOUJOURS « lieu de l'event », jamais une donnée
-- manquante. La limpidité du NULL est prouvée par le schéma.

-- 1. Nouvelle colonne arrivée.
alter table public.transport_legs
  add column arrival_city text;

-- 2. departure_city devient nullable AVANT toute reprise — un retour dont le
--    départ hérite de l'event y est mis à NULL ci-dessous.
alter table public.transport_legs
  alter column departure_city drop not null;

-- 3. Reprise des données depuis l'ancien modèle
--    (departure_city = participant, custom_arrival_city = override côté event).
--    Aller  : arrivée = override event ; départ = participant (inchangé).
update public.transport_legs
  set arrival_city = custom_arrival_city
  where direction = 'aller';
--    Retour : arrivée = participant ; départ = override event (NULL = hérite).
update public.transport_legs
  set arrival_city = departure_city, departure_city = custom_arrival_city
  where direction = 'retour';

-- 4. L'override n'a plus lieu d'être.
alter table public.transport_legs
  drop column custom_arrival_city;

-- 5. Intégrité : le côté participant est toujours présent.
alter table public.transport_legs
  add constraint participant_side_present check (
    (direction = 'aller'  and departure_city is not null) or
    (direction = 'retour' and arrival_city   is not null)
  );
