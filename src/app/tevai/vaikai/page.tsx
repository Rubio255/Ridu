import { requireProfile } from "@/lib/auth";
import { supabaseServer, supabaseAdmin } from "@/lib/supabase/server";
import { addPlace, saveCodeWord, addRelative, removeRelative } from "@/app/actions";
import { PassengerForm } from "./pax-form";
import { PASSENGER_LT, type PassengerType } from "@/lib/pricing";

const NO_SPECIAL = "Važiuojame įprastais automobiliais, todėl negalime vežti keleivių, kurie turi keliauti sėdėdami vežimėlyje ar ant neštuvų. Sulankstomą vaikštynę ar vežimėlį vežame bagažinėje. Tai ne medicininis pervežimas.";

const KIND: Record<string, string> = { home: "Namai", kindergarten: "Darželis", school: "Mokykla", activity: "Būrelis", work: "Darbas", clinic: "Poliklinika ar gydytojas", other: "Kita" };

export default async function Page({ searchParams }: { searchParams: Promise<{ klaida?: string; pridetas?: string }> }) {
  const me = await requireProfile();
  const q = await searchParams;
  const sb = await supabaseServer();
  const [{ data: kids }, { data: places }] = await Promise.all([
    sb.from("children").select("*").order("first_name"),
    sb.from("places").select("*").eq("profile_id", me.id).order("created_at"),
  ]);
  // Kas gauna pranešimus apie kiekvieno keleivio keliones (abu tėvai, artimieji)
  const ids = (kids ?? []).map((c) => c.id);
  const { data: gs } = ids.length ? await supabaseAdmin().from("child_guardians").select("child_id, profile_id, relation, profile:profiles(full_name, email)").in("child_id", ids) : { data: [] };
  const who = (id: string) => (gs ?? []).filter((g) => g.child_id === id).map((g) => ({ ...g, p: g.profile as unknown as { full_name: string; email: string | null } | null }));
  const childKids = (kids ?? []).filter((c) => c.passenger_type === "child"), adults = (kids ?? []).filter((c) => c.passenger_type !== "child");
  return (
    <div className="grid gap-4">
    {childKids.length > 0 && (
      <section id="slaptas-zodis" className="card scroll-mt-20">
        <h2 className="text-lg font-bold">Slaptas žodis vaikui</h2>
        <p className="text-sm muted">Vairuotojas pasakys šį žodį vaikui prie mokyklos ar darželio. Vaikas sėda į automobilį tik išgirdęs jį. Pasirinkite žodį, kurį vaikas lengvai prisimins, pvz. „Drakonas“.</p>
        {childKids.map((c) => (
          <form key={c.id} action={saveCodeWord} className="flex flex-wrap items-end gap-2 border-t border-[var(--line)] pt-3 first-of-type:border-0 first-of-type:pt-0">
            <input type="hidden" name="id" value={c.id} />
            <label className="grid min-w-0 flex-1 gap-1 text-sm font-semibold muted">{c.first_name}
              <input name="code_word" maxLength={40} defaultValue={c.code_word ?? ""} className="input text-lg font-bold tracking-wider" placeholder="Įrašykite žodį" /></label>
            <button className="btn btn-primary">Išsaugoti</button>
          </form>
        ))}
      </section>
    )}
    <section id="artimieji" className="card scroll-mt-20">
      <h2 className="text-lg font-bold">Kas gauna pranešimus</h2>
      <p className="text-sm muted">Kai keleivis paimamas ir nuvežamas, pranešimą gauna visi čia išvardyti žmonės.</p>
      {q.pridetas && <div className="pill p-ok justify-self-start normal-case">Pridėta. Artimajam išsiųstas kvietimas el. paštu.</div>}
      {q.klaida && <div className="pill p-bad justify-self-start normal-case">{q.klaida}</div>}
      {(kids ?? []).map((c) => (
        <div key={c.id} className="grid gap-2 border-t border-[var(--line)] pt-3 first-of-type:border-0">
          <b>{c.first_name}</b>
          <ul className="grid gap-1">
            {who(c.id).map((g) => (
              <li key={g.profile_id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span>{g.profile_id === me.id ? "Jūs" : g.p?.full_name || g.p?.email || "Artimasis"}{g.relation === "artimasis" ? <span className="muted"> · artimasis</span> : null}</span>
                {g.relation === "artimasis" && g.profile_id !== me.id && (
                  <form action={removeRelative}><input type="hidden" name="id" value={c.id} /><input type="hidden" name="profile_id" value={g.profile_id} /><button className="btn text-xs">Pašalinti</button></form>
                )}
              </li>
            ))}
          </ul>
          {c.passenger_type === "child" && <p className="text-xs muted">Kitą vaiko tėvą ar globėją prideda MB pagal sutartį. Parašykite mums, jei reikia.</p>}
        </div>
      ))}
      {adults.length > 0 && (
        <form action={addRelative} className="grid gap-3 border-t border-[var(--line)] pt-3">
          <h3 className="font-bold">Pridėti artimąjį</h3>
          <p className="text-sm muted">Pvz. dukra ar sūnus, kuris nori žinoti, kad mama saugiai nuvežta. Jis gaus kvietimą el. paštu ir matys šio keleivio keliones.</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="grid gap-1 text-sm font-semibold muted">Keleivis<select name="id" className="input">{adults.map((c) => <option key={c.id} value={c.id}>{c.first_name}</option>)}</select></label>
            <label className="grid gap-1 text-sm font-semibold muted">Artimojo vardas<input name="full_name" required className="input" /></label>
            <label className="grid gap-1 text-sm font-semibold muted">El. paštas<input name="email" type="email" required className="input" /></label>
          </div>
          <button className="btn btn-primary justify-self-start">Pridėti ir pakviesti</button>
        </form>
      )}
    </section>
    <div className="grid gap-4 md:grid-cols-2">
      <section className="card">
        <h2 className="font-bold">Keleiviai</h2>
        {(kids ?? []).map((c) => (
          <div key={c.id} className="grid gap-1 border-t border-[var(--line)] pt-3 first:border-0 first:pt-0">
            <div className="flex justify-between gap-2"><b>{c.first_name}{c.birth_year ? `, ${new Date().getFullYear() - c.birth_year} m.` : ""}</b><span className="text-xs muted">{c.passenger_type === "child" ? c.seat : c.is_self ? "Aš pats" : PASSENGER_LT[c.passenger_type as PassengerType]}</span></div>
            {c.passenger_type !== "child" && !c.is_self && <div className="text-sm muted">{c.dropoff === "handover" ? `Palydėti ir perduoti${c.handover_to ? `: ${c.handover_to}` : ""}` : "Išlipa pats"}</div>}
            {c.notes && <div className="text-sm">{c.notes}</div>}
          </div>
        ))}
        <p className="text-sm muted">Galite užsakyti sau, savo vaikui ar kitam žmogui, pavyzdžiui, tėvams. Vaikus ir jų globėjus įrašo MB pagal sutartį. {NO_SPECIAL}</p>
        <PassengerForm myName={me.full_name ?? ""} />
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
    </div>
  );
}
