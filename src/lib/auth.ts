import { cache } from "react";
import { redirect } from "next/navigation";
import { supabaseServer, supabaseAdmin } from "./supabase/server";
import { withDefaults, type Settings } from "./settings";

export type Profile = { id: string; full_name: string; email: string | null; phone: string | null; role: "owner" | "client" | "driver"; contract_no: string | null; active: boolean };

// Vienai užklausai profilis įkeliamas tik kartą (maketas ir puslapis jį dalijasi).
// getClaims tikrina prieigos raktą vietoje, be papildomo kreipimosi į Supabase Auth, kai tai įmanoma.
export const currentProfile = cache(async (): Promise<Profile | null> => {
  const sb = await supabaseServer();
  const { data: claims } = await sb.auth.getClaims();
  const uid = claims?.claims?.sub;
  if (!uid) return null;
  const { data } = await sb.from("profiles").select("*").eq("id", uid).single();
  return (data as Profile) ?? null;
});

export async function requireProfile(): Promise<Profile> {
  const p = await currentProfile();
  if (!p) redirect("/prisijungti");
  if (!p.active) redirect("/prisijungti?klaida=neaktyvus");
  return p;
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
