// Kainos imamos iš nustatymų duomenų bazėje, todėl puslapis neprerenderinamas kūrimo metu
export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { currentAuthState, loadSettings } from "@/lib/auth";
import { PublicPage } from "@/components/info";
import { PlanPicker, isPlanId } from "@/components/plan-picker";

// Naujo kliento pirmas žingsnis: pirmiausia renkasi abonementą, tik tada registruojasi arba prisijungia
export default async function Page({ searchParams }: { searchParams: Promise<{ planas?: string }> }) {
  const [{ planas }, a] = await Promise.all([searchParams, currentAuthState()]);
  if (a) redirect("/tevai/planas");
  const s = await loadSettings();
  return (
    <PublicPage title="Pasirinkite abonementą" start={false}>
      <p className="muted">Pasirinkite planą. Kitame žingsnyje susikursite paskyrą.</p>
      <form action="/prisijungti" method="get" className="grid gap-3">
        <PlanPicker s={s} name="planas" chosen={isPlanId(planas) ? planas : "family"} submit="Tęsti" />
      </form>
    </PublicPage>
  );
}
