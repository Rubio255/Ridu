-- Vairuotojo nedarbingumas (liga, automobilio remontas). Paveiktos kelionės perduodamos kitam
-- vairuotojui, o jei pakaitos nėra, atšaukiamos be mokesčio ir kaina įskaitoma klientui.
create table driver_absences (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references drivers on delete cascade,
  reason text not null check (reason in ('sick', 'repair', 'other')),
  starts_on date not null,
  ends_on date not null check (ends_on >= starts_on),
  note text,
  created_at timestamptz not null default now()
);
create index driver_absences_idx on driver_absences (driver_id, starts_on, ends_on);
alter table driver_absences enable row level security;
create policy owner_read on driver_absences for select using (is_owner());
create policy self_read on driver_absences for select using (driver_id = auth.uid());

alter table trips add column credit_eur numeric not null default 0; -- įskaitoma į kliento sąskaitą
alter table trips add column status_note text;                      -- pvz. „Kelionę atliks kitas vairuotojas“
alter table drivers add column plate text; -- valstybinis numeris, rodomas klientams
