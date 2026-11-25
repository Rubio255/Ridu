"use client";
import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { Captcha, useCaptcha } from "./captcha";
import { requestPlan } from "@/app/actions";

// Prisijungimas 6 skaitmenų kodu iš laiško. Kodas veikia ir programėlėje (nuoroda iš laiško
// atsidarytų naršyklėje, ne programėlėje). Nuoroda laiške taip pat lieka veikti.
// Su plan: registracija naujam klientui (pasirinkus abonementą); esamas klientas tiesiog prisijungia.
export function LoginForm({ plan }: { plan?: string } = {}) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "checking" | "password">("idle");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const captcha = useCaptcha();
  const sb = () => createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setState("sending");
    // Be plano prisijungti gali tik esami naudotojai. Su planu sukuriama nauja kliento paskyra (profilis sukuriamas su vaidmeniu client).
    // Planas įsimenamas slapuke, kad jį išsaugotų ir nuoroda iš laiško (/auth/callback).
    if (plan) document.cookie = `ridu_plan=${plan}; path=/; max-age=3600; samesite=lax; secure`;
    const { error } = await sb().auth.signInWithOtp({ email, options: { shouldCreateUser: !!plan, data: plan ? { full_name: name.trim() } : undefined, emailRedirectTo: `${location.origin}/auth/callback`, captchaToken: captcha.token } });
    captcha.reset();
    if (error) { setError(plan ? "Nepavyko išsiųsti laiško. Patikrinkite adresą ir bandykite dar kartą." : "Šio el. pašto neradome. Patikrinkite adresą arba susisiekite su mumis."); setState("idle"); }
    else setState("sent");
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setState("checking");
    const { error } = await sb().auth.verifyOtp({ email, token: code.trim(), type: "email" });
    if (error) { setError("Kodas neteisingas arba nebegalioja. Patikrinkite arba gaukite naują."); setState("sent"); return; }
    if (plan) {
      const fd = new FormData(); fd.set("plan_id", plan);
      await requestPlan(fd).catch(() => {});
      document.cookie = "ridu_plan=; path=/; max-age=0";
    }
    location.href = "/";
  }

  // Prisijungimas slaptažodžiu: tik paskyroms, kurioms MB nustatė slaptažodį (pvz. Apple peržiūros paskyrai)
  async function withPassword(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const { error } = await sb().auth.signInWithPassword({ email, password, options: { captchaToken: captcha.token } });
    captcha.reset();
    if (error) { setError("Neteisingas el. paštas arba slaptažodis."); return; }
    location.href = "/";
  }

  if (state === "password") return (
    <form onSubmit={withPassword} className="grid gap-3">
      <label className="grid gap-1 text-sm font-semibold text-[var(--muted)]">El. paštas
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input" autoComplete="username" />
      </label>
      <label className="grid gap-1 text-sm font-semibold text-[var(--muted)]">Slaptažodis
        <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="input" autoComplete="current-password" />
      </label>
      <Captcha c={captcha} />
      {error && <p className="text-sm text-[var(--bad)]">{error}</p>}
      <button className="btn btn-primary" disabled={!captcha.ready}>Prisijungti</button>
      <button type="button" className="btn" onClick={() => { setError(""); setState("idle"); }}>Prisijungti kodu iš laiško</button>
    </form>
  );

  if (state === "sent" || state === "checking") return (
    <form onSubmit={verify} className="grid gap-3">
      <p className="rounded-lg bg-[var(--ok-bg)] p-3 text-sm text-[var(--ok)]">Išsiuntėme laišką į {email}. Įveskite laiške esantį kodą.</p>
      <label className="grid gap-1 text-sm font-semibold text-[var(--muted)]">Kodas iš laiško
        <input inputMode="numeric" autoComplete="one-time-code" required pattern="[0-9]{6,10}" maxLength={10} value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} className="input text-center text-2xl tracking-[0.4em]" autoFocus />
      </label>
      {error && <p className="text-sm text-[var(--bad)]">{error}</p>}
      <button className="btn btn-primary" disabled={state === "checking"}>{state === "checking" ? "Tikrinama…" : "Prisijungti"}</button>
      <button type="button" className="btn" onClick={() => { setCode(""); setError(""); setState("idle"); }}>Kitas el. paštas arba naujas kodas</button>
    </form>
  );
  return (
    <form onSubmit={send} className="grid gap-3">
      {plan && <label className="grid gap-1 text-sm font-semibold text-[var(--muted)]">Vardas ir pavardė
        <input required value={name} onChange={(e) => setName(e.target.value)} className="input" autoComplete="name" />
      </label>}
      <label className="grid gap-1 text-sm font-semibold text-[var(--muted)]">El. paštas
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input" autoComplete="email" />
      </label>
      <Captcha c={captcha} />
      {error && <p className="text-sm text-[var(--bad)]">{error}</p>}
      <button className="btn btn-primary" disabled={state === "sending" || !captcha.ready}>{state === "sending" ? "Siunčiama…" : plan ? "Gauti kodą" : "Gauti prisijungimo kodą"}</button>
      {plan ? <p className="text-center text-xs muted">Jau turite paskyrą? Įveskite tą patį el. paštą.</p>
        : <button type="button" className="text-sm underline text-[var(--muted)]" onClick={() => { setError(""); setState("password"); }}>Turiu slaptažodį</button>}
    </form>
  );
}
