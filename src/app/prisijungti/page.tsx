import { Logo } from "@/components/logo";
import { LoginForm } from "./login-form";

export default async function Page({ searchParams }: { searchParams: Promise<{ klaida?: string }> }) {
  const { klaida } = await searchParams;
  return (
    <main className="mx-auto grid min-h-dvh max-w-sm content-center gap-6 px-4">
      <div className="grid gap-2">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-[var(--accent)] font-bold text-[var(--accent-fg)]">V</div>
        <Logo size={64} />
        <h1 className="text-2xl font-bold">Išsiskyrusiems</h1>
        <p className="text-sm text-[var(--muted)]">Prisijungti gali klientai, su kuriais sudaryta sutartis. Įveskite el. paštą ir gausite prisijungimo nuorodą.</p>
      </div>
      {klaida === "neaktyvus" && <p className="rounded-lg bg-[var(--bad-bg)] p-3 text-sm text-[var(--bad)]">Jūsų paskyra neaktyvi. Susisiekite su vairuotoju.</p>}
      <LoginForm />
    </main>
  );
}
