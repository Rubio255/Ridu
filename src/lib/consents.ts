import "server-only";
import { supabaseAdmin } from "./supabase/server";
import { CONSENTS, TERMS_VERSION, type ConsentKey } from "./terms";

export type ConsentState = Partial<Record<ConsentKey, { granted: boolean; version: string; at: string }>>;

export async function loadConsents(profileId: string): Promise<ConsentState> {
  const { data } = await supabaseAdmin().from("current_consents").select("key, granted, terms_version, created_at").eq("profile_id", profileId);
  return Object.fromEntries((data ?? []).map((c) => [c.key, { granted: c.granted, version: c.terms_version, at: c.created_at }]));
}

// Ar klientas sutiko su visais privalomais punktais dabartinėje sąlygų versijoje
export const hasRequired = (s: ConsentState) => CONSENTS.filter((c) => c.required).every((c) => s[c.key]?.granted && s[c.key]?.version === TERMS_VERSION);
