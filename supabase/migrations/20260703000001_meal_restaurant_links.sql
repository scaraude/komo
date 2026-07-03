-- ============================================================
-- Repas au restaurant : type + liens.
--
--  • meals.is_restaurant : un repas est soit « fait maison » (ingrédients →
--    liste de courses), soit « au restaurant » (aucune course, on partage des
--    liens). Le type est choisi à la création, pas converti ensuite.
--  • meals.links : liste d'URL (Google Maps, site du resto, menu, réservation…).
--    text[] comme products.tags — l'ordre de saisie est préservé.
-- Aucune nouvelle policy : colonnes sur meals, déjà couvert par is_event_member.
-- ============================================================

alter table public.meals
  add column if not exists is_restaurant boolean not null default false,
  add column if not exists links text[] not null default '{}';
