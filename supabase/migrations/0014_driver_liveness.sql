-- Vairuotojo tapatybės ir gyvumo patikra pagal riziką (Didit arba vaizdo skambutis su administratoriumi).
-- Kada prašoma patikros, nusprendžia src/lib/liveness.ts (livenessDue):
--   registruojantis pilna patikra; kas 7 d.; prieš pirmą kelionę su nauju klientu; atsitiktinai ~1 iš 10 darbo dienų;
--   rizikos signalas (naujas įrenginys, pakeista nuotrauka ar automobilis, kliento pranešimas, >14 d. neaktyvumas);
--   vaikų pastoviam maršrutui prieš pradžią ir kartą per savaitę.
-- Saugomas tik rezultatas ir laikas. Veido nuotraukų, dokumentų kopijų ir biometrinių duomenų nesaugome (BDAR 9 str.).
create table driver_identity_checks (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references drivers on delete cascade,
  kind text not null check (kind in ('initial', 'liveness')),     -- initial: dokumentas + selfis; liveness: ~10 s gyvumas + veido atitikimas
  reason text,                                                     -- kodėl paprašyta: weekly, new_client, random, new_device, profile_change, report, inactive, child_route
  method text not null check (method in ('didit', 'video_call')),
  provider_session_id text unique,                                 -- Didit session_id; vaizdo skambučiui null
  status text not null default 'pending' check (status in ('pending', 'passed', 'failed')),
  checked_at timestamptz,
  checked_by uuid references profiles,                             -- vaizdo skambučiu patvirtinęs administratorius
  created_at timestamptz not null default now()
);
create index driver_identity_checks_driver_idx on driver_identity_checks (driver_id, created_at desc);

alter table drivers add column identity_verified_at timestamptz;   -- paskutinė sėkminga pirminė patikra
alter table drivers add column liveness_checked_at timestamptz;    -- paskutinė sėkminga gyvumo patikra
alter table drivers add column liveness_due_reason text;           -- rizikos signalas, laukiantis patikros (null = nėra)
alter table drivers add column liveness_failed int not null default 0; -- nesėkmingi bandymai iš eilės
alter table drivers add column liveness_review boolean not null default false; -- po 2 nesėkmių profilis paslėptas, peržiūri administratorius

-- Ar profilį galima rodyti klientams. Smulkesnės taisyklės (naujas klientas, atsitiktinė diena) tikrinamos serveryje prieš veiksmą.
create or replace function public.liveness_ok(d drivers) returns boolean
language sql stable set search_path = public as $$
  select d.identity_verified_at is not null
     and not d.liveness_review
     and d.liveness_due_reason is null
     and d.liveness_checked_at is not null
     and d.liveness_checked_at > now() - interval '7 days';
$$;

alter table driver_identity_checks enable row level security;
create policy owner_read on driver_identity_checks for select using ((select private.is_owner()));
create policy self_read on driver_identity_checks for select using (driver_id = (select auth.uid()));
create policy mfa_required on driver_identity_checks as restrictive for all to authenticated
  using ((select private.mfa_ok())) with check ((select private.mfa_ok()));
-- Rašo tik serveris (service role): sesijos kūrimas ir Didit webhook po parašo patikros
