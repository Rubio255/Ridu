-- 'owner' rolė dabar reiškia MB administratorių. 'driver' – samdomas vairuotojas.
create table drivers (
  profile_id uuid primary key references profiles on delete cascade,
  cert_no text not null,                 -- individualios veiklos pažymos nr.
  car text,
  seats text,
  workdays int[] not null default '{1,2,3,4,5}',
  payout_pct numeric,                    -- null = bendras nustatymas driver_pct
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create table driver_documents (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references drivers on delete cascade,
  name text not null,
  number text,
  valid_until date,
  created_at timestamptz not null default now()
);
alter table subscriptions add column driver_id uuid references drivers;
alter table trips add column driver_id uuid references drivers;
create index trips_driver_idx on trips (driver_id, pickup_at);
create index subscriptions_driver_idx on subscriptions (driver_id);

create function is_driver() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'driver');
$$;

alter table drivers enable row level security;
alter table driver_documents enable row level security;
create policy owner_read on drivers for select using (is_owner());
create policy owner_read on driver_documents for select using (is_owner());
create policy self_read on drivers for select using (profile_id = auth.uid());
create policy self_read on driver_documents for select using (driver_id = auth.uid());
-- Vairuotojas mato tik jam priskirtas keliones ir sutartis
create policy driver_read on trips for select using (driver_id = auth.uid());
create policy driver_read on subscriptions for select using (driver_id = auth.uid());
-- Visi rašymai daromi serveryje (service role) po teisių patikrinimo
