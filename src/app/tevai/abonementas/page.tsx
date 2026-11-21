import Link from "next/link";
import { requireProfile, loadSettings } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { requestSubscriptionChange } from "@/app/actions";
import { loadFamilyFees } from "@/lib/fees-server";
import { feeForPayer } from "@/lib/fees";
import { DAYS, eur, vilniusToday } from "@/lib/time";
import { StatusPill } from "@/components/client-ui";

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
  const fee = feeForPayer(fees, me.id);

  return (
    <>
      <h1 className="text-2xl font-bold">Mano abonementas</h1>
      <section className="grid gap-3 rounded-[18px] bg-[var(--brand)] p-5 text-[var(--brand-fg)]">
        <span className="text-sm opacity-80">Šį mėnesį mokate</span>
        <b className="num text-4xl">{eur(trips + fee)}</b>
        <div className="grid gap-1 border-t border-white/20 pt-3 text-sm">
          <div className="flex justify-between"><span className="opacity-85">Kelionės pagal grafiką</span><span className="num">{eur(trips)}</span></div>
          <div className="flex justify-between"><span className="opacity-85">Platformos mokestis šeimai</span><span className="num">{fee ? eur(fee) : "–"}</span></div>
        </div>
      </section>
      <p className="text-sm muted">Platformos mokestis ({eur(s.platform_fee)} / mėn.) apima aplikaciją, planavimą, pranešimus, vairuotojų patikrą ir aptarnavimą. Registracijos mokesčio nėra.</p>

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
