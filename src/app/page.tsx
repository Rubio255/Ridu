import { redirect } from "next/navigation";
import { currentProfile } from "@/lib/auth";
import { loadDrivers, assignable } from "@/lib/drivers";
import { Welcome } from "@/components/welcome";
import { Logo } from "@/components/logo";
import Link from "next/link";

// Viešas pirmas puslapis klientams, kurie apie Ridu sužinojo įstaigoje. Prisijungę nukreipiami į savo aplikaciją.
export default async function Home() {
  const p = await currentProfile();
  if (p) redirect(p.role === "owner" ? "/savininkas" : p.role === "driver" ? "/vairuotojas" : "/tevai/pradzia");
  const drivers = (await loadDrivers()).filter(assignable);
  return (
    <>
      <header className="bg-[var(--brand)] text-[var(--brand-fg)]">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3"><Logo /><b>Ridu</b></div>
          <Link href="/prisijungti" className="rounded-md border border-current px-3 py-1 text-sm">Prisijungti</Link>
        </div>
      </header>
      <main className="mx-auto grid max-w-5xl gap-4 px-4 py-5 pb-12"><Welcome drivers={drivers} guest mine={false} /></main>
    </>
  );
}
