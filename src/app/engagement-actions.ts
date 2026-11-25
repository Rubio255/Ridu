"use server";
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { notifyOwner, type NotifyKind } from "@/lib/push";
import { scanMessage, shouldEscalate, FLAG_LT } from "@/lib/chat-filter";
import { makeCode, normCode } from "@/lib/referrals";
import { rewardReferral } from "@/lib/referrals-server";

// Pranešimų nustatymai
export async function setNotifyPrefs(fd: FormData) {
  const me = await requireProfile();
  const kinds: NotifyKind[] = ["offers", "messages", "agreements", "trips"];
  const prefs = Object.fromEntries(kinds.map((k) => [k, fd.get(k) === "on"]));
  await supabaseAdmin().from("profiles").update({ notify_prefs: prefs }).eq("id", me.id);
  revalidatePath("/paskyra");
}

// Pokalbio žinutės patikra prieš siunčiant: grąžina įspėjimus, žinutė vis tiek siunčiama.
// Saugoma tik žyma, ne tekstas. Po 3 žymų per 7 d. – pranešimas administratoriui.
export async function checkMessage(text: string) {
  const me = await requireProfile();
  const flags = scanMessage(String(text).slice(0, 4000));
  if (!flags.length) return { flags, warnings: [] as string[] };
  const db = supabaseAdmin();
  await db.from("chat_flags").insert({ sender_id: me.id, flags });
  const { count } = await db.from("chat_flags").select("id", { count: "exact", head: true }).eq("sender_id", me.id).gte("created_at", new Date(Date.now() - 7 * 864e5).toISOString());
  if (shouldEscalate(count ?? 0)) {
    const { data: open } = await db.from("chat_flags").select("id").eq("sender_id", me.id).eq("escalated", true).gte("created_at", new Date(Date.now() - 7 * 864e5).toISOString()).limit(1);
    if (!open?.length) {
      await db.from("chat_flags").update({ escalated: true }).eq("sender_id", me.id).gte("created_at", new Date(Date.now() - 7 * 864e5).toISOString());
      await notifyOwner("Pokalbių filtras", `${me.full_name || "Naudotojas"}: ${count} įtartinos žinutės per 7 d. Peržiūrėkite.`);
    }
  }
  return { flags, warnings: flags.map((f) => FLAG_LT[f]) };
}

// Mano rekomendacijų kodas (sukuriamas pirmą kartą)
export async function myReferralCode() {
  const me = await requireProfile();
  const db = supabaseAdmin();
  const { data } = await db.from("profiles").select("referral_code").eq("id", me.id).single();
  if (data?.referral_code) return data.referral_code as string;
  for (let i = 0; i < 5; i++) {
    const code = makeCode();
    const { error } = await db.from("profiles").update({ referral_code: code }).eq("id", me.id).is("referral_code", null);
    if (!error) return code;
  }
  throw new Error("Nepavyko sukurti kodo");
}

// Registruojantis su kodu: susiejama, apdovanojama vėliau (rewardReferral), kai paskyra patvirtinta
export async function claimReferral(code: string) {
  const me = await requireProfile();
  const db = supabaseAdmin();
  const { data: inv } = await db.from("profiles").select("id").eq("referral_code", normCode(code)).maybeSingle();
  if (!inv || inv.id === me.id) return { ok: false as const, error: "Kodas netinka." };
  const { error } = await db.from("referrals").insert({ inviter_id: inv.id, invitee_id: me.id });
  if (error) return { ok: false as const, error: "Pakvietimas jau panaudotas." };
  await rewardReferral(me.id);
  return { ok: true as const };
}
