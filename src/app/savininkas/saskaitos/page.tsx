import { loadSettings } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/server";
import { eur, vilniusToday } from "@/lib/time";
import { notifyInvoice } from "@/app/actions";
import { loadDrivers } from "@/lib/drivers";
import { monthByDriver } from "@/lib/payouts";
import { loadFamilyFees } from "@/lib/fees-server";
import { feeForPayer } from "@/lib/fees";
import { countedPart, planById, planChain } from "@/lib/pricing";

const monthsFrom = (from: string, to: string) => {
  const out: string[] = [];
  for (let d = new Date(`${from.slice(0, 7)}-01T00:00:00Z`); d.toISOString().slice(0, 7) <= to; d.setUTCMonth(d.getUTCMonth() + 1)) out.push(d.toISOString().slice(0, 7));
  return out;
};

export default async function Page() {
  const s = await loadSettings();
  const today = vilniusToday(), month = today.slice(0, 7);
  const start = new Date(`${month}-01T00:00:00Z`), end = new Date(start); end.setUTCMonth(end.getUTCMonth() + 1);
  const db = supabaseAdmin();
  const [{ data: subs }, { data: trips }, { data: clients }] = await Promise.all([
    db.from("subscriptions").select("payer_id, monthly_eur, km, weekdays").eq("status", "active"),
    db.from("trips").select("payer_id, price_eur, status, cancel_fee_pct, credit_eur").gte("pickup_at", start.toISOString()).lt("pickup_at", end.toISOString()),
    db.from("profiles").select("id, full_name, email, contract_no, plan_id, plan_since").eq("role", "client"),
  ]);
  // Kredito planų klientams reikia kelionių nuo plano pradžios (nepanaudotas kreditas perkeliamas)
  const planFrom = (clients ?? []).filter((c) => c.plan_id && c.plan_since).map((c) => c.plan_since as string).sort()[0];
  const { data: planTrips } = planFrom
    ? await db.from("trips").select("payer_id, pickup_at, price_eur, standard_eur, status, cancel_fee_pct, credit_eur").gte("pickup_at", `${planFrom}T00:00:00Z`).lt("pickup_at", end.toISOString())
    : { data: [] as { payer_id: string; pickup_at: string; price_eur: number; standard_eur: number | null; status: string; cancel_fee_pct: number | null; credit_eur: number | null }[] };
  const planOf = (c: { id: string; plan_id: string | null; plan_since: string | null }) => {
    const p = planById(s, c.plan_id);
    if (!p) return null;
    const months = monthsFrom(c.plan_since ?? `${month}-01`, month);
    const used = months.map((m) => (planTrips ?? []).filter((t) => t.payer_id === c.id && t.pickup_at.slice(0, 7) === m)
      .reduce((a, t) => a + Number(t.standard_eur ?? t.price_eur) * countedPart(t), 0));
    return { p, bill: planChain(s, p, used).pop()! };
  };
  const fees = await loadFamilyFees(month, s.platform_fee);
  const rows = (clients ?? []).map((c) => {
    const ms = (subs ?? []).filter((x) => x.payer_id === c.id), ts = (trips ?? []).filter((t) => t.payer_id === c.id);
    const plan = planOf(c);
    return { c, plan, subs: ms.length, monthly: ms.reduce((a, x) => a + Number(x.monthly_eur), 0), done: ts.filter((t) => t.status === "delivered").length, cancelled: ts.filter((t) => t.status === "cancelled" || t.status === "no_show").length, credit: plan ? 0 : ts.reduce((a, t) => a + Number(t.credit_eur ?? 0), 0), fee: plan ? 0 : feeForPayer(fees, c.id) };
  // Su planu: plano kaina (jau su platformos mokesčiu) + viršijimas; be plano: abonementų kaina + platformos mokestis
  }).map((r) => ({ ...r, total: r.plan ? r.plan.bill.due : Math.max(0, r.monthly - r.credit) + r.fee })).filter((r) => r.plan || r.subs || r.done || r.cancelled || r.fee);
  const feeSum = rows.reduce((a, r) => a + r.fee, 0), gross = rows.reduce((a, r) => a + r.total, 0);
  const vat = gross - gross / (1 + s.vat_pct / 100), net = gross - vat;
  // Vairuotojai patys moka už kurą ir automobilį; MB išmoka jiems dalį kainos be PVM
  const payouts = (await monthByDriver(s, await loadDrivers())).reduce((a, r) => a + r.payout, 0), fixed = s.mb_costs;
  const profit = net - payouts - fixed, tax = Math.max(0, profit * s.tax_pct / 100), left = profit - tax;
  const pct = Math.max(0, Math.min(100, (left / s.target_net) * 100));
  return (
    <>
      <section className="card">
        <h2 className="font-bold">Šis mėnuo</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {[["Kelionės su PVM", gross - feeSum], ["Platformos mokesčiai su PVM", feeSum], ["PVM", vat], ["Išmokos vairuotojams", payouts], ["MB pastovios išlaidos", fixed], ["Mokesčiai (apytiksliai)", tax], ["Liks MB", left]].map(([l, v]) => (
            <div key={l as string} className="rounded-xl bg-[var(--surface-2)] p-3"><div className="text-sm muted">{l}</div><div className="num text-lg font-bold">{eur(v as number)}</div></div>
          ))}
        </div>
        <div className="flex justify-between text-sm"><span>Tikslas {eur(s.target_net)}</span><span>{pct.toFixed(0)}%</span></div>
        <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-2)]"><i className="block h-full bg-[var(--brand)]" style={{ width: `${pct}%` }} /></div>
      </section>
      <section className="card">
        <h2 className="font-bold">Sąskaitos klientams</h2>
        <div className="overflow-x-auto"><table><thead><tr><th>Klientas</th><th>Planas</th><th>Sutartis</th><th>Užsakymai</th><th>Nuvežta</th><th>Atšaukta</th><th>Įskaityta</th><th>Platformos mokestis</th><th>Mokėti / mėn.</th><th></th></tr></thead>
          <tbody>{rows.map((r) => <tr key={r.c.id}><td>{r.c.full_name || r.c.email}</td><td>{r.plan ? <>{r.plan.p.name}<div className="text-xs muted">Panaudota {eur(r.plan.bill.used)} iš {eur(r.plan.p.credit)}{r.plan.bill.over ? `, viršyta ${eur(r.plan.bill.over)}` : ""}{r.plan.bill.carryOut ? `, likutis ${eur(r.plan.bill.carryOut)}` : ""}</div></> : "–"}</td><td>{r.c.contract_no ?? "–"}</td><td>{r.subs}</td><td>{r.done}</td><td>{r.cancelled}</td><td>{r.credit ? `−${eur(r.credit)}` : "–"}</td><td>{r.fee ? eur(r.fee) : "–"}</td><td><b>{eur(r.total)}</b></td><td><form action={notifyInvoice}><input type="hidden" name="id" value={r.c.id} /><input type="hidden" name="amount" value={eur(r.total)} /><button className="btn">Pranešti apie sąskaitą</button></form></td></tr>)}</tbody></table></div>
        <p className="text-sm muted">Kredito plano klientas moka plano kainą (su platformos mokesčiu) ir viršijimą standartine kelionių verte; nepanaudotas kreditas galioja dar {s.credit_carry_months} mėn. Be plano abonementų mėnesio kaina fiksuota. Platformos mokestis {eur(s.platform_fee)} / mėn. šeimai skaičiuojamas pagal sutarties dienas, dalijamas tarp mokančių tėvų ir neimamas, jei visas mėnesio keliones atšaukėme mes. Vėlyvų atšaukimų mokesčiai pagal sutartį. MB dalis ({100 - s.driver_pct} %) klientams nerodoma.</p>
      </section>
    </>
  );
}
