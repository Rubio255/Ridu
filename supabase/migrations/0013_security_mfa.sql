-- Saugumas: dviejų žingsnių patvirtinimas (MFA) ir pagalbinės funkcijos ne viešoje schemoje.

-- 1. is_* funkcijos perkeliamos į neviešą schemą „private“: RLS taisyklės jas toliau naudoja
--    (taisyklės funkciją nurodo pagal OID, todėl jų keisti nereikia), bet per /rest/v1/rpc jų kviesti nebegalima.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;
alter function public.is_owner() set schema private;
alter function public.is_driver() set schema private;
alter function public.is_guardian(uuid) set schema private;

-- 2. Ar naudotojui galima skaityti duomenis šiame prisijungimo lygyje.
--    MB savininkas ir vairuotojai privalo būti patvirtinę antrą žingsnį (aal2).
--    Klientas, kuris pats įsijungė MFA, taip pat turi būti patvirtinęs antrą žingsnį.
create or replace function private.mfa_ok() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
    or (
      not exists (select 1 from auth.mfa_factors f where f.user_id = auth.uid() and f.status = 'verified')
      and not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('owner', 'driver'))
    );
$$;
revoke all on function private.mfa_ok() from public, anon;
grant execute on function private.mfa_ok() to authenticated;

-- 3. Ribojanti taisyklė visoms lentelėms: be antro žingsnio darbuotojai ir MFA įsijungę klientai nemato nieko.
do $$
declare t text;
begin
  for t in select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
           where n.nspname = 'public' and c.relkind = 'r' loop
    execute format('drop policy if exists mfa_required on public.%I', t);
    execute format('create policy mfa_required on public.%I as restrictive for all to authenticated using ((select private.mfa_ok())) with check ((select private.mfa_ok()))', t);
  end loop;
end $$;

-- 4. Serveriui: profilis ir ar įjungtas MFA, viena užklausa. Kviesti gali tik serveris (service_role).
create or replace function public.auth_profile(uid uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select to_jsonb(p) || jsonb_build_object('has_mfa', exists (
    select 1 from auth.mfa_factors f where f.user_id = uid and f.status = 'verified'))
  from public.profiles p where p.id = uid;
$$;
revoke all on function public.auth_profile(uuid) from public, anon, authenticated;
grant execute on function public.auth_profile(uuid) to service_role;

-- 5. Apsauga nuo pažintinių pokalbių užklausų šlamšto (skaičiuojama serveryje)
create index if not exists visit_requests_created_idx on public.visit_requests (created_at);

-- 6. Savo profilį naudotojas mato ir prieš antrą žingsnį (reikia nukreipimui į MFA puslapį)
alter policy mfa_required on public.profiles using ((select private.mfa_ok()) or id = (select auth.uid())) with check ((select private.mfa_ok()));
