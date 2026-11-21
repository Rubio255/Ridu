import { cache } from "react";
import { redirect } from "next/navigation";
import { supabaseServer, supabaseAdmin } from "./supabase/server";
import { withDefaults, type Settings } from "./settings";
import { mfaNeed, type Amr, type MfaNeed } from "./mfa";

export type Profile = { id: string; full_name: string; email: string | null; phone: string | null; role: "owner" | "client" | "driver"; contract_no: string | null; active: boolean };
type AuthState = { profile: Profile; mfa: MfaNeed; hasMfa: boolean };

// Vienai užklausai profilis įkeliamas tik kartą (maketas ir puslapis jį dalijasi).
// getClaims patikrina prieigos rakto parašą, todėl naudotojo id ir prisijungimo lygiu (aal) galima pasitikėti.
// Profilis ir MFA būsena skaitomi serveriu, nes be antro žingsnio RLS darbuotojams nieko nerodo.
const authState = cache(async (): Promise<AuthState | null> => {
  const sb = await supabaseServer();
  const { data } = await sb.auth.getClaims();
  const c = data?.claims;
  if (!c?.sub) return null;
  const { data: row } = await supabaseAdmin().rpc("auth_profile", { uid: c.sub });
  if (!row) return null;
  const { has_mfa, ...profile } = row as Profile & { has_mfa: boolean };
  return { profile, hasMfa: !!has_mfa, mfa: mfaNeed({ role: profile.role, aal: c.aal as string | undefined, amr: c.amr as Amr, hasMfa: !!has_mfa }) };
});

export const currentProfile = cache(async (): Promise<Profile | null> => {
  const s = await authState();
  return s && s.mfa === "ok" ? s.profile : null;
});

// Prisijungimo būsena MFA puslapiui (be MFA patikros)
export async function currentAuthState() {
  return authState();
}

export async function requireProfile(): Promise<Profile> {
  const s = await authState();
  if (!s) redirect("/prisijungti");
  if (!s.profile.active) redirect("/prisijungti?klaida=neaktyvus");
  // Kai bus atskira admin programėlė, šioje (klientų ir vairuotojų) programėlėje nustatykite OWNER_LOGIN=off:
  // tada MB paskyra čia nebeveiks net ir žinant adresą.
  if (s.profile.role === "owner" && process.env.OWNER_LOGIN === "off") redirect("/prisijungti?klaida=neaktyvus");
  if (s.mfa !== "ok") redirect("/prisijungti/patvirtinti");
  return s.profile;
}

export async function requireOwner(): Promise<Profile> {
  const p = await requireProfile();
  if (p.role !== "owner") redirect("/tevai");
  return p;
}

export async function requireDriver(): Promise<Profile> {
  const p = await requireProfile();
  if (p.role !== "driver") redirect(p.role === "owner" ? "/savininkas" : "/tevai");
  return p;
}

// MB administratorius arba vairuotojas (vairuotojui tikrinama, ar kelionė jo)
export async function requireStaff(): Promise<Profile> {
  const p = await requireProfile();
  if (p.role !== "owner" && p.role !== "driver") redirect("/tevai");
  return p;
}

// Nustatymai skaitomi serveriu (klientams jie neatiduodami)
export const loadSettings = cache(async (): Promise<Settings> => {
  const { data } = await supabaseAdmin().from("settings").select("data").eq("id", 1).single();
  return withDefaults(data?.data);
});
