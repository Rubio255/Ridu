import { loadSettings, requireDriver } from "@/lib/auth";
import { loadDrivers } from "@/lib/drivers";
import { monthByDriver } from "@/lib/payouts";
import { eur } from "@/lib/time";

export default async function Page() {
  const me = await requireDriver();
  const s = await loadSettings();
  const [r] = await monthByDriver(s, (await loadDrivers()).filter((d) => d.profile_id === me.id));
  if (!r) return <div className="card muted">Vairuotojo duomenų nerasta. Susisiekite su MB.</div>;
  const car = s.cost_insurance + s.cost_wash + s.cost_service, left = r.payout - r.fuel - car;
  return (
    <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {([["Jums išmokės MB", r.payout], ["Kuras (apytiksliai)", r.fuel], ["Automobilio išlaidos", car], ["Lieka prieš mokesčius", left]] as const).map(([l, v]) => (
          <div key={l} className="rounded-xl bg-[var(--surface-2)] p-3"><div className="text-sm muted">{l}</div><div className="num text-lg font-bold">{eur(v)}</div></div>
        ))}
      </div>
      <section className="card">
        <div className="flex justify-between"><span>Galiojančios sutartys</span><b>{r.subs}</b></div>
        <div className="flex justify-between"><span>Vienos dienos kelionės</span><b>{r.trips}</b></div>
        <div className="flex justify-between"><span>Jūsų dalis</span><b>{r.pct} % kainos be PVM</b></div>
        <div className="flex justify-between"><span>Nuvažiuosite apie</span><b>{Math.round(r.km)} km</b></div>
        <p className="text-sm muted">Pagal individualios veiklos pažymą gyventojų pajamų mokestį ir Sodros įmokas mokate patys. Mėnesio pabaigoje išrašykite MB sąskaitą šiai sumai.</p>
      </section>
    </>
  );
}
