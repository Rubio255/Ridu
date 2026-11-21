import { Shell } from "@/components/shell";
import { requireProfile } from "@/lib/auth";
import { EnablePush } from "@/components/enable-push";
import { hasRequired, loadConsents, clientHasKids } from "@/lib/consents";
import { ConsentForm, TermsList } from "@/components/terms";

const TABS: [string, string][] = [["/tevai", "Pagrindinis"]]; // klientams rodoma apatinė navigacija

export default async function L({ children }: { children: React.ReactNode }) {
  const p = await requireProfile();
  // Pirmą kartą prisijungus (ar pasikeitus sąlygoms) klientas turi sutikti su privalomais punktais
  const [consents, kids] = p.role === "owner" ? [null, true] : await Promise.all([loadConsents(p.id), clientHasKids(p.id)]);
  if (consents && !hasRequired(consents, kids)) {
    return (
      <Shell title="Ridu" name={p.full_name || p.email || ""} tabs={[]} client>
        <div className="card"><h1 className="text-xl font-bold">Sveiki!</h1><p>Prieš užsakydami keliones, perskaitykite sąlygas ir pažymėkite sutikimus.</p></div>
        <TermsList />
        <ConsentForm state={consents} next="tevai" submit="Sutinku ir tęsiu" hasKids={kids} />
      </Shell>
    );
  }
  return (
    <Shell title="Ridu" name={p.full_name || p.email || ""} tabs={TABS} client>
      <EnablePush who="client" />
      {children}
    </Shell>
  );
}
