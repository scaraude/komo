-- ============================================================
-- Sondage de dates : une proposition devient une PÉRIODE (créneau), plus un
-- jour unique.
--
-- Avant : `proposed_date` = un seul jour → « Fixer » faisait date_start =
-- date_end = ce jour, soit un séjour d'une seule journée (bancal pour un
-- week-end). Désormais chaque proposition porte un début ET une fin, et
-- « Fixer » recopie honnêtement le créneau dans events.date_start/date_end.
--
-- Reprise : les propositions existantes (jour unique) deviennent un créneau
-- d'un jour (end_date = start_date), donc aucun vote n'est perdu.
-- ============================================================

-- 1. Le jour unique devient le début du créneau.
alter table public.date_proposals
  rename column proposed_date to start_date;

-- 2. Fin du créneau : nullable le temps de la reprise, puis NOT NULL.
alter table public.date_proposals
  add column end_date date;

update public.date_proposals
  set end_date = start_date
  where end_date is null;

alter table public.date_proposals
  alter column end_date set not null;

-- 3. Intégrité : une période va toujours de l'avant.
alter table public.date_proposals
  add constraint date_proposal_period_order check (end_date >= start_date);
