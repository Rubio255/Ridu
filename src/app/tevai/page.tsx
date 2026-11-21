import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { driverCards, firstName, initials } from "@/lib/client-view";
import { dayKey, fmtDay, fmtTime } from "@/lib/time";
import { TripSteps } from "@/components/trip-steps";
import { AutoRefresh } from "@/components/auto-refresh";
import { Avatar, QuickLink, StatusPill, TripRow, type TripLite } from "@/components/client-ui";

// Pagrindinis: abonementas, greiti veiksmai, svarbiausia kelionė ir artimiausios kelionės
export default async function Page() {
  const [me, sb] = await Promise.all([requireProfile(), supabaseServer()]);
  const now = new Date();
  const [{ data: trips }, { data: subs }, { data: kids }] = await Promise.all([
    sb.from("trips").select("id, pickup_at, status, from_label, to_label, price_eur, child_id, driver_id, picked_up_at, delivered_at, child:children(first_name, passenger_type, code_word)")
      .gte("pickup_at", new Date(now.getTime() - 12 * 36e5).toISOString()).lte("pickup_at", new Date(now.getTime() + 14 * 864e5).toISOString()).neq("status", "cancelled").order("pickup_at"),
    sb.from("subscriptions").select("id, status, weekdays, child:children(first_name)").in("status", ["pending", "active"]),
    sb.from("child_guardians").select("child_id").eq("profile_id", me.id),
  ]);
  const live = trips ?? [];
  // Svarbiausia kelionė: vykstanti, artimiausia arba šiandien baigta
  const focus = live.find((t) => t.status === "picked_up")
    ?? live.find((t) => t.status === "scheduled" && new Date(t.pickup_at).getTime() > now.getTime() - 36e5)
    ?? [...live].reverse().find((t) => t.status === "delivered" && dayKey(t.pickup_at) === dayKey(now));
  const drivers = await driverCards([focus?.driver_id]);
  const d = focus?.driver_id ? drivers.get(focus.driver_id) : undefined;
  const next = live.filter((t) => t.id !== focus?.id && t.status === "scheduled" && new Date(t.pickup_at) > now).slice(0, 4);
  const active = (subs ?? []).filter((x) => x.status === "active");
  const perWeek = active.reduce((a, x) => a + (x.weekdays?.length ?? 0), 0);
  const soon = focus && focus.status !== "delivered" && Math.abs(new Date(focus.pickup_at).getTime() - now.getTime()) < 3 * 36e5;
  const child = focus?.child as unknown as { first_name: string; passenger_type: string; code_word: string | null } | undefined;

  return (
    <>
      <div className="grid gap-0.5">
        <p className="muted">Laba diena,</p>
        <h1 className="text-2xl font-bold">{firstName(me.full_name) || "Sveiki"} 👋</h1>
      </div>

      {/* Abonemento juosta */}
      <Link href="/tevai/abonementas" className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-[18px] bg-[var(--brand)] p-4 text-[var(--brand-fg)]">
        <div className="grid gap-0.5">
          <span className="text-sm opacity-80">{active.length ? "Abonementas galioja" : (subs ?? []).length ? "Abonementas laukia patvirtinimo" : "Abonemento dar nėra"}</span>
          <b className="text-lg">{active.length ? `${perWeek} kelionės per savaitę` : (subs ?? []).length ? "Vairuotojas netrukus patvirtins" : "Užsisakykite pastovų grafiką"}</b>
        </div>
        <span className="rounded-full bg-[var(--accent)] px-3 py-1.5 text-sm font-bold text-[var(--accent-fg)]">{active.length ? "Peržiūrėti" : "Plačiau"}</span>
      </Link>

      <nav aria-label="Greiti veiksmai" className="grid grid-cols-3 gap-3">
        <QuickLink href="/tevai/grafikas" label="Grafikas" icon="🗓️" />
        <QuickLink href="/tevai/pradzia#skaiciuokle" label="Skaičiuoklė" icon="⏱️" />
        <QuickLink href="/tevai/pradzia#saugumas" label="Saugumas" icon="🛡️" />
      </nav>

      {!kids?.length && <div className="card muted">Dar nėra keleivių. Pridėkite save ar kitą suaugusįjį skiltyje „Šeimos nariai“. Vaikus įrašo MB pagal sutartį.</div>}

      {focus ? (
        <section className="card gap-4" aria-labelledby="dabar">
          {soon && <AutoRefresh />}
          <div className="flex items-center justify-between gap-2">
            <h2 id="dabar" className="text-lg font-bold">{focus.status === "picked_up" ? "Kelionė vyksta" : focus.status === "delivered" ? "Šiandien nuvežta" : "Artimiausia kelionė"}</h2>
            <StatusPill s={focus.status} />
          </div>
          <div className="text-sm muted">{fmtDay(focus.pickup_at)} · {fmtTime(focus.pickup_at)}</div>
          <div className="text-lg"><b>{child?.first_name}</b> · {focus.from_label} → {focus.to_label}</div>
          <TripSteps t={focus} />
          {d && (
            <div className="flex items-center gap-3 rounded-2xl bg-[var(--surface-2)] p-3">
              <Avatar text={initials(d.name)} />
              <div className="grid min-w-0"><b className="truncate">{d.name}</b><span className="truncate text-sm muted">{[d.car, d.plate].filter(Boolean).join(" · ")}</span></div>
            </div>
          )}
          {child?.passenger_type === "child" && focus.status === "scheduled" && !child.code_word && (
            <Link href="/tevai/vaikai#slaptas-zodis" className="rounded-xl bg-[var(--accent-soft)] p-3 text-sm font-semibold">Sukurkite slaptą žodį vaikui →</Link>)}
          <Link href={`/tevai/kelione/${focus.id}`} className="btn btn-brand btn-lg">Atidaryti kelionę</Link>
        </section>
      ) : (
        <section className="card gap-4 border-2 border-dashed" aria-labelledby="pavyzdys">
          <div className="flex items-center justify-between gap-2">
            <h2 id="pavyzdys" className="text-lg font-bold">Taip matysite kelionę</h2>
            <span className="pill p-info">Pavyzdys</span>
          </div>
          <div className="text-lg"><b>Ema</b> · Mokykla → Baseinas</div>
          <TripSteps t={{ status: "picked_up", pickup_at: new Date(now.getTime() - 6 * 6e4).toISOString(), picked_up_at: new Date(now.getTime() - 6 * 6e4).toISOString(), from_label: "Mokykla", to_label: "Baseinas" }} />
          <p className="text-sm muted">Kai keleivis bus paimtas ir nuvežtas, gausite pranešimą į telefoną.</p>
        </section>
      )}

      <Link href="/tevai/uzsakyti" className="btn btn-primary btn-lg">+ Nauja kelionė</Link>

      <section className="card" aria-labelledby="artimiausios">
        <div className="flex items-baseline justify-between gap-2">
          <h2 id="artimiausios" className="font-bold">Artimiausios kelionės</h2>
          <Link href="/tevai/grafikas" className="text-sm font-semibold text-[var(--brand)]">Visos</Link>
        </div>
        {next.length === 0 && <p className="text-sm muted">Artimiausias dvi savaites kitų kelionių nėra.</p>}
        {next.map((t) => <TripRow key={t.id} t={t as unknown as TripLite} day />)}
      </section>
    </>
  );
}
