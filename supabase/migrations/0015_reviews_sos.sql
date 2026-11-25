-- Abipusiai atsiliepimai po kelionės ir SOS pranešimai kelionės metu.

-- Atsiliepimas: klientas (mokėtojas) vertina vairuotoją, vairuotojas – klientą. Vienas atsiliepimas kelionei iš kiekvienos pusės.
-- Matomas, kai įvertina abu arba po 14 d. (kad niekas nekeršytų už įvertinimą). Rašyti galima 14 d. po kelionės.
create table trip_reviews (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips on delete cascade,
  author_id uuid not null references profiles on delete cascade,
  target_id uuid not null references profiles on delete cascade,
  author_role text not null check (author_role in ('client', 'driver')),
  stars int not null check (stars between 1 and 5),
  comment text check (char_length(comment) <= 500),
  hidden boolean not null default false,          -- administratorius paslepia pažeidžiantį taisykles
  created_at timestamptz not null default now(),
  unique (trip_id, author_id)
);
create index trip_reviews_target_idx on trip_reviews (target_id, created_at desc);

-- SOS: vieta perduodama tik Ridu administratoriui. Saugoma 30 d., nebent pažymėta tyrimui (hold).
create table sos_events (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references trips on delete set null,
  user_id uuid not null references profiles on delete cascade,
  lat double precision,
  lng double precision,
  accuracy real,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references profiles,
  hold boolean not null default false
);
create index sos_events_open_idx on sos_events (created_at desc) where resolved_at is null;

alter table trip_reviews enable row level security;
alter table sos_events enable row level security;
create policy owner_read on trip_reviews for select using ((select private.is_owner()));
create policy author_read on trip_reviews for select using (author_id = (select auth.uid()));
create policy owner_read on sos_events for select using ((select private.is_owner()));
create policy self_read on sos_events for select using (user_id = (select auth.uid()));
create policy mfa_required on trip_reviews as restrictive for all to authenticated using ((select private.mfa_ok())) with check ((select private.mfa_ok()));
create policy mfa_required on sos_events as restrictive for all to authenticated using ((select private.mfa_ok())) with check ((select private.mfa_ok()));
-- Rašo tik serveris (service role) po teisių patikros. Atsiliepimai apie kitus skaitomi serveryje, taikant matomumo taisyklę.

-- Duomenų kiekio mažinimas (BDAR): SOS vieta ištrinama po 30 d., jei nežymėta tyrimui – kasdien /api/cron/trips
