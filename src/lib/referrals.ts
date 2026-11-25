// Rekomendacijų programa: pakviestas draugas užsiregistruoja ir patvirtina paskyrą -> abu gauna 1 mėn. Plus.
import { randomInt } from "node:crypto";

export const REWARD_MONTHS = 1;
export const MONTHLY_CAP = 5;          // daugiausia apdovanotų pakvietimų vienam kviečiančiajam per kalendorinį mėnesį
export const INVITEE_MAX_AGE_DAYS = 30; // pakvietimas galioja tik naujai paskyrai

const ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // be 0/O, 1/I
export const makeCode = (len = 7) => Array.from({ length: len }, () => ALPHA[randomInt(ALPHA.length)]).join("");
export const normCode = (c: string) => c.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");

export type Party = { id: string; email: string | null; phone: string | null; created_at: string; email_confirmed: boolean; phone_confirmed: boolean };
export type RewardError = "self" | "same_contact" | "not_new" | "not_confirmed" | "cap" | "already";

export function rewardCheck(inviter: Party, invitee: Party, o: { inviterRewardsThisMonth: number; inviteeAlreadyReferred: boolean; now?: number }): RewardError | null {
  const now = o.now ?? Date.now();
  if (inviter.id === invitee.id) return "self";
  const same = (a: string | null, b: string | null) => !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();
  if (same(inviter.email, invitee.email) || same(inviter.phone, invitee.phone)) return "same_contact";
  if (o.inviteeAlreadyReferred) return "already";
  if (now - new Date(invitee.created_at).getTime() > INVITEE_MAX_AGE_DAYS * 864e5) return "not_new";
  if (!invitee.email_confirmed || !invitee.phone_confirmed) return "not_confirmed";
  if (o.inviterRewardsThisMonth >= MONTHLY_CAP) return "cap";
  return null;
}

// Plus galiojimas po apdovanojimo: pratęsiama nuo esamos pabaigos arba nuo šiandien
export function extendPlus(current: string | null, now = new Date(), months = REWARD_MONTHS) {
  const base = current && new Date(current) > now ? new Date(current) : now;
  const d = new Date(base); d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString();
}
