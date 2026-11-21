// Dviejų žingsnių patvirtinimo (MFA) taisyklės. Gryna logika, kad būtų galima testuoti.
// MB savininkas ir vairuotojai MFA privalo turėti; klientai įsijungia patys (nebūtina).

export type Role = "owner" | "client" | "driver";
export type Amr = { method: string; timestamp: number }[] | undefined;

// Kaip dažnai darbuotojas turi iš naujo įvesti kodą iš autentifikavimo programėlės (sekundėmis)
export const MFA_MAX_AGE_S: Record<Role, number | null> = {
  owner: 12 * 3600, // savininkas: kas 12 val.
  driver: 7 * 24 * 3600, // vairuotojas: kartą per savaitę
  client: null, // klientas: tol, kol galioja sesija
};

export const MFA_REQUIRED: Record<Role, boolean> = { owner: true, driver: true, client: false };

export type MfaNeed = "ok" | "enroll" | "verify";

// aal: prisijungimo lygis iš patikrinto prieigos rakto; hasMfa: ar naudotojas turi patvirtintą MFA (iš serverio)
export function mfaNeed(i: { role: Role; aal: string | undefined; amr: Amr; hasMfa: boolean; now?: number }): MfaNeed {
  const now = i.now ?? Math.floor(Date.now() / 1000);
  if (!i.hasMfa) return MFA_REQUIRED[i.role] ? "enroll" : "ok";
  if (i.aal !== "aal2") return "verify";
  const max = MFA_MAX_AGE_S[i.role];
  if (max == null) return "ok";
  const last = Math.max(0, ...(i.amr ?? []).filter((a) => a.method === "totp" || a.method === "mfa/totp").map((a) => a.timestamp));
  return now - last <= max ? "ok" : "verify";
}
