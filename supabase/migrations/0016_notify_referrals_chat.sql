-- Pranešimų nustatymai, rekomendacijų programa ir pokalbių filtro žymos.

-- Kuriuos pranešimus naudotojas nori gauti (telefone ir naršyklėje). Numatyta: visi.
alter table profiles add column notify_prefs jsonb not null default '{"offers": true, "messages": true, "agreements": true, "trips": true}';

-- Rekomendacijos: kiekvienas naudotojas turi kodą; pakviestasis susiejamas registruojantis
alter table profiles add column referral_code text unique;
alter table profiles add column plus_until timestamptz;            -- nemokamas Plus iš rekomendacijų (pratęsiamas)
create table referrals (
  id uuid primary key default gen_random_uuid(),
  inviter_id uuid not null references profiles on delete cascade,
  invitee_id uuid not null unique references profiles on delete cascade, -- vienas žmogus pakviečiamas tik kartą
  status text not null default 'pending' check (status in ('pending', 'rewarded', 'rejected')),
  reject_reason text,
  created_at timestamptz not null default now(),
  rewarded_at timestamptz
);
create index referrals_inviter_idx on referrals (inviter_id, rewarded_at);

-- Pokalbių filtras: saugoma tik žyma ir laikas, ne žinutės tekstas
create table chat_flags (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references profiles on delete cascade,
  flags text[] not null,
  created_at timestamptz not null default now(),
  escalated boolean not null default false
);
create index chat_flags_sender_idx on chat_flags (sender_id, created_at desc);

alter table referrals enable row level security;
alter table chat_flags enable row level security;
create policy owner_read on referrals for select using ((select private.is_owner()));
create policy self_read on referrals for select using (inviter_id = (select auth.uid()) or invitee_id = (select auth.uid()));
create policy owner_read on chat_flags for select using ((select private.is_owner()));
create policy mfa_required on referrals as restrictive for all to authenticated using ((select private.mfa_ok())) with check ((select private.mfa_ok()));
create policy mfa_required on chat_flags as restrictive for all to authenticated using ((select private.mfa_ok())) with check ((select private.mfa_ok()));
-- Rašo tik serveris (service role)
