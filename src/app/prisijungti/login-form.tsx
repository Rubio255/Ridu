"use client";
import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    const sb = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    // shouldCreateUser: false – prisijungti gali tik savininko pakviesti klientai
    const { error } = await sb.auth.signInWithOtp({ email, options: { shouldCreateUser: false, emailRedirectTo: `${location.origin}/auth/callback` } });
    if (error) { setError("Šio el. pašto neradome. Patikrinkite adresą arba susisiekite su vairuotoju."); setState("error"); }
    else setState("sent");
  }
  if (state === "sent") return <p className="rounded-lg bg-[var(--ok-bg)] p-3 text-sm text-[var(--ok)]">Išsiuntėme nuorodą į {email}. Atidarykite laišką ir paspauskite nuorodą.</p>;
  return (
    <form onSubmit={submit} className="grid gap-3">
      <label className="grid gap-1 text-sm font-semibold text-[var(--muted)]">El. paštas
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input" autoComplete="email" />
      </label>
      {state === "error" && <p className="text-sm text-[var(--bad)]">{error}</p>}
      <button className="btn btn-primary" disabled={state === "sending"}>{state === "sending" ? "Siunčiama…" : "Gauti prisijungimo nuorodą"}</button>
    </form>
  );
}
