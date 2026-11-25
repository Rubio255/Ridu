-- Mokami planai per Stripe prenumeratas. Kortelių duomenys saugomi tik Stripe; čia – tik ID, planas ir būsena.
alter table profiles add column stripe_customer_id text unique;

create table plan_subscriptions (
  stripe_subscription_id text primary key,
  profile_id uuid not null references profiles on delete cascade,
  plan text not null check (plan in ('plus', 'pro')),
  role text not null check (role in ('client', 'driver')),
  status text not null,                    -- Stripe būsena: active, trialing, past_due, canceled, unpaid, incomplete...
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  started_at timestamptz not null,         -- užsakymo data (14 d. atsisakymo terminui)
  immediate_start_consent boolean not null default false, -- klientas paprašė, kad planas veiktų iš karto
  withdrawn_at timestamptz,
  updated_at timestamptz not null default now()
);
create index plan_subscriptions_profile_idx on plan_subscriptions (profile_id, updated_at desc);

-- Apdoroti Stripe įvykiai (kad pakartotinis webhook nebūtų apdorotas dukart)
create table billing_events (
  id text primary key,
  type text not null,
  created_at timestamptz not null default now()
);

alter table plan_subscriptions enable row level security;
alter table billing_events enable row level security;
create policy owner_read on plan_subscriptions for select using ((select private.is_owner()));
create policy self_read on plan_subscriptions for select using (profile_id = (select auth.uid()));
create policy owner_read on billing_events for select using ((select private.is_owner()));
create policy mfa_required on plan_subscriptions as restrictive for all to authenticated using ((select private.mfa_ok())) with check ((select private.mfa_ok()));
-- Rašo tik serveris (service role): Stripe webhook ir atsisakymo veiksmas
