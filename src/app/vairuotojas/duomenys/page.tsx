import { requireDriver } from "@/lib/auth";
import { docState, loadDrivers } from "@/lib/drivers";
import { saveDriverDoc, saveWorkdays } from "@/app/actions";
import { DAYS } from "@/lib/time";

const fmt = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("lt-LT", { year: "numeric", month: "long", day: "numeric" });

export default async function Page() {
  const me = await requireDriver();
  const d = (await loadDrivers()).find((x) => x.profile_id === me.id);
  if (!d) return <div className="card muted">Vairuotojo duomenų nerasta. Susisiekite su MB.</div>;
  const expired = d.docs.some((x) => docState(x.valid_until) === "bad");
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <section className="card content-start">
        <h2 className="font-bold">Dokumentai</h2>
        <div className="text-sm muted">IV pažyma {d.cert_no} · {d.car ?? "automobilis nenurodytas"}</div>
        {d.docs.map((x) => { const st = docState(x.valid_until); return (
          <form key={x.id} action={saveDriverDoc} className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <input type="hidden" name="doc_id" value={x.id} /><input type="hidden" name="number" value={x.number ?? ""} />
            <span>{x.name}{x.number ? ` · ${x.number}` : ""}</span>
            <span className="flex items-center gap-2"><span className={`pill ${st === "bad" ? "p-bad" : st === "warn" ? "p-warn" : "p-ok"}`}>{x.valid_until ? `${st === "bad" ? "Pasibaigė" : "Iki"} ${fmt(x.valid_until)}` : "Galioja"}</span>
              <input type="date" name="valid_until" defaultValue={x.valid_until ?? ""} aria-label={`${x.name} galioja iki`} className="input" /><button className="btn">Atnaujinti</button></span>
          </form>); })}
        {expired && <p className="rounded-lg bg-[var(--warn-bg)] p-2 text-sm font-semibold text-[var(--warn)]">Atnaujinkite pasibaigusius dokumentus. Kol jie negalioja, nauji užsakymai jums neskiriami.</p>}
      </section>
      <form action={saveWorkdays} className="card content-start">
        <h2 className="font-bold">Kada dirbu</h2>
        <p className="text-sm muted">Nauji ilgalaikiai užsakymai skiriami tik pažymėtomis dienomis.</p>
        <div className="flex flex-wrap gap-3">{DAYS.slice(0, 5).map((x, i) => <label key={x} className="flex items-center gap-2"><input type="checkbox" name="workdays" value={i + 1} defaultChecked={d.workdays.includes(i + 1)} className="h-5 w-5" />{x}</label>)}</div>
        <button className="btn btn-primary">Išsaugoti</button>
      </form>
    </div>
  );
}
