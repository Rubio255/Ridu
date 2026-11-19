import "server-only";
import { supabaseAdmin } from "./supabase/server";
import { CONSENTS, TERMS_VERSION, isRequired, type ConsentKey } from "./terms";

export type ConsentState = Partial<Record<ConsentKey, { granted: boolean; version: string; at: string }>>;

export async function loadConsents(profileId: string): Promise<ConsentState> {
  const { data } = await supabaseAdmin().from("current_consents").select("key, granted, terms_version, created_at").eq("profile_id", profileId);
  return Object.fromEntries((data ?? []).map((c) => [c.key, { granted: c.granted, version: c.terms_version, at: c.created_at }]));
}

// Ar klientas sutiko su visais privalomais punktais dabartinėje sąlygų versijoje
export const hasRequired = (s: ConsentState, hasKids = true) => CONSENTS.filter((c) => isRequired(c, hasKids)).every((c) => s[c.key]?.granted && s[c.key]?.version === TERMS_VERSION);

// Ar klientas yra bent vieno vaiko keleivio globėjas
export async function clientHasKids(profileId: string) {
  const { data } = await supabaseAdmin().from("child_guardians").select("child:children!inner(passenger_type)").eq("profile_id", profileId).eq("child.passenger_type", "child").limit(1);
  return (data ?? []).length > 0;
}
