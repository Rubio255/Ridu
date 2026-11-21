"use client";
import { useEffect, useRef, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

const sb = () => createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

// Įjungimas (QR kodas + pirmas kodas) arba patvirtinimas (kodas) su TOTP autentifikavimo programėle
export function MfaForm({ mode }: { mode: "enroll" | "verify" }) {
  const [factorId, setFactorId] = useState("");
  const [qr, setQr] = useState("");
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    (async () => {
      const auth = sb().auth;
      const { data, error } = await auth.mfa.listFactors();
      if (error) { setError("Nepavyko įkelti. Atnaujinkite puslapį."); return; }
      if (mode === "verify") {
        const f = data.totp[0];
        if (f) setFactorId(f.id); else setError("Patvirtinimo būdo neradome. Susisiekite su mumis.");
        return;
      }
      // Nebaigti ankstesni bandymai pašalinami, kad būtų galima pradėti iš naujo
      for (const f of data.all.filter((x) => x.status === "unverified")) await auth.mfa.unenroll({ factorId: f.id });
      const r = await auth.mfa.enroll({ factorType: "totp", friendlyName: `Ridu ${new Date().toISOString().slice(0, 16)}`, issuer: "Ridu" });
      if (r.error || !r.data) { setError("Nepavyko pradėti. Atnaujinkite puslapį."); return; }
      setFactorId(r.data.id); setQr(r.data.totp.qr_code); setSecret(r.data.totp.secret);
    })();
  }, [mode]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setBusy(true);
    const { error } = await sb().auth.mfa.challengeAndVerify({ factorId, code: code.trim() });
    if (error) { setBusy(false); setCode(""); setError("Kodas neteisingas arba nebegalioja. Įveskite naują kodą iš programėlės."); return; }
    location.href = "/";
  }

  return (
    <form onSubmit={submit} className="grid gap-3">
      {mode === "enroll" && (
        <ol className="grid list-decimal gap-2 pl-5 text-sm">
          <li>Telefone įsidiekite autentifikavimo programėlę, pvz. <b>Google Authenticator</b> arba <b>Microsoft Authenticator</b>.</li>
          <li>Programėlėje pasirinkite „Pridėti“ ir nuskenuokite šį kodą.</li>
          {qr ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qr} alt="QR kodas autentifikavimo programėlei" width={200} height={200} className="justify-self-center rounded-xl bg-white p-2" />
          ) : !error && <p className="muted">Ruošiama…</p>}
          {secret && (
            <details className="text-xs muted">
              <summary className="cursor-pointer">Negalite nuskenuoti? Įveskite raktą ranka</summary>
              <code className="mt-1 block break-all rounded bg-[var(--surface-2)] p-2 text-sm select-all">{secret}</code>
              Šį raktą galite išsaugoti saugioje vietoje (pvz. slaptažodžių tvarkyklėje), jei pamestumėte telefoną.
            </details>
          )}
          <li>Įveskite programėlėje rodomą 6 skaitmenų kodą.</li>
        </ol>
      )}
      <label className="grid gap-1 text-sm font-semibold text-[var(--muted)]">Kodas iš programėlės
        <input inputMode="numeric" autoComplete="one-time-code" required pattern="[0-9]{6}" maxLength={6} value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} className="input text-center text-2xl tracking-[0.4em]" autoFocus />
      </label>
      {error && <p className="text-sm text-[var(--bad)]">{error}</p>}
      <button className="btn btn-primary" disabled={busy || !factorId}>{busy ? "Tikrinama…" : mode === "enroll" ? "Įjungti" : "Patvirtinti"}</button>
    </form>
  );
}

// Klientui: išjungti antrą žingsnį (galima tik jau patvirtinus kodą)
export function MfaDisable() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function off() {
    setBusy(true); setError("");
    const auth = sb().auth;
    const { data } = await auth.mfa.listFactors();
    for (const f of data?.all ?? []) {
      const { error } = await auth.mfa.unenroll({ factorId: f.id });
      if (error) { setBusy(false); setError("Nepavyko išjungti. Prisijunkite iš naujo ir bandykite dar kartą."); return; }
    }
    await auth.refreshSession();
    location.reload();
  }
  return (
    <>
      <button type="button" className="btn" onClick={off} disabled={busy}>{busy ? "Išjungiama…" : "Išjungti"}</button>
      {error && <p className="text-sm text-[var(--bad)]">{error}</p>}
    </>
  );
}
