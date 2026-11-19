import Link from "next/link";
import { requireProfile, loadSettings } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { cancelTrip } from "@/app/actions";
import { Pill } from "@/components/shell";
import { cancelFeePct } from "@/lib/pricing";
import { DAYS, dayKey, eur, fmtDay, fmtTime } from "@/lib/time";

export default async function Page() {
  const me = await requireProfile();
  const sb = await supabaseServer();
  const s = await loadSettings();
  const now = new Date();
  const until = new Date(Date.now() + 14 * 864e5);
  const [{ data: trips }, { data: subs }, { data: kids }] = await Promise.all([
    sb.from("trips").select("*, child:children(first_name)").gte("pickup_at", new Date(now.getTime() - 12 * 36e5).toISOString()).lte("pickup_at", until.toISOString()).order("pickup_at"),
    sb.from("subscriptions").select("*, child:children(first_name), from:places!subscriptions_from_place_id_fkey(label), to:places!subscriptions_to_place_id_fkey(label)").in("status", ["pending", "active"]).order("created_at"),
    sb.from("child_guardians").select("child_id").eq("profile_id", me.id),
  ]);
  const byDay = new Map<string, typeof trips>();
  (trips ?? []).forEach((t) => { const k = dayKey(t.pickup_at); byDay.set(k, [...(byDay.get(k) ?? []), t]); });

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">Sveiki{me.full_name ? `, ${me.full_name.split(" ")[0]}` : ""}</h1>
        <Link href="/tevai/uzsakyti" className="btn btn-primary">+ Ilgalaikis užsakymas</Link>
      </div>
      {!kids?.length && <div className="card muted">Jūsų paskyroje dar nėra vaikų. Vairuotojas juos įrašys pagal sutartį.</div>}

      <section className="card">
        <h2 className="font-bold">Mano ilgalaikiai užsakymai</h2>
        {(subs ?? []).length === 0 && <p className="muted text-sm">Užsakymų dar nėra.</p>}
        {(subs ?? []).map((x) => (
          <div key={x.id} className="grid gap-1 border-t border-[var(--line)] pt-3 first:border-0 first:pt-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <b>{x.child.first_name} · {x.weekdays.map((w: number) => DAYS[w - 1]).join(", ")} · {x.period === "am" ? "rytinis maršrutas" : String(x.pickup_time).slice(0, 5)}</b>
              <Pill s={x.status} />
            </div>
            <div className="text-sm muted">{x.from.label} → {x.to.label}</div>
            <div className="text-sm">{eur(x.monthly_eur)} / mėn.{x.months > 1 ? ` · ${x.months} mėn.` : ""}{x.is_bid ? " · jūsų pasiūlymas" : ""}{x.payer_id !== me.id ? " · užsakė kitas globėjas" : ""}</div>
          </div>
        ))}
      </section>

      {[...byDay.entries()].map(([day, list]) => (
        <section key={day} className="card">
          <h3 className="text-sm font-bold uppercase tracking-wide muted">{fmtDay(list![0].pickup_at)}</h3>
          {list!.map((t) => {
            const hours = (new Date(t.pickup_at).getTime() - now.getTime()) / 36e5;
            const fee = cancelFeePct(s, hours);
            return (
              <div key={t.id} className="grid grid-cols-[56px_1fr] gap-3 border-t border-[var(--line)] pt-3 first:border-0 first:pt-0">
                <div className="num text-lg font-bold">{fmtTime(t.pickup_at)}</div>
                <div className="grid min-w-0 gap-1">
                  <div className="flex flex-wrap items-center justify-between gap-2"><span className="flex items-center gap-2"><b>{t.child.first_name}</b><Pill s={t.status} /></span><span className="num font-bold">{eur(t.price_eur)}</span></div>
                  <div className="break-words font-semibold">{t.from_label} <span className="muted font-normal">→</span> {t.to_label}</div>
                  {t.status === "scheduled" && hours > 0 && (
                    <form action={cancelTrip}><input type="hidden" name="id" value={t.id} /><button className="btn">Atšaukti šią kelionę{fee ? ` (mokestis ${fee}%)` : ""}</button></form>
                  )}
                </div>
              </div>
            );
          })}
        </section>
      ))}
      {byDay.size === 0 && <div className="card muted">Artimiausias dvi savaites kelionių nėra.</div>}
    </>
  );
}
