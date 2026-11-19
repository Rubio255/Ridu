import { PASSENGER_LT, type PassengerType } from "@/lib/pricing";
import { loadSettings } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/server";
import { setTripStatus, cancelTrip, moveTrip, assignTrip } from "@/app/actions";
import { loadDrivers } from "@/lib/drivers";
import { Pill } from "@/components/shell";
import { mapsLink } from "@/lib/maps";
import { dayKey, eur, fmtDay, fmtTime } from "@/lib/time";

const hm = (m: number) => `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")} min`;

// Kalendorius: MB mato visų vairuotojų keliones, vairuotojas tik savo
export async function Calendar({ driverId }: { driverId?: string }) {
  const s = await loadSettings();
  const from = new Date(Date.now() - 12 * 36e5), until = new Date(Date.now() + 8 * 864e5);
  let tq = supabaseAdmin().from("trips").select("*, child:children(first_name, notes, passenger_type, dropoff, handover_to), payer:profiles!trips_payer_id_fkey(full_name, phone)")
    .gte("pickup_at", from.toISOString()).lte("pickup_at", until.toISOString()).neq("status", "cancelled").order("pickup_at");
  if (driverId) tq = tq.eq("driver_id", driverId);
  const [{ data: trips }, drivers] = await Promise.all([tq, driverId ? Promise.resolve([]) : loadDrivers()]);
  const dname = (id: string | null) => drivers.find((d) => d.profile_id === id)?.profile.full_name ?? "Nepriskirta";
  const byDay = new Map<string, NonNullable<typeof trips>>();
  (trips ?? []).forEach((t) => { const k = dayKey(t.pickup_at); byDay.set(k, [...(byDay.get(k) ?? []), t]); });
  const limit = s.day_limit_h * 60;
  return (
    <>
      <h1 className="text-xl font-bold">Kalendorius</h1>
      {byDay.size === 0 && <div className="card muted">Artimiausią savaitę kelionių nėra. Jos atsiras patvirtinus ilgalaikius užsakymus.</div>}
      {[...byDay.entries()].map(([k, list]) => {
        // Darbo laiko riba taikoma kiekvienam vairuotojui atskirai
        const perDriver = new Map<string, number>(); list.forEach((t) => perDriver.set(t.driver_id ?? "-", (perDriver.get(t.driver_id ?? "-") ?? 0) + t.block_min));
        const used = Math.max(0, ...perDriver.values()), over = used > limit;
        return (
          <section key={k} className="card">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-sm font-bold uppercase tracking-wide muted">{fmtDay(list[0].pickup_at)}</h2>
              <span className="num text-sm">{list.length} kel. · {eur(list.reduce((a, t) => a + Number(t.price_eur), 0))}</span>
            </div>
            <div className="grid gap-1">
              <div className="flex justify-between text-xs"><span>{driverId ? `Darbo laikas ${hm(used)} iš ${hm(limit)}` : [...perDriver.entries()].map(([d, m]) => `${dname(d)}: ${hm(m)}`).join(" · ")}</span>{over && <span className="pill p-bad">Viršyta</span>}</div>
              <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-2)]"><i className="block h-full" style={{ width: `${Math.min(100, (used / limit) * 100)}%`, background: over ? "var(--bad)" : "var(--brand)" }} /></div>
            </div>
            {list.map((t) => (
              <div key={t.id} className="grid grid-cols-[56px_1fr] gap-3 border-t border-[var(--line)] pt-3">
                <div className="num text-lg font-bold">{fmtTime(t.pickup_at)}<div className="text-xs font-normal muted">{t.block_min} min</div></div>
                <div className="grid min-w-0 gap-1">
                  <div className="flex flex-wrap items-center justify-between gap-2"><span className="flex items-center gap-2"><b>{t.child.first_name}</b>{t.child.passenger_type !== "child" && <span className="pill p-info">{PASSENGER_LT[t.child.passenger_type as PassengerType]}</span>}<Pill s={t.status} /></span><span className="num font-bold">{eur(t.price_eur)}</span></div>
                  <div className="break-words font-semibold">{t.from_label} <span className="muted font-normal">→</span> {t.to_label}</div>
                  <div className="text-sm muted">{t.from_address} → {t.to_address} · moka {t.payer?.full_name}{t.payer?.phone ? `, ${t.payer.phone}` : ""}</div>
                  {t.child.passenger_type === "senior" && <div className="text-sm">Palydėti iki durų ir padėti įlipti.</div>}
                  {t.child.passenger_type !== "child" && t.child.dropoff === "handover" && <div className="text-sm">Perduoti{t.child.handover_to ? `: ${t.child.handover_to}` : " asmeniui"}.</div>}
                  {t.child.notes && <div className="text-sm">Pastaba: {t.child.notes}</div>}
                  {!driverId && (
                    <form action={assignTrip} className="flex flex-wrap items-center gap-2 text-sm"><input type="hidden" name="id" value={t.id} />
                      <label className="flex items-center gap-2">Vairuotojas<select name="driver_id" defaultValue={t.driver_id ?? ""} className="input"><option value="" disabled>Nepriskirta</option>{drivers.map((d) => <option key={d.profile_id} value={d.profile_id}>{d.profile.full_name}</option>)}</select></label>
                      <button className="btn">Priskirti</button></form>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <a className="btn" href={mapsLink(t.from_address, t.to_address)} target="_blank" rel="noopener">Maršrutas</a>
                    {t.status === "scheduled" && <form action={setTripStatus}><input type="hidden" name="id" value={t.id} /><input type="hidden" name="status" value="picked_up" /><button className="btn btn-primary">Vaikas paimtas</button></form>}
                    {t.status === "picked_up" && <form action={setTripStatus}><input type="hidden" name="id" value={t.id} /><input type="hidden" name="status" value="delivered" /><button className="btn btn-ok">Nuvežtas</button></form>}
                    {t.status === "scheduled" && <form action={setTripStatus}><input type="hidden" name="id" value={t.id} /><input type="hidden" name="status" value="no_show" /><button className="btn">Neatvyko</button></form>}
                    {t.status === "scheduled" && <form action={cancelTrip}><input type="hidden" name="id" value={t.id} /><button className="btn btn-bad">Atšaukti</button></form>}
                    {t.status === "scheduled" && <form action={moveTrip} className="flex gap-2"><input type="hidden" name="id" value={t.id} /><input type="datetime-local" name="pickup_at" required aria-label="Naujas laikas" defaultValue={new Date(t.pickup_at).toLocaleString("sv-SE", { timeZone: "Europe/Vilnius" }).slice(0, 16).replace(" ", "T")} /><button className="btn">Perkelti</button></form>}
                  </div>
                </div>
              </div>
            ))}
          </section>
        );
      })}
    </>
  );
}

