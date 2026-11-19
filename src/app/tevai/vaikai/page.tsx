import { requireProfile } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { addPlace } from "@/app/actions";

const KIND: Record<string, string> = { home: "Namai", kindergarten: "Darželis", school: "Mokykla", activity: "Būrelis", other: "Kita" };

export default async function Page() {
  const me = await requireProfile();
  const sb = await supabaseServer();
  const [{ data: kids }, { data: places }] = await Promise.all([
    sb.from("children").select("*").order("first_name"),
    sb.from("places").select("*").eq("profile_id", me.id).order("created_at"),
  ]);
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <section className="card">
        <h2 className="font-bold">Vaikai</h2>
        {(kids ?? []).map((c) => (
          <div key={c.id} className="grid gap-1 border-t border-[var(--line)] pt-3 first:border-0 first:pt-0">
            <div className="flex justify-between gap-2"><b>{c.first_name}{c.birth_year ? `, ${new Date().getFullYear() - c.birth_year} m.` : ""}</b><span className="text-xs muted">{c.seat}</span></div>
            {c.notes && <div className="text-sm">{c.notes}</div>}
          </div>
        ))}
        <p className="text-sm muted">Vaikus ir jų globėjus įrašo vairuotojas pagal sutartį.</p>
      </section>
      <section className="card">
        <h2 className="font-bold">Mano adresai</h2>
        {(places ?? []).map((p) => (
          <div key={p.id} className="grid gap-1 border-t border-[var(--line)] pt-3 first:border-0 first:pt-0">
            <div className="flex justify-between gap-2"><b>{p.label}</b><span className="text-xs muted">{KIND[p.kind]}</span></div>
            <div className="text-sm muted">{p.address}</div>
          </div>
        ))}
        <form action={addPlace} className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm font-semibold muted">Pavadinimas<input name="label" required className="input" placeholder="Pvz. Šokių studija" /></label>
            <label className="grid gap-1 text-sm font-semibold muted">Tipas<select name="kind" className="input">{Object.entries(KIND).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
          </div>
          <label className="grid gap-1 text-sm font-semibold muted">Adresas<input name="address" required className="input" placeholder="Gatvė, namas, Vilnius" /></label>
          <button className="btn btn-primary">Pridėti adresą</button>
        </form>
      </section>
    </div>
  );
}
