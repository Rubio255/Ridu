-- Vaikų pavežėjimo užsakymų sistema: pradinė schema

create type user_role as enum ('owner', 'client');
create type place_kind as enum ('home', 'kindergarten', 'school', 'activity', 'other');
create type trip_status as enum ('requested', 'confirmed', 'rejected', 'cancelled', 'picked_up', 'delivered');

-- Naudotojų profiliai (vienas savininkas, kiti klientai su sutartimi)
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text not null default '',
  phone text,
  role user_role not null default 'client',
  contract_no text,             -- sutarties numeris
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table children (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  birth_year int,
  needs_booster boolean not null default true,  -- kėdutė / paaukštinimas
  notes text,                                     -- alergijos, kas gali perduoti/pasiimti
  created_at timestamptz not null default now()
);

-- Vienas vaikas gali turėti kelis globėjus (pvz. abu išsiskyrę tėvai)
create table child_guardians (
  child_id uuid not null references children on delete cascade,
  profile_id uuid not null references profiles on delete cascade,
  relation text,                -- mama, tėtis, globėjas
  can_book boolean not null default true,
  primary key (child_id, profile_id)
);

create table places (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles on delete cascade,
  label text not null,          -- "Namai", "Lopšelis Saulutė", "Krepšinis"
  kind place_kind not null default 'other',
  address text not null,
  lat double precision,
  lng double precision,
  created_at timestamptz not null default now()
);

-- Kainodara: viena eilutė, keičiama savininko nustatymuose
create table pricing_settings (
  id int primary key default 1 check (id = 1),
  base_fee numeric(8,2) not null default 5.00,         -- paėmimo mokestis, €
  per_km numeric(8,2) not null default 0.90,           -- €/km su vaiku
  min_price numeric(8,2) not null default 10.00,       -- minimali kelionės kaina
  included_wait_min int not null default 5,            -- nemokamas laukimas, min
  per_wait_min numeric(8,2) not null default 0.30,     -- € už papildomą laukimo minutę
  extra_child_fee numeric(8,2) not null default 3.00,  -- už kiekvieną papildomą vaiką
  peak_surcharge_pct numeric(5,2) not null default 0,  -- piko valandų priemoka, %
  cancel_free_hours int not null default 12,           -- nemokamas atšaukimas iki X val.
  late_cancel_pct numeric(5,2) not null default 50,    -- vėlyvo atšaukimo mokestis, %
  monthly_net_target numeric(10,2) not null default 3000,
  updated_at timestamptz not null default now()
);
insert into pricing_settings (id) values (1);

-- Pasikartojančios kelionės (pvz. kas antradienį ir ketvirtadienį 15:30)
create table trip_series (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references children on delete cascade,
  from_place_id uuid not null references places,
  to_place_id uuid not null references places,
  weekdays int[] not null,      -- 1 = pirmadienis ... 7 = sekmadienis
  pickup_time time not null,
  start_date date not null,
  end_date date,
  ordered_by uuid not null references profiles,
  payer_id uuid not null references profiles,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table trips (
  id uuid primary key default gen_random_uuid(),
  series_id uuid references trip_series on delete set null,
  child_id uuid not null references children on delete cascade,
  extra_children int not null default 0,
  from_place_id uuid references places on delete set null,
  to_place_id uuid references places on delete set null,
  from_address text not null,   -- adresų kopija, kad istorija nesikeistų
  to_address text not null,
  pickup_at timestamptz not null,
  est_km numeric(6,1) not null,
  est_minutes int not null,
  price_eur numeric(8,2) not null,
  ordered_by uuid not null references profiles,
  payer_id uuid not null references profiles,
  status trip_status not null default 'requested',
  client_note text,
  owner_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index trips_pickup_idx on trips (pickup_at);
create index trips_child_idx on trips (child_id);
create index trips_payer_idx on trips (payer_id);

-- Pagalbinės funkcijos RLS taisyklėms
create function is_owner() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'owner');
$$;

create function is_guardian(c uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from child_guardians where child_id = c and profile_id = auth.uid());
$$;

create function can_book(c uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from child_guardians
                 where child_id = c and profile_id = auth.uid() and can_book);
$$;

alter table profiles enable row level security;
alter table children enable row level security;
alter table child_guardians enable row level security;
alter table places enable row level security;
alter table pricing_settings enable row level security;
alter table trip_series enable row level security;
alter table trips enable row level security;

-- Savininkas mato ir keičia viską
create policy owner_all on profiles for all using (is_owner()) with check (is_owner());
create policy owner_all on children for all using (is_owner()) with check (is_owner());
create policy owner_all on child_guardians for all using (is_owner()) with check (is_owner());
create policy owner_all on places for all using (is_owner()) with check (is_owner());
create policy owner_all on pricing_settings for all using (is_owner()) with check (is_owner());
create policy owner_all on trip_series for all using (is_owner()) with check (is_owner());
create policy owner_all on trips for all using (is_owner()) with check (is_owner());

-- Klientai: tik savo duomenys ir savo vaikai
create policy self_read on profiles for select using (id = auth.uid());
create policy self_update on profiles for update using (id = auth.uid())
  with check (id = auth.uid() and role = 'client');
create policy guardian_read on children for select using (is_guardian(id));
create policy guardian_read on child_guardians for select using (profile_id = auth.uid());
create policy own_places on places for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy clients_read on pricing_settings for select using (auth.uid() is not null);

create policy guardian_read on trip_series for select using (is_guardian(child_id));
create policy guardian_insert on trip_series for insert
  with check (can_book(child_id) and ordered_by = auth.uid());
create policy guardian_read on trips for select using (is_guardian(child_id));
-- Klientas gali tik pateikti užsakymą (statusas requested); kainą perskaičiuoja serveris
create policy guardian_insert on trips for insert
  with check (can_book(child_id) and ordered_by = auth.uid() and status = 'requested');
