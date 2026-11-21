import Link from "next/link";
import { redirect } from "next/navigation";
import { currentAuthState } from "@/lib/auth";
import { Logo } from "@/components/logo";
import { signOut } from "@/app/actions";
import { MfaForm } from "./mfa-form";

const HOME = { owner: "/savininkas", driver: "/vairuotojas", client: "/tevai" } as const;

// Antras prisijungimo žingsnis: kodas iš autentifikavimo programėlės (Google Authenticator, Microsoft Authenticator, 1Password ir pan.).
// MB ir vairuotojams privalomas, klientai jį įsijungia „Saugumo nustatymuose“.
export default async function Page({ searchParams }: { searchParams: Promise<{ ijungti?: string }> }) {
  const s = await currentAuthState();
  if (!s) redirect("/prisijungti");
  const { ijungti } = await searchParams;
  const mode = s.mfa === "verify" ? "verify" : s.mfa === "enroll" || (ijungti && !s.hasMfa) ? "enroll" : null;
  if (!mode) redirect(HOME[s.profile.role]);
  const required = s.profile.role !== "client";
  return (
    <main className="mx-auto grid max-w-sm content-start gap-5 px-4 pb-10 pt-6">
      <div className="grid justify-items-center gap-2 text-center">
        <Logo size={56} />
        <h1 className="text-2xl font-bold">{mode === "enroll" ? "Apsaugokite paskyrą" : "Patvirtinkite, kad tai jūs"}</h1>
        <p className="text-sm muted">
          {mode === "enroll"
            ? required ? "Įmonės ir vairuotojų paskyroms reikia antro prisijungimo žingsnio. Tai užtrunka minutę." : "Be kodo iš laiško dar prašysime kodo iš jūsų telefono."
            : "Įveskite 6 skaitmenų kodą iš autentifikavimo programėlės."}
        </p>
      </div>
      <div className="card gap-3"><MfaForm mode={mode} /></div>
      {required || mode === "verify" ? (
        <form action={signOut} className="justify-self-center"><button className="text-sm underline muted">Atsijungti</button></form>
      ) : (
        <Link href="/tevai/saugumas" className="justify-self-center text-sm underline muted">Ne dabar</Link>
      )}
    </main>
  );
}
