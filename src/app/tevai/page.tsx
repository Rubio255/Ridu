import Link from "next/link";
import { requireProfile, loadSettings } from "@/lib/auth";
import { supabaseServer, supabaseAdmin } from "@/lib/supabase/server";
import { cancelTrip, requestSubscriptionChange } from "@/app/actions";
import { Pill } from "@/components/shell";
import { cancelFeePct } from "@/lib/pricing";
import { DAYS, dayKey, eur, fmtDay, fmtTime } from "@/lib/time";
import { TripSteps } from "@/components/trip-steps";
import { AutoRefresh } from "@/components/auto-refresh";

export default async function Page() {
  const [me, s, sb] = await Promise.all([requireProfile(), loadSettings(), supabaseServer()]);
  const now = new Date();
  const until = new Date(Date.now() + 14 * 864e5);
  const [{ data: trips }, { data: subs }, { data: kids }] = await Promise.all([
    sb.from("trips").select("*, child:children(first_name, passenger_type, code_word)").gte("pickup_at", new Date(now.getTime() - 12 * 36e5).toISOString()).lte("pickup_at", until.toISOString()).order("pickup_at"),
    sb.from("subscriptions").select("*, child:children(first_name), from:places!subscriptions_from_place_id_fkey(label), to:places!subscriptions_to_place_id_fkey(label)").in("status", ["pending", "active"]).order("created_at"),
    sb.from("child_guardians").select("child_id, relation").eq("profile_id", me.id),
  ]);
  // Artimasis tik stebi: atšaukti ir keisti gali tik globėjai
  const canEdit = (childId: string) => (kids ?? []).some((k) => k.child_id === childId && k.relation !== "artimasis");
  // Priskirtas vairuotojas ir automobilis (tik vardas, automobilis ir valst. nr.)
  const dids = [...new Set((trips ?? []).map((t) => t.driver_id).filter(Boolean))];
  const live = (trips ?? []).filter((t) => t.status !== "cancelled");
  // Svarbiausia kelionė viršuje: vykstanti, kita artimiausia arba ką tik baigta
  const focus = live.find((t) => t.status === "picked_up")
    ?? live.find((t) => t.status === "scheduled" && new Date(t.pickup_at).getTime() > now.getTime() - 36e5)
    ?? [...live].reverse().find((t) => t.status === "delivered" && dayKey(t.pickup_at) === dayKey(now.toISOString()));
  // Vairuotojai ir tie, kas gauna pranešimus (abu tėvai, artimieji), įkeliami kartu
  const [{ data: drv }, { data: watchers }] = await Promise.all([
    dids.length ? supabaseAdmin().from("drivers").select("profile_id, car, plate, profile:profiles(full_name)").in("profile_id", dids) : Promise.resolve({ data: [] as { profile_id: string; car: string | null; plate: string | null; profile: unknown }[] }),
    focus ? supabaseAdmin().from("child_guardians").select("profile:profiles(full_name)").eq("child_id", focus.child_id) : Promise.resolve({ data: [] as { profile: unknown }[] }),
  ]);
  const driverLine = (id: string | null) => { const d = (drv ?? []).find((x) => x.profile_id === id); if (!d) return null; const p = d.profile as unknown as { full_name: string };
    return `Vairuotojas ${p.full_name}${d.car ? ` · ${d.car}` : ""}${d.plate ? ` · ${d.plate}` : ""}`; };
  const soon = focus && focus.status !== "delivered" && Math.abs(new Date(focus.pickup_at).getTime() - now.getTime()) < 3 * 36e5;
  const watcherNames = (watchers ?? []).map((w) => (w.profile as unknown as { full_name: string } | null)?.full_name?.split(" ")[0]).filter(Boolean);
  const rest = (trips ?? []).filter((t) => t.id !== focus?.id && !(t.status !== "scheduled" && new Date(t.pickup_at) < now));
  const byDay = new Map<string, typeof trips>();
  rest.forEach((t) => { const k = dayKey(t.pickup_at); byDay.set(k, [...(byDay.get(k) ?? []), t]); });

  return (
    <>
      <h1 className="text-2xl font-bold">Sveiki{me.full_name ? `, ${me.full_name.split(" ")[0]}` : ""}</h1>
      {!kids?.length && <div className="card muted">Dar nėra keleivių. Pridėkite save ar kitą suaugusįjį skiltyje „Keleiviai ir adresai“. Vaikus įrašo MB pagal sutartį.</div>}

      {focus && (
        <section className="card gap-4 border-2 border-[var(--brand)]" aria-labelledby="dabar">
          {soon && <AutoRefresh />}
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="dabar" className="text-xl font-bold">{focus.status === "picked_up" ? "Dabar kelyje" : focus.status === "delivered" ? "Šiandien nuvežta" : "Artimiausia kelionė"}</h2>
            <span className="text-sm muted">{fmtDay(focus.pickup_at)}</span>
          </div>
          <div className="text-lg"><b>{focus.child.first_name}</b> · {focus.from_label} → {focus.to_label}</div>
          <TripSteps t={focus} />
          {driverLine(focus.driver_id) && <div className="muted">{driverLine(focus.driver_id)}</div>}
          {focus.child.passenger_type === "child" && focus.status === "scheduled" && (focus.child.code_word
            ? <div className="rounded-lg bg-[var(--surface-2)] p-3 text-sm">Vairuotojas pasakys vaikui jūsų slaptą žodį. Priminkite vaikui, kad sėstų tik išgirdęs jį.</div>
            : <Link href="/tevai/vaikai#slaptas-zodis" className="rounded-lg bg-[var(--surface-2)] p-3 text-sm font-semibold">Sukurkite slaptą žodį vaikui →</Link>)}
          {watcherNames.length > 0 && <div className="text-sm muted">Pranešimus gauna: {watcherNames.join(", ")}</div>}
          {focus.status === "scheduled" && new Date(focus.pickup_at) > now && canEdit(focus.child_id) && (() => { const fee = cancelFeePct(s, (new Date(focus.pickup_at).getTime() - now.getTime()) / 36e5); return (
            <form action={cancelTrip}><input type="hidden" name="id" value={focus.id} /><button className="btn">Atšaukti šią kelionę{fee ? ` (mokestis ${fee}%)` : ""}</button></form>); })()}
        </section>
      )}

      <Link href="/tevai/uzsakyti" className="btn btn-primary py-4 text-center text-lg">+ Nauja kelionė</Link>


      {[...byDay.entries()].map(([day, list]) => (
        <section key={day} className="card">
          <h3 className="text-sm font-bold uppercase tracking-wide muted">{fmtDay(list![0].pickup_at)}</h3>
          {list!.map((t) => {
            const hours = (new Date(t.pickup_at).getTime() - now.getTime()) / 36e5;
            const fee = cancelFeePct(s, hours);
            return (
              <div key={t.id} className="grid grid-cols-[56px_1fr] gap-3 border-t border-[var(--line)] pt-3 first:border-0 first:pt-0">
                <div className="num text-xl font-bold">{fmtTime(t.pickup_at)}</div>
                <div className="grid min-w-0 gap-1">
                  <div className="flex flex-wrap items-center justify-between gap-2"><span className="flex items-center gap-2"><b>{t.child.first_name}</b><Pill s={t.status} /></span><span className="num font-bold">{eur(t.price_eur)}</span></div>
                  <div className="break-words font-semibold">{t.from_label} <span className="muted font-normal">→</span> {t.to_label}</div>
                  {t.status_note && <div className="text-sm font-semibold">{t.status_note}</div>}
                  {t.status !== "cancelled" && driverLine(t.driver_id) && <div className="text-sm muted">{driverLine(t.driver_id)}</div>}
                  {t.status === "scheduled" && hours > 0 && canEdit(t.child_id) && (
                    <form action={cancelTrip}><input type="hidden" name="id" value={t.id} /><button className="btn">Atšaukti šią kelionę{fee ? ` (mokestis ${fee}%)` : ""}</button></form>
                  )}
                </div>
              </div>
            );
          })}
        </section>
      ))}
      {byDay.size > 0 && <h2 className="text-lg font-bold">Kitos kelionės</h2>}
      {byDay.size === 0 && !focus && <div className="card muted">Artimiausias dvi savaites kelionių nėra.</div>}
      <section className="card">
        <h2 className="font-bold">Mano abonementai</h2>
        {(subs ?? []).length === 0 && <p className="muted text-sm">Užsakymų dar nėra.</p>}
        {(subs ?? []).map((x) => (
          <div key={x.id} className="grid gap-1 border-t border-[var(--line)] pt-3 first:border-0 first:pt-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <b>{x.child.first_name} · {x.weekdays.map((w: number) => DAYS[w - 1]).join(", ")} · {x.period === "am" ? "rytinis maršrutas" : String(x.pickup_time).slice(0, 5)}</b>
              <Pill s={x.status} />
            </div>
            <div className="text-sm muted">{x.from.label} → {x.to.label}</div>
            <div className="text-sm">{eur(x.monthly_eur)} / mėn.{x.months > 1 ? ` · ${x.months} mėn.` : ""}{x.is_bid ? " · jūsų pasiūlymas" : ""}{x.payer_id !== me.id ? " · užsakė kitas globėjas" : ""}</div>
            {x.status === "active" && x.period === "pm" && canEdit(x.child_id) && (
              <form action={requestSubscriptionChange} className="flex flex-wrap items-end gap-2">
                <input type="hidden" name="id" value={x.id} />
                <label className="grid gap-1 text-xs font-semibold muted">Norimas naujas laikas<input type="time" name="pickup_time" className="input" min={s.afternoon_start} max={s.afternoon_end} defaultValue={String(x.pickup_time).slice(0, 5)} /></label>
                <button className="btn">Prašyti pakeisti</button>
              </form>
            )}
            {x.owner_note && <div className="text-sm muted">{x.owner_note}. Laukia vairuotojo atsakymo.</div>}
          </div>
        ))}
      </section>
    </>
  );
}
