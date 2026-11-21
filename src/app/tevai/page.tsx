import { Ico } from "@/components/ico";
import Link from "next/link";
import { requireProfile, loadSettings } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { driverCards, firstName, initials } from "@/lib/client-view";
import { planState } from "@/lib/client-plan";
import { PLAN_NAMES, type PlanId } from "@/lib/settings";
import { eur, fmtWhen } from "@/lib/time";
import { AutoRefresh } from "@/components/auto-refresh";
import { Avatar, StatusPill } from "@/components/client-ui";
import { isLive } from "@/lib/live";

const monthEnd = () => { const d = new Date(); d.setUTCMonth(d.getUTCMonth() + 1, 0); return d.toISOString().slice(0, 10); };

// Pagrindinis (kaip makete): pasisveikinimas, plano kortelė, 3 greiti veiksmai, artimiausios kelionės, skaičiuoklės kvietimas
export default async function Page() {
  const [me, sb, s] = await Promise.all([requireProfile(), supabaseServer(), loadSettings()]);
  const now = new Date();
  const [{ data: trips }, { data: subs }, { data: kids }, st] = await Promise.all([
    sb.from("trips").select("id, pickup_at, status, from_label, to_label, driver_id, child:children(first_name)")
      .gte("pickup_at", new Date(now.getTime() - 3 * 36e5).toISOString()).lte("pickup_at", new Date(now.getTime() + 14 * 864e5).toISOString())
      .in("status", ["scheduled", "picked_up"]).order("pickup_at"),
    sb.from("subscriptions").select("id, status, weekdays").in("status", ["pending", "active"]),
    sb.from("child_guardians").select("child_id").eq("profile_id", me.id),
    planState(me.id),
  ]);
  const list = trips ?? [];
  const live = list.find((t) => t.status === "picked_up") ?? list.find((t) => isLive(t));
  const next = list.filter((t) => t.id !== live?.id && new Date(t.pickup_at) > now).slice(0, 3);
  const drivers = await driverCards([live?.driver_id, ...next.map((t) => t.driver_id)]);
  const active = (subs ?? []).filter((x) => x.status === "active");
  const perWeek = active.reduce((a, x) => a + (x.weekdays?.length ?? 0), 0);
  const plan = st?.plan_id ? PLAN_NAMES[st.plan_id as PlanId] : null;
  const card = plan ? [`${plan} planas`, `Galioja iki ${monthEnd()}`, "/tevai/abonementas"]
    : active.length ? ["Abonementas galioja", `${perWeek} kel. per savaitę`, "/tevai/abonementas"]
    : (subs ?? []).length ? ["Abonementas laukia patvirtinimo", "Netrukus patvirtinsime", "/tevai/abonementas"]
    : ["Pasirinkite planą", `Kredito planai nuo ${eur(s.plan_basic_price)} / mėn.`, "/tevai/planas"];

  return (
    <>
      {live && <AutoRefresh />}
      <div className="flex items-start justify-between gap-3 pt-1">
        <h1 className="text-3xl font-bold leading-tight">Sveiki,<br />{firstName(me.full_name) || "sveiki"}</h1>
        <Link href="/tevai/pranesimai" aria-label="Pranešimai" className="grid h-11 w-11 place-items-center rounded-full bg-[var(--surface)] text-[var(--navy)] shadow-sm"><Ico n="bell" /></Link>
      </div>

      <Link href={card[2]} className="navy flex items-center gap-3 rounded-[20px] p-4 shadow-lg">
        <span aria-hidden="true" className="grid h-11 w-11 flex-none place-items-center rounded-full bg-[#2fb36b] text-white"><Ico n="check" stroke={2.6} /></span>
        <span className="grid flex-1"><b className="text-lg">{card[0]}</b><span className="text-sm opacity-80">{card[1]}</span></span>
        <span aria-hidden="true" className="text-2xl opacity-80">›</span>
      </Link>

      <nav aria-label="Greiti veiksmai" className="grid grid-cols-3 gap-2">
        {[["/tevai/grafikas?d=savaite", "calendar", "Tvarkaraštis"], ["/tevai/skaiciuokle", "calc", "Skaičiuoklė"], ["/tevai/saugumas", "shield", "Saugumas"]].map(([h, i, l]) => (
          <Link key={h} href={h} className="icon-tile"><span><Ico n={i} size={26} /></span>{l}</Link>
        ))}
      </nav>

      {live && (
        <Link href={`/tevai/kelione/${live.id}`} className="card gap-1 border-2 !border-[var(--accent)]">
          <div className="flex items-center justify-between gap-2"><b className="text-lg">{live.status === "picked_up" ? "Kelionė vyksta" : "Vairuotojas netrukus atvyks"}</b><StatusPill s={live.status} /></div>
          <span>{(live.child as unknown as { first_name: string } | null)?.first_name}: {live.from_label} → {live.to_label}</span>
          <span className="font-semibold text-[var(--navy)]">Stebėti gyvai →</span>
        </Link>
      )}

      {!kids?.length && <div className="card muted">Dar nėra keleivių. Pridėkite juos skiltyje <Link href="/tevai/vaikai" className="underline">„Šeimos nariai“</Link>.</div>}

      <section className="grid gap-3" aria-labelledby="artimiausios">
        <div className="flex items-center justify-between"><h2 id="artimiausios" className="text-lg font-bold">Artimiausios kelionės</h2><Link href="/tevai/uzsakyti" className="text-sm font-bold text-[var(--navy)]">+ Nauja</Link></div>
        {next.length === 0 && <div className="card muted">Artimiausias dvi savaites kelionių nėra.</div>}
        {next.map((t) => {
          const d = t.driver_id ? drivers.get(t.driver_id) : undefined;
          return (
            <Link key={t.id} href={`/tevai/kelione/${t.id}`} className="card gap-2">
              <div className="flex items-center justify-between gap-2"><b className="text-lg">{fmtWhen(t.pickup_at)}</b><span className="rounded-full bg-[var(--ok-bg)] px-2.5 py-0.5 text-xs font-bold text-[var(--ok)]">Planuota</span></div>
              <span className="flex items-center gap-1.5"><Ico n="pin" size={18} className="flex-none text-[var(--navy)]" />{t.from_label} → {t.to_label}</span>
              <div className="flex items-center gap-2 border-t border-[var(--line)] pt-2 text-sm">
                {d ? <><Avatar text={initials(d.name)} size={28} /><span>Vairuotojas: {firstName(d.name)}</span></> : <span className="muted">Vairuotojas bus priskirtas</span>}
                <span className="ml-auto muted">{(t.child as unknown as { first_name: string } | null)?.first_name}</span>
              </div>
            </Link>
          );
        })}
        <Link href="/tevai/grafikas?d=savaite" className="btn btn-lg rounded-full border-0 bg-[var(--soft-blue)] text-[var(--navy)]">Peržiūrėti grafiką →</Link>
      </section>

      <Link href="/tevai/skaiciuokle" className="card grid-cols-[auto_1fr_auto] items-center gap-3">
        <span aria-hidden="true" className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--soft-blue)] text-[var(--navy)]"><Ico n="calc" size={24} /></span>
        <span className="grid"><b>Ar apsimoka abonementas?</b><span className="text-sm muted">Sužinokite per 1 minutę!</span></span>
        <span aria-hidden="true" className="text-2xl muted">›</span>
      </Link>
    </>
  );
}
