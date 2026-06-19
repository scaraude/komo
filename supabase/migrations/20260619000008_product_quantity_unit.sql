-- Quantité + unité sur les produits (liste de courses plus précise).
-- quantity nullable (optionnel) ; unit avec défaut 'unité'.
alter table public.products
  add column if not exists quantity numeric,
  add column if not exists unit text not null default 'unité';
