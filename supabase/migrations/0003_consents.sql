-- Klientų sutikimai: kiekvienas pakeitimas saugomas atskiru įrašu (laikas ir sąlygų versija)
create table consents (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles on delete cascade,
  key text not null check (key in ('terms','privacy','guardian','health','alone','news')),
  granted boolean not null,
  terms_version text not null,
  created_at timestamptz not null default now()
);
create index consents_profile_idx on consents (profile_id, key, created_at desc);
alter table consents enable row level security;
create policy owner_read on consents for select using (is_owner());
create policy self_read on consents for select using (profile_id = auth.uid());
-- Rašoma tik serveryje (service role)

-- Naujausia kiekvieno sutikimo būsena
create view current_consents with (security_invoker = true) as
select distinct on (profile_id, key) profile_id, key, granted, terms_version, created_at
from consents order by profile_id, key, created_at desc;
