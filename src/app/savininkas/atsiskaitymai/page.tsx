import { loadSettings } from "@/lib/auth";
import { loadDrivers } from "@/lib/drivers";
import { monthByDriver } from "@/lib/payouts";
import { eur, vilniusToday } from "@/lib/time";

export default async function Page() {
  const s = await loadSettings();
  const rows = await monthByDriver(s, await loadDrivers());
  const sum = (k: "gross" | "net" | "payout" | "mb") => rows.reduce((a, r) => a + r[k], 0);
  const month = new Date(`${vilniusToday().slice(0, 7)}-15T12:00:00Z`).toLocaleDateString("lt-LT", { year: "numeric", month: "long" });
  return (
    <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {([["Klientai sumokės su PVM", sum("gross")], ["Be PVM", sum("net")], ["Išmokos vairuotojams", sum("payout")], ["Lieka MB", sum("mb")]] as const).map(([l, v]) => (
          <div key={l} className="rounded-xl bg-[var(--surface-2)] p-3"><div className="text-sm muted">{l}</div><div className="num text-lg font-bold">{eur(v)}</div></div>
        ))}
      </div>
      <section className="card">
        <h2 className="font-bold">Atsiskaitymai su vairuotojais už {month}</h2>
        <div className="overflow-x-auto"><table><thead><tr><th>Vairuotojas</th><th>Sutartys</th><th>Vienos d. kel.</th><th>Su PVM</th><th>Be PVM</th><th>Vairuotojui</th><th>MB</th></tr></thead>
          <tbody>{rows.map((r) => <tr key={r.d.profile_id}><td>{r.d.profile.full_name}<div className="text-xs muted">IV pažyma {r.d.cert_no}</div></td><td>{r.subs}</td><td>{r.trips}</td><td>{eur(r.gross)}</td><td>{eur(r.net)}</td><td><b>{eur(r.payout)}</b> <span className="text-xs muted">({r.pct} %)</span></td><td>{eur(r.mb)}</td></tr>)}</tbody></table></div>
        <p className="text-sm muted">Vairuotojas kas mėnesį išrašo MB sąskaitą pagal individualios veiklos pažymą. Kuras, automobilis ir vairuotojo mokesčiai yra vairuotojo išlaidos.</p>
      </section>
    </>
  );
}
