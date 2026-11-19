import { Shell } from "@/components/shell";
import { requireProfile } from "@/lib/auth";
import { EnablePush } from "@/components/enable-push";
import { hasRequired, loadConsents } from "@/lib/consents";
import { ConsentForm, TermsList } from "@/components/terms";

const TABS: [string, string][] = [["/tevai", "Mano kelionės"], ["/tevai/uzsakyti", "Ilgalaikis užsakymas"], ["/tevai/sutartys", "Sutartys"], ["/tevai/vaikai", "Vaikai ir adresai"], ["/tevai/salygos", "Sąlygos"]];

export default async function L({ children }: { children: React.ReactNode }) {
  const p = await requireProfile();
  const consents = p.role === "owner" ? null : await loadConsents(p.id);
  // Pirmą kartą prisijungus (ar pasikeitus sąlygoms) klientas turi sutikti su privalomais punktais
  if (consents && !hasRequired(consents)) {
    return (
      <Shell title="Ridu" name={p.full_name || p.email || ""} tabs={[]}>
        <div className="card"><h1 className="text-xl font-bold">Sveiki!</h1><p>Prieš užsakydami keliones, perskaitykite sąlygas ir pažymėkite sutikimus.</p></div>
        <TermsList />
        <ConsentForm state={consents} next="tevai" submit="Sutinku ir tęsiu" />
      </Shell>
    );
  }
  return (
    <Shell title="Ridu" name={p.full_name || p.email || ""} tabs={TABS}>
      <EnablePush who="client" />
      {children}
    </Shell>
  );
}
