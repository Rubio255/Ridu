import { requireProfile } from "@/lib/auth";
import { loadConsents, clientHasKids } from "@/lib/consents";
import { ConsentForm, TermsList } from "@/components/terms";

export default async function Page() {
  const me = await requireProfile();
  const state = await loadConsents(me.id);
  const at = Object.values(state).map((x) => x!.at).sort().pop();
  return (
    <>
      <h1 className="text-xl font-bold">Sąlygos</h1>
      <TermsList />
      <ConsentForm state={state} submit="Išsaugoti sutikimus" hasKids={await clientHasKids(me.id)} />
      {at && <p className="text-sm muted">Paskutinį kartą keista {new Date(at).toLocaleString("lt-LT", { timeZone: "Europe/Vilnius" })}.</p>}
    </>
  );
}
