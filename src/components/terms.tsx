import { saveConsents } from "@/app/actions";
import { CONSENTS, FULL_TERMS_URL, TERMS, TERMS_VERSION } from "@/lib/terms";
import type { ConsentState } from "@/lib/consents";

export function TermsList() {
  return (
    <section className="card">
      <h2 className="font-bold">Paslaugų teikimo sąlygos</h2>
      <ol className="grid list-decimal gap-2 pl-5">
        {TERMS.map(([t, body]) => <li key={t}><b>{t}.</b> {body}</li>)}
      </ol>
      <p className="text-sm muted">Sąlygų versija {TERMS_VERSION}. <a className="underline" href={FULL_TERMS_URL} target="_blank" rel="noopener">Pilnos taisyklės ir privatumo politika</a></p>
    </section>
  );
}

// Sutikimai: atskiri, iš anksto nepažymėti. Pažymėta lieka tik tai, ką klientas jau patvirtino šioje versijoje.
export function ConsentForm({ state, next, submit }: { state: ConsentState; next?: string; submit: string }) {
  return (
    <form action={saveConsents} className="card">
      <h2 className="font-bold">Sutikimai</h2>
      {next && <input type="hidden" name="next" value={next} />}
      {CONSENTS.map((c) => {
        const on = !!state[c.key]?.granted && state[c.key]?.version === TERMS_VERSION;
        return (
          <label key={c.key} className="flex items-start gap-3">
            <input type="checkbox" name={c.key} defaultChecked={on} required={c.required} className="mt-1 h-5 w-5 flex-none" />
            <span>{c.label} <span className={`text-xs ${c.required ? "text-[var(--bad)]" : "muted"}`}>{c.required ? "privaloma" : "savanoriška"}</span></span>
          </label>
        );
      })}
      <p className="text-sm muted">Savanoriškus sutikimus galite bet kada pakeisti skiltyje „Sąlygos“.</p>
      <button className="btn btn-primary">{submit}</button>
    </form>
  );
}
