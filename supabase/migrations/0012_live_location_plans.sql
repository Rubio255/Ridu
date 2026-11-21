-- Gyva vairuotojo vieta kelionės metu, kelionės bendrinimas ir kliento plano prašymas.

-- Tik paskutinė vieta kiekvienai vykstančiai kelionei; ištrinama kelionei pasibaigus.
create table if not exists trip_locations (
  trip_id uuid primary key references trips(id) on delete cascade,
  driver_id uuid not null references profiles(id) on delete cascade,
  lat double precision not null,
  lng double precision not null,
  accuracy real,
  heading real,
  speed real,
  updated_at timestamptz not null default now()
);
-- Skaitoma ir rašoma tik serveryje (service role), patikrinus teises
alter table trip_locations enable row level security;

-- Nuoroda „Dalintis kelione“: galioja iki nurodyto laiko
alter table trips add column if not exists share_token text unique;
alter table trips add column if not exists share_expires_at timestamptz;

-- Klientas pasirenka planą, savininkas patvirtina
alter table profiles add column if not exists plan_request text check (plan_request in ('basic', 'family', 'premium'));
