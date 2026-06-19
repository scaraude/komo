-- Commentaire libre sur un trajet (ex : « je peux faire un détour par… »).
alter table public.transport_legs
  add column comment text;
