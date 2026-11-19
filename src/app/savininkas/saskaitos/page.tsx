import { loadSettings } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/server";
import { eur, vilniusToday } from "@/lib/time";
import { notifyInvoice } from "@/app/actions";
import { loadDrivers } from "@/lib/drivers";
import { monthByDriver } from "@/lib/payouts";

export default async function Page() {
  const s = await loadSettings();
  const today = vilniusToday(), month = today.slice(0, 7);
  const start = new Date(`${month}-01T00:00:00Z`), end = new Date(start); end.setUTCMonth(end.getUTCMonth() + 1);
  const db = supabaseAdmin();
  const [{ data: subs }, { data: trips }, { data: clients }] = await Promise.all([
    db.from("subscriptions").select("payer_id, monthly_eur, km, weekdays").eq("status", "active"),
    db.from("trips").select("payer_id, price_eur, status, cancel_fee_pct").gte("pickup_at", start.toISOString()).lt("pickup_at", end.toISOString()),
    db.from("profiles").select("id, full_name, email, contract_no").eq("role", "client"),
  ]);
  const rows = (clients ?? []).map((c) => {
    const ms = (subs ?? []).filter((x) => x.payer_id === c.id), ts = (trips ?? []).filter((t) => t.payer_id === c.id);
    return { c, subs: ms.length, monthly: ms.reduce((a, x) => a + Number(x.monthly_eur), 0), done: ts.filter((t) => t.status === "delivered").length, cancelled: ts.filter((t) => t.status === "cancelled" || t.status === "no_show").length };
  }).filter((r) => r.subs || r.done || r.cancelled);
  const gross = rows.reduce((a, r) => a + r.monthly, 0);
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
          {[["Pajamos su PVM", gross], ["PVM", vat], ["Išmokos vairuotojams", payouts], ["MB pastovios išlaidos", fixed], ["Mokesčiai (apytiksliai)", tax], ["Liks MB", left]].map(([l, v]) => (
            <div key={l as string} className="rounded-xl bg-[var(--surface-2)] p-3"><div className="text-sm muted">{l}</div><div className="num text-lg font-bold">{eur(v as number)}</div></div>
          ))}
        </div>
        <div className="flex justify-between text-sm"><span>Tikslas {eur(s.target_net)}</span><span>{pct.toFixed(0)}%</span></div>
        <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-2)]"><i className="block h-full bg-[var(--brand)]" style={{ width: `${pct}%` }} /></div>
      </section>
      <section className="card">
        <h2 className="font-bold">Sąskaitos klientams</h2>
        <div className="overflow-x-auto"><table><thead><tr><th>Klientas</th><th>Sutartis</th><th>Užsakymai</th><th>Nuvežta</th><th>Atšaukta</th><th>Mokėti / mėn.</th><th></th></tr></thead>
          <tbody>{rows.map((r) => <tr key={r.c.id}><td>{r.c.full_name || r.c.email}</td><td>{r.c.contract_no ?? "–"}</td><td>{r.subs}</td><td>{r.done}</td><td>{r.cancelled}</td><td><b>{eur(r.monthly)}</b></td><td><form action={notifyInvoice}><input type="hidden" name="id" value={r.c.id} /><input type="hidden" name="amount" value={eur(r.monthly)} /><button className="btn">Pranešti apie sąskaitą</button></form></td></tr>)}</tbody></table></div>
        <p className="text-sm muted">Ilgalaikių užsakymų mėnesio kaina fiksuota. Vėlyvų atšaukimų mokesčiai pagal sutartį.</p>
      </section>
    </>
  );
}
