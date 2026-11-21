import { loadSettings } from "@/lib/auth";
import { saveSettings } from "@/app/actions";
import { SETTINGS_GROUPS } from "@/lib/settings";

export default async function Page() {
  const s = await loadSettings();
  return (
    <form action={saveSettings} className="grid gap-4">
      <h1 className="text-xl font-bold">Kainos ir nustatymai</h1>
      {SETTINGS_GROUPS.map((g) => (
        <section key={g.title} className="card">
          <h2 className="font-bold">{g.title}</h2>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {g.fields.map(([k, label]) => {
              const v = s[k];
              return <label key={k} className="grid gap-1 text-sm font-semibold muted">{label}
                <input name={k} defaultValue={String(v)} className="input" type={typeof v === "string" ? (k.endsWith("_windows") ? "text" : "time") : "number"} step="any" min={typeof v === "number" ? 0 : undefined} /></label>;
            })}
          </div>
        </section>
      ))}
      <section className="card">
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="surcharge_approved" defaultChecked={s.surcharge_approved} /> Patvirtinu savaitgalio ir švenčių priemoką ({s.weekend_pct} %)</label>
      </section>
      <div><button className="btn btn-primary">Išsaugoti</button> <span className="text-sm muted">Naujos kainos taikomos naujiems užsakymams. Galiojančių užsakymų kaina nesikeičia.</span></div>
    </form>
  );
}
