import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { deleteAccount } from "@/app/actions";
import { Logo } from "@/components/logo";

const HOME: Record<string, string> = { owner: "/savininkas", driver: "/vairuotojas", client: "/tevai" };

// Paskyros puslapis visiems vaidmenims. Apple reikalauja, kad paskyrą būtų galima ištrinti programėlėje.
export default async function Page({ searchParams }: { searchParams: Promise<{ klaida?: string }> }) {
  const p = await requireProfile();
  const { klaida } = await searchParams;
  return (
    <main className="mx-auto grid max-w-xl gap-4 px-4 py-6">
      <div className="flex items-center gap-3"><Logo /><h1 className="text-2xl font-bold">Paskyra</h1></div>
      <div className="card">
        <div><b>{p.full_name || "Be vardo"}</b></div>
        <div className="text-sm muted">{p.email}</div>
        <Link href={HOME[p.role] ?? "/"} className="btn mt-2 justify-self-start">← Grįžti</Link>
      </div>
      {p.role === "owner" ? (
        <div className="card text-sm muted">MB savininko paskyros ištrinti negalima.</div>
      ) : (
        <form action={deleteAccount} className="card gap-3 border-2 border-[var(--bad)]">
          <h2 className="text-lg font-bold">Ištrinti paskyrą</h2>
          <ul className="grid list-disc gap-1 pl-5 text-sm">
            <li>{p.role === "driver" ? "Nebegausite naujų kelionių" : "Bus atšauktos jūsų užsakytos būsimos kelionės ir baigti abonementai"}{p.role === "driver" ? ". Jūsų kelionės bus perduotos MB, kad jas perskirtų kitiems vairuotojams" : ""}.</li>
            <li>Ištrinsime jūsų vardą, telefoną, el. paštą, adresus ir pranešimų nustatymus. Prisijungti nebegalėsite.</li>
            <li>Sąskaitas ir atliktų kelionių įrašus be jūsų asmens duomenų saugome tiek, kiek reikalauja buhalterinės apskaitos įstatymai.</li>
          </ul>
          {klaida && <p className="text-sm text-[var(--bad)]">Patvirtinkite pažymėdami langelį.</p>}
          <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="confirm" required /> Suprantu, kad to atšaukti nebus galima.</label>
          <button className="btn border-[var(--bad)] text-[var(--bad)]">Ištrinti paskyrą</button>
        </form>
      )}
    </main>
  );
}
