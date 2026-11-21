import { redirect } from "next/navigation";
import { currentAuthState } from "@/lib/auth";
import { Start } from "@/components/welcome";

// Viešas pirmas puslapis klientams, kurie apie Ridu sužinojo įstaigoje. Prisijungę nukreipiami į savo aplikaciją.
export default async function Home() {
  const s = await currentAuthState();
  if (s && s.mfa !== "ok") redirect("/prisijungti/patvirtinti");
  const p = s?.profile;
  if (p) redirect(p.role === "owner" ? "/savininkas" : p.role === "driver" ? "/vairuotojas" : "/tevai");
  return (
    <>
      <main className="mx-auto grid max-w-xl gap-4 px-4 py-5 pb-12"><Start /></main>
    </>
  );
}
