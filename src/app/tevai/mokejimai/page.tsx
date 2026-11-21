import Link from "next/link";
import { requireProfile, loadSettings } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { loadFamilyFees, loadPlanBill } from "@/lib/fees-server";
import { feeForPayer } from "@/lib/fees";
import { planState } from "@/lib/client-plan";
import { countedPart } from "@/lib/pricing";
import { COMPANY } from "@/lib/company";
import { eur, vilniusToday } from "@/lib/time";

const monthName = (m: string) => new Date(`${m}-15T12:00:00Z`).toLocaleDateString("lt-LT", { year: "numeric", month: "long" });

// Mokėjimai: paskutinių 6 mėnesių sąskaitos. Mokėjimas kortele bus įjungtas vėliau.
export default async function Page() {
  const [me, s, sb] = await Promise.all([requireProfile(), loadSettings(), supabaseServer()]);
  const st = await planState(me.id);
  const now = vilniusToday().slice(0, 7);
  const months = Array.from({ length: 6 }, (_, i) => { const d = new Date(`${now}-01T00:00:00Z`); d.setUTCMonth(d.getUTCMonth() - i); return d.toISOString().slice(0, 7); });
  const { data: trips } = await sb.from("trips").select("pickup_at, price_eur, status, cancel_fee_pct, credit_eur").eq("payer_id", me.id).gte("pickup_at", `${months[5]}-01`);
  const rows = await Promise.all(months.map(async (m) => {
    const ts = (trips ?? []).filter((t) => t.pickup_at.slice(0, 7) === m && countedPart(t) > 0);
    const plan = st?.plan_id && st.plan_since && st.plan_since.slice(0, 7) <= m ? await loadPlanBill(s, st, m) : null;
    const fee = plan ? 0 : feeForPayer(await loadFamilyFees(m, s.platform_fee), me.id);
    const total = plan ? plan.bill.due : ts.reduce((a, t) => a + Number(t.price_eur) * countedPart(t), 0) + fee;
    return { m, n: ts.length, plan: plan?.p.name, total };
  }));
  const shown = rows.filter((r) => r.total > 0 || r.m === now);
  return (
    <>
      <div className="grid grid-cols-[40px_1fr_40px] items-center">
        <Link href="/tevai/abonementas" aria-label="Atgal" className="grid h-10 w-10 place-items-center rounded-full bg-[var(--surface)] text-lg shadow-sm">←</Link>
        <h1 className="text-center text-lg font-bold">Mokėjimai</h1>
      </div>
      <section className="grid gap-1 rounded-[20px] bg-[#1d2742] p-5 text-white shadow-lg">
        <span className="text-sm opacity-80">Mokėjimo būdas</span>
        <b className="text-lg">Bankinis pavedimas pagal sąskaitą</b>
        <span className="text-sm opacity-85">Mokėjimas kortele bus įjungtas netrukus.</span>
      </section>
      <section className="card gap-0 p-2" aria-label="Sąskaitų istorija">
        <h2 className="px-3 pb-1 pt-2 font-bold">Sąskaitų istorija</h2>
        {shown.map((r) => (
          <div key={r.m} className="flex items-center justify-between gap-3 border-t border-[var(--line)] px-3 py-3 first-of-type:border-0">
            <div className="grid"><b className="capitalize">{monthName(r.m)}</b><span className="text-sm muted">{r.plan ? `Planas „${r.plan}“ · ` : ""}{r.n} kel.{r.m === now ? " · einamasis mėnuo" : ""}</span></div>
            <b className="num">{eur(r.total)}</b>
          </div>
        ))}
      </section>
      <Link href="/tevai/sutartys" className="btn btn-lg">Sutartys</Link>
      <section className="card flex-row items-center gap-3">
        <span aria-hidden="true" className="grid h-11 w-11 place-items-center rounded-full bg-[var(--brand-soft)] text-xl">🎧</span>
        <div className="grid"><b>Pagalba</b><span className="text-sm muted">Turite klausimų dėl sąskaitos?{COMPANY.email ? <> Rašykite <a className="underline" href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a></> : <> <Link className="underline" href="/privatumas#pagalba">Kontaktai</Link></>}</span></div>
      </section>
    </>
  );
}
