import { Logo } from "@/components/logo";
import { LoginForm } from "./login-form";

export default async function Page({ searchParams }: { searchParams: Promise<{ klaida?: string }> }) {
  const { klaida } = await searchParams;
  return (
    <main className="mx-auto grid min-h-dvh max-w-sm content-center gap-6 px-4">
      <div className="grid gap-2">
        <Logo size={64} />
        <h1 className="text-2xl font-bold">Ridu</h1>
        <p className="text-sm text-[var(--muted)]">Prisijungti gali klientai, su kuriais sudaryta sutartis, vairuotojai ir MB. Įveskite el. paštą, ir atsiųsime prisijungimo kodą.</p>
      </div>
      {klaida === "neaktyvus" && <p className="rounded-lg bg-[var(--bad-bg)] p-3 text-sm text-[var(--bad)]">Jūsų paskyra neaktyvi. Susisiekite su mumis.</p>}
      <LoginForm />
    </main>
  );
}
