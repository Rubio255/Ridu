import { PASSENGER_LT, type PassengerType } from "@/lib/pricing";
import { supabaseAdmin } from "@/lib/supabase/server";
import { inviteClient, addChild, setClientActive, setClientPlan } from "@/app/actions";
import { loadSettings } from "@/lib/auth";
import { plansOf } from "@/lib/settings";
import { eur } from "@/lib/time";
import { CONSENTS, TERMS_VERSION } from "@/lib/terms";

const SHORT: Record<string, string> = { terms: "Taisyklės", privacy: "Privatumas", guardian: "Atstovas", health: "Sveikatos duomenys", alone: "Paleisti vieną", news: "Naujienos" };

export default async function Page() {
  const db = supabaseAdmin(), plans = plansOf(await loadSettings());
  const [{ data: clients }, { data: kids }, { data: cons }] = await Promise.all([
    db.from("profiles").select("*").eq("role", "client").order("full_name"),
    db.from("children").select("*, guardians:child_guardians(profile:profiles(full_name, email))").order("first_name"),
    db.from("current_consents").select("profile_id, key, granted, terms_version, created_at"),
  ]);
  const consentLine = (id: string) => {
    const mine = (cons ?? []).filter((c) => c.profile_id === id && c.granted && c.terms_version === TERMS_VERSION);
    if (!CONSENTS.filter((c) => c.required).every((c) => mine.some((m) => m.key === c.key))) return "Dar nesutiko su sąlygomis";
    const at = mine.map((m) => m.created_at).sort().pop()!;
    return `Sutiko ${new Date(at).toLocaleDateString("lt-LT", { timeZone: "Europe/Vilnius" })}: ${CONSENTS.filter((c) => mine.some((m) => m.key === c.key)).map((c) => SHORT[c.key]).join(", ")}`;
  };
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
            <div><b>{c.full_name || c.email}</b><div className="text-sm muted">{c.email}{c.phone ? ` · ${c.phone}` : ""}{c.contract_no ? ` · ${c.contract_no}` : ""}</div><div className="text-xs muted">{consentLine(c.id)}</div></div>
            <form action={setClientPlan} className="flex items-center gap-2"><input type="hidden" name="id" value={c.id} />
              <select name="plan_id" defaultValue={c.plan_id ?? ""} className="input" aria-label="Kredito planas"><option value="">Be plano</option>{plans.map((p) => <option key={p.id} value={p.id}>{p.name} {eur(p.price)}</option>)}</select>
              <button className="btn">Išsaugoti</button></form>
            <form action={setClientActive}><input type="hidden" name="id" value={c.id} /><input type="hidden" name="active" value={c.active ? "0" : "1"} /><button className="btn">{c.active ? "Išjungti" : "Įjungti"}</button></form>
          </div>
        ))}
      </section>
      <section className="card content-start">
        <h2 className="font-bold">Pridėti keleivį</h2>
        <form action={addChild} className="grid gap-3">
          <label className="grid gap-1 text-sm font-semibold muted">Keleivis<select name="passenger_type" className="input">{Object.entries(PASSENGER_LT).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="grid gap-1 text-sm font-semibold muted">Vardas<input name="first_name" required className="input" /></label>
            <label className="grid gap-1 text-sm font-semibold muted">Gimimo metai<input name="birth_year" type="number" className="input" /></label>
            <label className="grid gap-1 text-sm font-semibold muted">Sėdynė (vaikui)<select name="seat" className="input"><option>Kėdutė</option><option>Paaukštinimas</option><option>Nereikia</option></select></label>
          </div>
          <label className="grid gap-1 text-sm font-semibold muted">Pastabos (vaikui – alergijos, kam galima perduoti; suaugusiam – be sveikatos duomenų)<textarea name="notes" rows={2} className="input" /></label>
          <fieldset className="grid gap-1"><legend className="text-sm font-semibold muted">Kas gali užsakyti (vaikui – globėjai, abu tėvai gali turėti atskiras paskyras)</legend>
            {(clients ?? []).map((c) => <label key={c.id} className="flex items-center gap-2 text-sm"><input type="checkbox" name="guardians" value={c.id} />{c.full_name || c.email}</label>)}
          </fieldset>
          <button className="btn btn-primary">Pridėti keleivį</button>
        </form>
        <h2 className="pt-2 font-bold">Keleiviai</h2>
        {(kids ?? []).map((k) => (
          <div key={k.id} className="border-t border-[var(--line)] pt-3"><b>{k.first_name}</b>{k.birth_year ? `, ${k.birth_year} m.` : ""} <span className="text-xs muted">{k.passenger_type === "child" ? k.seat : PASSENGER_LT[k.passenger_type as PassengerType]}</span>
            <div className="text-sm muted">{k.passenger_type === "child" ? "Globėjai" : "Užsakyti gali"}: {k.guardians.map((g: { profile: { full_name: string; email: string } }) => g.profile.full_name || g.profile.email).join(", ") || "nėra"}</div></div>
        ))}
      </section>
    </div>
  );
}
