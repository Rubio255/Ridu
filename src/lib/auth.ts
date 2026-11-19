import { redirect } from "next/navigation";
import { supabaseServer, supabaseAdmin } from "./supabase/server";
import { withDefaults, type Settings } from "./settings";

export type Profile = { id: string; full_name: string; email: string | null; phone: string | null; role: "owner" | "client"; contract_no: string | null; active: boolean };

export async function currentProfile(): Promise<Profile | null> {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;
  const { data } = await sb.from("profiles").select("*").eq("id", user.id).single();
  return (data as Profile) ?? null;
}

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

// Nustatymai skaitomi serveriu (klientams jie neatiduodami)
export async function loadSettings(): Promise<Settings> {
  const { data } = await supabaseAdmin().from("settings").select("data").eq("id", 1).single();
  return withDefaults(data?.data);
}
