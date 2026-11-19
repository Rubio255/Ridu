import { supabaseAdmin } from "@/lib/supabase/server";
import { inviteClient, addChild, setClientActive } from "@/app/actions";

export default async function Page() {
  const db = supabaseAdmin();
  const [{ data: clients }, { data: kids }] = await Promise.all([
    db.from("profiles").select("*").eq("role", "client").order("full_name"),
    db.from("children").select("*, guardians:child_guardians(profile:profiles(full_name, email))").order("first_name"),
  ]);
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <section className="card content-start">
        <h2 className="font-bold">Pakviesti klientą</h2>
        <p className="text-sm muted">Klientas gaus el. laišką su prisijungimo nuoroda. Prisijungti gali tik pakviesti klientai.</p>
        <form action={inviteClient} className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm font-semibold muted">Vardas, pavardė<input name="full_name" required className="input" /></label>
            <label className="grid gap-1 text-sm font-semibold muted">El. paštas<input name="email" type="email" required className="input" /></label>
            <label className="grid gap-1 text-sm font-semibold muted">Telefonas<input name="phone" className="input" /></label>
            <label className="grid gap-1 text-sm font-semibold muted">Sutarties nr.<input name="contract_no" className="input" /></label>
          </div>
          <button className="btn btn-primary">Siųsti kvietimą</button>
        </form>
        <h2 className="pt-2 font-bold">Klientai</h2>
        {(clients ?? []).map((c) => (
          <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--line)] pt-3">
            <div><b>{c.full_name || c.email}</b><div className="text-sm muted">{c.email}{c.phone ? ` · ${c.phone}` : ""}{c.contract_no ? ` · ${c.contract_no}` : ""}</div></div>
            <form action={setClientActive}><input type="hidden" name="id" value={c.id} /><input type="hidden" name="active" value={c.active ? "0" : "1"} /><button className="btn">{c.active ? "Išjungti" : "Įjungti"}</button></form>
          </div>
        ))}
      </section>
      <section className="card content-start">
        <h2 className="font-bold">Pridėti vaiką</h2>
        <form action={addChild} className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="grid gap-1 text-sm font-semibold muted">Vardas<input name="first_name" required className="input" /></label>
            <label className="grid gap-1 text-sm font-semibold muted">Gimimo metai<input name="birth_year" type="number" className="input" /></label>
            <label className="grid gap-1 text-sm font-semibold muted">Sėdynė<select name="seat" className="input"><option>Kėdutė</option><option>Paaukštinimas</option><option>Nereikia</option></select></label>
          </div>
          <label className="grid gap-1 text-sm font-semibold muted">Pastabos (alergijos, kam galima perduoti)<textarea name="notes" rows={2} className="input" /></label>
          <fieldset className="grid gap-1"><legend className="text-sm font-semibold muted">Globėjai (abu tėvai gali turėti atskiras paskyras)</legend>
            {(clients ?? []).map((c) => <label key={c.id} className="flex items-center gap-2 text-sm"><input type="checkbox" name="guardians" value={c.id} />{c.full_name || c.email}</label>)}
          </fieldset>
          <button className="btn btn-primary">Pridėti vaiką</button>
        </form>
        <h2 className="pt-2 font-bold">Vaikai</h2>
        {(kids ?? []).map((k) => (
          <div key={k.id} className="border-t border-[var(--line)] pt-3"><b>{k.first_name}</b>{k.birth_year ? `, ${k.birth_year} m.` : ""} <span className="text-xs muted">{k.seat}</span>
            <div className="text-sm muted">Globėjai: {k.guardians.map((g: { profile: { full_name: string; email: string } }) => g.profile.full_name || g.profile.email).join(", ") || "nėra"}</div></div>
        ))}
      </section>
    </div>
  );
}
