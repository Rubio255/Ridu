-- Vaikų pavežėjimas: schema (ilgalaikiai užsakymai, kelionės, nustatymai)

create type user_role as enum ('owner', 'client');
create type place_kind as enum ('home', 'kindergarten', 'school', 'activity', 'other');
create type sub_status as enum ('pending', 'active', 'rejected', 'ended');
create type sub_period as enum ('am', 'pm');
create type trip_status as enum ('scheduled', 'picked_up', 'delivered', 'cancelled', 'no_show');

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text not null default '',
  phone text,
  email text,
  role user_role not null default 'client',
  contract_no text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table children (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  birth_year int,
  seat text not null default 'Kėdutė',
  notes text,
  created_at timestamptz not null default now()
);

create table child_guardians (
  child_id uuid not null references children on delete cascade,
  profile_id uuid not null references profiles on delete cascade,
  relation text,
  primary key (child_id, profile_id)
);

create table places (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles on delete cascade,
  label text not null,
  kind place_kind not null default 'other',
  address text not null,
  lat double precision,
  lng double precision,
  created_at timestamptz not null default now()
);

-- Visi kainodaros ir grafiko parametrai (keičia savininkas). Struktūra: src/lib/settings.ts
create table settings (
  id int primary key default 1 check (id = 1),
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
insert into settings (id) values (1);

create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references children on delete cascade,
  payer_id uuid not null references profiles,
  from_place_id uuid not null references places,
  to_place_id uuid not null references places,
  weekdays int[] not null,              -- 1 = pirmadienis ... 5 = penktadienis
  period sub_period not null,
  pickup_time time not null,            -- rytiniam maršrutui nustato savininkas
  extra_kids int not null default 0,    -- broliai/seserys toje pačioje kelionėje
  months int not null default 1,        -- įsipareigojimas: 1, 3 arba 9
  km numeric(6,1) not null,
  drive_min int not null,
  per_trip_eur numeric(8,2) not null,
  monthly_eur numeric(8,2) not null,
  is_bid boolean not null default false,
  status sub_status not null default 'pending',
  starts_on date not null default current_date,
  ends_on date,
  owner_note text,
  created_at timestamptz not null default now()
);
create index subscriptions_status_idx on subscriptions (status);

create table trips (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid references subscriptions on delete cascade,
  child_id uuid not null references children on delete cascade,
  payer_id uuid not null references profiles,
  from_label text not null,
  to_label text not null,
  from_address text not null,
  to_address text not null,
  pickup_at timestamptz not null,
  block_min int not null,               -- kiek laiko užima automobilį
  price_eur numeric(8,2) not null,
  status trip_status not null default 'scheduled',
  cancel_fee_pct int not null default 0,
  created_at timestamptz not null default now(),
  unique (subscription_id, pickup_at)
);
create index trips_pickup_idx on trips (pickup_at);

-- Pagalbinės funkcijos RLS taisyklėms
create function is_owner() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'owner');
$$;
create function is_guardian(c uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from child_guardians where child_id = c and profile_id = auth.uid());
$$;

alter table profiles enable row level security;
alter table children enable row level security;
alter table child_guardians enable row level security;
alter table places enable row level security;
alter table settings enable row level security;
alter table subscriptions enable row level security;
alter table trips enable row level security;

-- Savininkas mato viską. Visi rašymai daromi serveryje (service role), todėl klientams tik skaitymas.
create policy owner_read on profiles for select using (is_owner());
create policy owner_read on children for select using (is_owner());
create policy owner_read on child_guardians for select using (is_owner());
create policy owner_read on places for select using (is_owner());
create policy owner_read on settings for select using (is_owner());
create policy owner_read on subscriptions for select using (is_owner());
create policy owner_read on trips for select using (is_owner());

create policy self_read on profiles for select using (id = auth.uid());
create policy guardian_read on children for select using (is_guardian(id));
create policy guardian_read on child_guardians for select using (profile_id = auth.uid());
-- Tėvai mato savo ir kito vaiko globėjo adresus (bendri vaikai)
create policy guardian_read on places for select using (
  profile_id = auth.uid() or exists (
    select 1 from child_guardians a join child_guardians b on a.child_id = b.child_id
    where a.profile_id = auth.uid() and b.profile_id = places.profile_id));
create policy guardian_read on subscriptions for select using (is_guardian(child_id));
create policy guardian_read on trips for select using (is_guardian(child_id));
-- settings klientams neatiduodami: kainas skaičiuoja serveris

-- Naujam prisijungusiam naudotojui sukuriamas profilis
create function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();
