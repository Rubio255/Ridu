import { Logo } from "@/components/logo";
import { LoginForm } from "./login-form";
import Link from "next/link";
import { Users, CarFront, ChevronLeft } from "lucide-react";

// Prisijungimo tipas pasirenkamas paveikslėliais. Tikrą vaidmenį nustato paskyra (MB savininkas jungiasi tuo pačiu laukeliu, bet viešai to nerodome).
const KINDS = [
  { id: "klientas", Icon: Users, label: "Klientas", title: "Kliento prisijungimas" },
  { id: "vairuotojas", Icon: CarFront, label: "Vairuotojas", title: "Vairuotojo prisijungimas" },
] as const;

export default async function Page({ searchParams }: { searchParams: Promise<{ klaida?: string; kaip?: string }> }) {
  const { klaida, kaip } = await searchParams;
  const k = KINDS.find((x) => x.id === kaip) ?? KINDS[0];
  return (
    <main className="mx-auto grid max-w-sm content-start gap-5 px-4 pb-10 pt-4">
      <Link href="/" className="flex items-center gap-1 justify-self-start text-sm font-semibold text-[var(--muted)]"><ChevronLeft size={18} />Grįžti į pradžią</Link>
      <div className="grid justify-items-center gap-2 text-center">
        <Logo size={56} />
        <h1 className="text-2xl font-bold">Prisijungimas</h1>
      </div>
      <nav aria-label="Kas jungiasi" className="grid grid-cols-2 gap-3">
        {KINDS.map((x) => (
          <Link key={x.id} href={`/prisijungti?kaip=${x.id}`} replace aria-current={x.id === k.id ? "page" : undefined}
            className={`grid justify-items-center gap-1.5 rounded-2xl border-2 p-3 text-sm font-bold ${x.id === k.id ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-[var(--line)] bg-[var(--surface)]"}`}>
            <span aria-hidden="true" className="grid h-12 w-12 place-items-center rounded-full bg-[var(--soft-blue)] text-[var(--navy)]"><x.Icon size={24} strokeWidth={1.8} /></span>{x.label}
          </Link>
        ))}
      </nav>
      <div className="card gap-3">
        <h2 className="font-bold">{k.title}</h2>
        {klaida === "neaktyvus" && <p className="rounded-lg bg-[var(--bad-bg)] p-3 text-sm text-[var(--bad)]">Jūsų paskyra neaktyvi. Susisiekite su mumis.</p>}
        <LoginForm />
      </div>
    </main>
  );
}
