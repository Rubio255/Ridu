import { redirect } from "next/navigation";
import { currentProfile } from "@/lib/auth";
import { Welcome, Start } from "@/components/welcome";

// Viešas pirmas puslapis klientams, kurie apie Ridu sužinojo įstaigoje. Prisijungę nukreipiami į savo aplikaciją.
export default async function Home() {
  const p = await currentProfile();
  if (p) redirect(p.role === "owner" ? "/savininkas" : p.role === "driver" ? "/vairuotojas" : "/tevai");
  return (
    <>
      <main className="mx-auto grid max-w-xl gap-4 px-4 py-5 pb-12"><Start /><Welcome guest /></main>
    </>
  );
}
