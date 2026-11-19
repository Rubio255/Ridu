import { loadSettings } from "@/lib/auth";
import { docState, loadDrivers, payoutPct, childOk } from "@/lib/drivers";
import { inviteDriver, updateDriver, saveDriverDoc } from "@/app/actions";
import { DAYS } from "@/lib/time";

const fmt = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("lt-LT", { year: "numeric", month: "long", day: "numeric" });
const DOC_PILL = { ok: "p-ok", warn: "p-warn", bad: "p-bad" } as const;

export default async function Page() {
  const [s, drivers] = await Promise.all([loadSettings(), loadDrivers()]);
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {drivers.map((d) => (
        <section key={d.profile_id} className="card content-start">
          <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-bold">{d.profile.full_name || d.profile.email}</h2><span className={`pill ${d.active ? "p-ok" : "p-bad"}`}>{d.active ? "Aktyvus" : "Neaktyvus"}</span></div>
          <div className="text-sm muted">{d.profile.email}{d.profile.phone ? ` · ${d.profile.phone}` : ""} · IV pažyma {d.cert_no}</div>
          <div className="text-sm">{d.car ?? "Automobilis nenurodytas"}{d.seats ? ` · ${d.seats}` : ""} · dirba {d.workdays.map((w) => DAYS[w - 1]).join(", ") || "–"}</div>
          <h3 className="text-sm font-bold muted">Dokumentai</h3>
          {d.docs.map((x) => { const st = docState(x.valid_until); return (
            <form key={x.id} action={saveDriverDoc} className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <input type="hidden" name="driver_id" value={d.profile_id} /><input type="hidden" name="doc_id" value={x.id} /><input type="hidden" name="number" value={x.number ?? ""} />
              <span>{x.name}{x.number ? ` · ${x.number}` : ""}</span>
              <span className="flex items-center gap-2"><span className={`pill ${DOC_PILL[st]}`}>{x.valid_until ? `${st === "bad" ? "Pasibaigė" : "Iki"} ${fmt(x.valid_until)}` : "Galioja"}</span>
                <input type="date" name="valid_until" defaultValue={x.valid_until ?? ""} aria-label={`${x.name} galioja iki`} className="input" /><button className="btn">Išsaugoti</button></span>
            </form>); })}
          <div className="flex flex-wrap items-end gap-2">
            <form action={updateDriver} className="flex items-end gap-2"><input type="hidden" name="id" value={d.profile_id} />
              <label className="grid gap-1 text-xs font-semibold muted">Vairuotojui, %<input name="payout_pct" type="number" step="any" min="0" max="100" defaultValue={payoutPct(s, d)} className="input w-24" /></label><button className="btn">Išsaugoti</button></form>
            <form action={updateDriver} className="flex flex-wrap items-center gap-3 text-sm"><input type="hidden" name="id" value={d.profile_id} /><input type="hidden" name="child_flags" value="1" />
              <label className="flex items-center gap-2"><input type="checkbox" name="child_qr_verified" defaultChecked={d.child_qr_verified} />QR kodas darbui su vaikais patikrintas</label>
              <label className="flex items-center gap-2"><input type="checkbox" name="child_seats" defaultChecked={d.child_seats} />Turi vaikiškas kėdutes</label>
              <button className="btn">Išsaugoti</button>
              <span className={`pill ${childOk(d) ? "p-ok" : "p-warn"}`}>{childOk(d) ? "Veža vaikus ir suaugusius" : "Veža tik suaugusius"}</span></form>
            <form action={updateDriver}><input type="hidden" name="id" value={d.profile_id} /><input type="hidden" name="active" value={d.active ? "0" : "1"} /><button className={`btn ${d.active ? "btn-bad" : "btn-ok"}`}>{d.active ? "Išjungti" : "Įjungti"}</button></form>
          </div>
        </section>
      ))}
      <section className="card content-start">
        <h2 className="font-bold">Pakviesti vairuotoją</h2>
        <p className="text-sm muted">Vairuotojas gaus el. laišką su nuoroda į vairuotojo aplikaciją. Numatytasis procentas {s.driver_pct} % kainos be PVM.</p>
        <form action={inviteDriver} className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm font-semibold muted">Vardas, pavardė<input name="full_name" required className="input" /></label>
            <label className="grid gap-1 text-sm font-semibold muted">El. paštas<input name="email" type="email" required className="input" /></label>
            <label className="grid gap-1 text-sm font-semibold muted">Telefonas<input name="phone" className="input" /></label>
            <label className="grid gap-1 text-sm font-semibold muted">Individualios veiklos pažymos nr.<input name="cert_no" required className="input" /></label>
            <label className="grid gap-1 text-sm font-semibold muted">Automobilis<input name="car" className="input" /></label>
            <label className="grid gap-1 text-sm font-semibold muted">Kėdutės<input name="seats" className="input" placeholder="2 kėdutės, 1 paaukštinimas" /></label>
            <label className="grid gap-1 text-sm font-semibold muted">Vairuotojo pažymėjimas iki<input name="license_until" type="date" className="input" /></label>
            <label className="grid gap-1 text-sm font-semibold muted">Draudimas iki<input name="insurance_until" type="date" className="input" /></label>
            <label className="grid gap-1 text-sm font-semibold muted">Pažyma apie teistumą iki<input name="record_until" type="date" className="input" /></label>
          </div>
          <button className="btn btn-primary">Siųsti kvietimą</button>
        </form>
      </section>
    </div>
  );
}
