import Link from "next/link";
import { requireProfile, loadSettings } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { requestSubscriptionChange } from "@/app/actions";
import { loadFamilyFees, loadPlanBill } from "@/lib/fees-server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { feeForPayer } from "@/lib/fees";
import { DAYS, eur, vilniusToday } from "@/lib/time";
import { StatusPill } from "@/components/client-ui";
import { quickCalc } from "@/lib/welcome";

// Mano abonementas: mūsų modelis – kelionių kaina per mėnesį + platformos mokestis šeimai
export default async function Page() {
  const [me, s, sb] = await Promise.all([requireProfile(), loadSettings(), supabaseServer()]);
  const [{ data: subs }, { data: kids }, fees] = await Promise.all([
    sb.from("subscriptions").select("*, child:children(first_name), from:places!subscriptions_from_place_id_fkey(label), to:places!subscriptions_to_place_id_fkey(label)").in("status", ["pending", "active"]).order("created_at"),
    sb.from("child_guardians").select("child_id, relation").eq("profile_id", me.id),
    loadFamilyFees(vilniusToday().slice(0, 7), s.platform_fee),
  ]);
  const canEdit = (childId: string) => (kids ?? []).some((k) => k.child_id === childId && k.relation !== "artimasis");
  const mine = (subs ?? []).filter((x) => x.status === "active" && x.payer_id === me.id);
  const trips = mine.reduce((a, x) => a + Number(x.monthly_eur), 0);
  // Kredito planas (jei priskirtas): plano kaina jau su platformos mokesčiu, viršijus kreditą – papildomai
  const { data: prof } = await supabaseAdmin().from("profiles").select("id, plan_id, plan_since").eq("id", me.id).single();
  const plan = prof?.plan_id ? await loadPlanBill(s, prof, vilniusToday().slice(0, 7)) : null;
  const fee = plan ? 0 : feeForPayer(fees, me.id);
  const due = plan ? plan.bill.due : trips + fee;
  const month = vilniusToday().slice(0, 7);
  const monthEnd = (m: string, add = 0) => { const d = new Date(`${m}-01T00:00:00Z`); d.setUTCMonth(d.getUTCMonth() + 1 + add); d.setUTCDate(0); return d.toLocaleDateString("lt-LT", { month: "long", day: "numeric" }); };
  // Sutaupytas laikas ir pinigai, palyginus su vežiojimu patiems (tos pačios prielaidos kaip skaičiuoklėje, 15 €/val.)
  const perWeek = mine.reduce((a, x) => a + x.weekdays.length, 0);
  const avgKm = perWeek ? mine.reduce((a, x) => a + Number(x.km) * x.weekdays.length, 0) / perWeek : 0;
  const cmp = perWeek ? quickCalc(s, { km: avgKm, perWeek, passenger: "child", hourValue: 15 }) : null;
  const tripHours = avgKm ? ((avgKm * 2 + 6) * 2.75 + 20) / 60 : 0;
  const since = new Date(); since.setUTCMonth(since.getUTCMonth() - 5); since.setUTCDate(1);
  const { data: done } = await sb.from("trips").select("pickup_at").eq("payer_id", me.id).eq("status", "delivered").gte("pickup_at", since.toISOString().slice(0, 10));
  const months = Array.from({ length: 6 }, (_, i) => { const d = new Date(since); d.setUTCMonth(d.getUTCMonth() + i); return d.toISOString().slice(0, 7); });
  const hoursBy = months.map((m) => Math.round((done ?? []).filter((t) => t.pickup_at.slice(0, 7) === m).length * tripHours * 10) / 10);
  const maxH = Math.max(1, ...hoursBy);

  return (
    <>
      <h1 className="text-2xl font-bold">Mano abonementas</h1>
      <section className="grid gap-3 rounded-[18px] bg-[var(--brand)] p-5 text-[var(--brand-fg)]">
        <span className="text-sm opacity-80">Šį mėnesį mokate</span>
        <b className="num text-4xl">{eur(due)}</b>
        {plan ? <div className="grid gap-1 border-t border-white/20 pt-3 text-sm">
          <div className="flex justify-between"><span className="opacity-85">Planas „{plan.p.name}“</span><span className="num">{eur(plan.p.price)}</span></div>
          <div className="flex justify-between"><span className="opacity-85">Panaudota kredito</span><span className="num">{eur(plan.bill.used)} iš {eur(plan.p.credit)}</span></div>
          <div className="h-2 overflow-hidden rounded-full bg-white/25" role="progressbar" aria-label="Panaudotas kreditas" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(Math.min(1, plan.bill.used / plan.p.credit) * 100)}>
            <i className="block h-full rounded-full bg-[var(--accent)]" style={{ width: `${Math.min(100, plan.bill.used / plan.p.credit * 100)}%` }} /></div>
          <div className="flex justify-between"><span className="opacity-85">Kreditas galioja iki</span><span>{monthEnd(month)}{plan.bill.carryOut > 0 ? `, likutis iki ${monthEnd(month, 1)}` : ""}</span></div>
          {plan.bill.over > 0 && <div className="flex justify-between"><span className="opacity-85">Virš plano</span><span className="num">{eur(plan.bill.over)}</span></div>}
          {plan.bill.carryOut > 0 && <div className="flex justify-between"><span className="opacity-85">Nepanaudota, pereis į kitą mėnesį</span><span className="num">{eur(plan.bill.carryOut)}</span></div>}
        </div> : <div className="grid gap-1 border-t border-white/20 pt-3 text-sm">
          <div className="flex justify-between"><span className="opacity-85">Kelionės pagal grafiką</span><span className="num">{eur(trips)}</span></div>
          <div className="flex justify-between"><span className="opacity-85">Platformos mokestis šeimai</span><span className="num">{fee ? eur(fee) : "–"}</span></div>
        </div>}
      </section>
      {plan ? <p className="text-sm muted">Plano kaina jau apima platformos mokestį. Registracijos mokesčio nėra.</p> : <p className="text-sm muted">Platformos mokestis ({eur(s.platform_fee)} / mėn.) apima aplikaciją, planavimą, pranešimus, vairuotojų patikrą ir aptarnavimą. Registracijos mokesčio nėra.</p>}

      <div className="grid grid-cols-2 gap-3">
        <Link href="/tevai/planas" className="btn btn-lg">{plan ? "Keisti planą" : "Rinktis planą"}</Link>
        <Link href="/tevai/mokejimai" className="btn btn-lg">Mokėjimai</Link>
      </div>

      {cmp && (
        <section className="card gap-2" aria-label="Mėnesio sutaupymas">
          <h2 className="font-bold">Mėnesio sutaupymas</h2>
          <div className="flex items-end justify-between gap-3">
            <div className="grid">
              <b className="num text-3xl text-[var(--ok)]">{cmp.hours.toLocaleString("lt-LT")} val.</b>
              <span className="text-sm muted">{cmp.self > due ? `ir apie ${eur(cmp.self - due)} pigiau nei vežioti patiems` : "laiko, kurio nereikia vairuoti ir laukti"}</span>
            </div>
            <div className="flex h-16 items-end gap-1" aria-label="Sutaupytos valandos per paskutinius 6 mėnesius">
              {hoursBy.map((h, i) => <i key={months[i]} title={`${months[i]}: ${h} val.`} className="block w-3 rounded-t bg-[var(--ok)]" style={{ height: `${Math.max(6, h / maxH * 100)}%`, opacity: h ? 1 : 0.25 }} />)}
            </div>
          </div>
          <p className="text-xs muted">Palyginta su vežiojimu patiems: 0,30 €/km, 1 € parkavimas ir 15 €/val. jūsų laiko. Stulpeliai rodo įvykusių kelionių sutaupytas valandas.</p>
        </section>
      )}

      <Link href="/tevai/uzsakyti" className="btn btn-primary btn-lg">+ Naujas abonementas</Link>

      {(subs ?? []).length === 0 && <div className="card muted">Abonementų dar nėra. Pasirinkite dienas ir laiką, o kainą pamatysite iš karto.</div>}
      {(subs ?? []).map((x) => (
        <section key={x.id} className="card">
          <div className="flex items-center justify-between gap-2"><b className="text-lg">{x.child.first_name}</b><StatusPill s={x.status} /></div>
          <div className="grid gap-1 text-sm">
            <div><span className="muted">Maršrutas: </span>{x.from.label} → {x.to.label}</div>
            <div><span className="muted">Dienos: </span>{x.weekdays.map((w: number) => DAYS[w - 1]).join(", ")} · {x.period === "am" ? "rytinis maršrutas" : String(x.pickup_time).slice(0, 5)}</div>
            <div><span className="muted">Kaina: </span><b className="num">{eur(x.monthly_eur)} / mėn.</b>{x.months > 1 ? ` · ${x.months} mėn.` : ""}{x.is_bid ? " · jūsų pasiūlymas" : ""}{x.payer_id !== me.id ? " · moka kitas globėjas" : ""}</div>
          </div>
          {x.status === "active" && x.period === "pm" && canEdit(x.child_id) && (
            <form action={requestSubscriptionChange} className="flex flex-wrap items-end gap-2 border-t border-[var(--line)] pt-3">
              <input type="hidden" name="id" value={x.id} />
              <label className="grid gap-1 text-xs font-semibold muted">Norimas naujas laikas<input type="time" name="pickup_time" className="input" min={s.afternoon_start} max={s.afternoon_end} defaultValue={String(x.pickup_time).slice(0, 5)} /></label>
              <button className="btn">Prašyti pakeisti</button>
            </form>
          )}
          {x.owner_note && <div className="text-sm muted">{x.owner_note}. Laukia vairuotojo atsakymo.</div>}
          {x.driver_id && <Link href={`/tevai/vairuotojas/${x.driver_id}`} className="text-sm font-semibold text-[var(--brand)]">Vairuotojas →</Link>}
        </section>
      ))}
      <Link href="/tevai/sutartys" className="btn">Sutartys ir sąskaitos</Link>
    </>
  );
}
