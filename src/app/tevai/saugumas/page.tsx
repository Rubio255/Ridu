import Link from "next/link";
import { BackHeader } from "@/components/client-ui";
import { SafetyInfo } from "@/components/info";
import { currentAuthState } from "@/lib/auth";
import { MfaDisable } from "@/app/prisijungti/patvirtinti/mfa-form";

export default async function Page() {
  const s = await currentAuthState();
  return (
    <>
      <BackHeader href="/tevai" title="Saugumas" />
      <section className="card gap-2">
        <h2 className="font-bold">Dviejų žingsnių prisijungimas</h2>
        <p className="text-sm muted">
          {s?.hasMfa ? "Įjungtas. Jungiantis prašysime kodo iš jūsų telefono programėlės." : "Papildoma apsauga: jungiantis prašysime ne tik kodo iš laiško, bet ir kodo iš jūsų telefono."}
        </p>
        {s?.hasMfa ? <MfaDisable /> : <Link href="/prisijungti/patvirtinti?ijungti=1" className="btn btn-primary">Įjungti</Link>}
      </section>
      <SafetyInfo />
      <Link href="/tevai/vaikai#slaptas-zodis" className="btn btn-primary btn-lg">Nustatyti slaptą žodį vaikui</Link>
    </>
  );
}
