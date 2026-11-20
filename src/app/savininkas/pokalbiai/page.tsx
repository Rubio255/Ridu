import { requireOwner } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/server";
import { loadDrivers } from "@/lib/drivers";
import { setVisitStatus } from "@/app/actions";
import { VISIT_HOW, VISIT_STATUS, VISIT_WHO } from "@/lib/welcome";

export default async function Page() {
  await requireOwner();
  const [{ data }, drivers] = await Promise.all([
    supabaseAdmin().from("visit_requests").select("*").in("status", ["new", "confirmed"]).order("wanted_date").order("wanted_time"),
    loadDrivers(),
  ]);
  return (
    <section className="card">
      <h1 className="text-xl font-bold">Pažintinių pokalbių užklausos</h1>
      {(data ?? []).map((v) => (
        <form key={v.id} action={setVisitStatus} className="grid gap-1 border-t border-[var(--line)] pt-3"><input type="hidden" name="id" value={v.id} />
          <div className="flex flex-wrap justify-between gap-2"><b>{v.wanted_date} {String(v.wanted_time).slice(0, 5)} · {v.name}</b><span className={`pill ${VISIT_STATUS[v.status][1]}`}>{VISIT_STATUS[v.status][0]}</span></div>
          <div className="text-sm muted">{VISIT_HOW[v.how as keyof typeof VISIT_HOW]} · {VISIT_WHO[v.who as keyof typeof VISIT_WHO]}{v.phone ? ` · ${v.phone}` : ""}{v.org ? ` · sužinojo: ${v.org}` : ""}</div>
          {v.note && <div className="text-sm">{v.note}</div>}
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <label className="flex items-center gap-2">Vairuotojas<select name="driver_id" defaultValue={v.driver_id ?? ""} className="input w-auto">{drivers.filter((d) => d.active).map((d) => <option key={d.profile_id} value={d.profile_id}>{d.profile.full_name}</option>)}</select></label>
            {v.status === "new" ? <button name="status" value="confirmed" className="btn btn-ok">Patvirtinti</button> : <button name="status" value="done" className="btn">Įvyko</button>}
            <button name="status" value="declined" className="btn btn-bad">Atšaukti</button>
          </div>
        </form>
      ))}
      {!(data ?? []).length && <p className="muted">Naujų užklausų nėra.</p>}
      <p className="text-sm muted">Patvirtinus vairuotojas ir prisijungęs klientas gauna pranešimą. Naujam klientui paskambinkite nurodytu telefonu. Po pokalbio pakvieskite jį į aplikaciją skiltyje „Klientai“.</p>
    </section>
  );
}
