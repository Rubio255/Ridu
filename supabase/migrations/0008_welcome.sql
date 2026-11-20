-- Pirmas ekranas klientams iš įstaigų: vairuotojo prisistatymas ir pažintinio pokalbio užklausos
alter table drivers
  add column since_year int check (since_year between 1950 and 2100), -- vairuoja nuo
  add column bio text;                                                 -- trumpas prisistatymas klientams

create type visit_status as enum ('new', 'confirmed', 'done', 'declined');
create table visit_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  profile_id uuid references profiles on delete set null,   -- jei užsakė prisijungęs klientas
  name text not null,
  phone text,
  who text not null check (who in ('child', 'self', 'relative')),
  how text not null check (how in ('home', 'institution', 'phone')),
  org text,                                                 -- iš kokios įstaigos sužinojo
  wanted_date date not null,
  wanted_time time not null,
  driver_id uuid references drivers(profile_id) on delete set null,
  note text,
  status visit_status not null default 'new'
);
create index visit_requests_status_idx on visit_requests (status, wanted_date);
alter table visit_requests enable row level security;
-- Skaito MB, vairuotojas – tik jam paskirtus patvirtintus, klientas – savo. Rašoma tik per serverio veiksmus.
create policy owner_read on visit_requests for select using (is_owner());
create policy driver_read on visit_requests for select using (driver_id = auth.uid() and status in ('confirmed', 'done'));
create policy client_read on visit_requests for select using (profile_id = auth.uid());
