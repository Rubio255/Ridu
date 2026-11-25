// Vairuotojo gyvumo patikra pagal riziką. Grynos funkcijos: be tinklo ir duomenų bazės, kad būtų lengva testuoti.
// Patikra trunka ~10 s. Po 2 nesėkmių iš eilės profilis paslepiamas ir jį peržiūri administratorius.
import { createHmac, timingSafeEqual } from "node:crypto";

export type DueReason = "initial" | "weekly" | "new_client" | "random" | "new_device" | "profile_change" | "report" | "inactive" | "child_route";

export const WEEKLY_DAYS = 7;       // reguliari patikra aktyviems vairuotojams
export const INACTIVE_DAYS = 14;    // po ilgesnės pertraukos tikriname iš karto
export const RANDOM_RATE = 0.1;     // ~1 iš 10 darbo dienų, vairuotojas iš anksto nežino
export const MAX_ATTEMPTS = 2;

export type LivenessState = {
  identity_verified_at: string | null;
  liveness_checked_at: string | null;
  liveness_due_reason: string | null;   // rizikos signalas: new_device, profile_change, report
  liveness_review: boolean;
  last_active_at?: string | null;
};
export type DueContext = {
  now: Date;
  driverId: string;
  newClient?: boolean;        // pirmoji kelionė ar sutartis su šiuo klientu
  childRouteStart?: boolean;  // vaikų pastovaus maršruto pirmoji diena
  secret?: string;            // atsitiktinės dienos druska, kad diena nebūtų nuspėjama
};

const DAY = 864e5;
const vilniusDay = (d: Date) => d.toLocaleDateString("sv-SE", { timeZone: "Europe/Vilnius" });

// Atsitiktinė, bet deterministinė diena: ta pati vairuotojui visą parą, kiti jos negali apskaičiuoti be druskos
export function randomDay(driverId: string, now: Date, secret = "", rate = RANDOM_RATE) {
  const h = createHmac("sha256", secret || "ridu").update(`${driverId}:${vilniusDay(now)}`).digest();
  return h.readUInt32BE(0) / 0x1_0000_0000 < rate;
}

// Grąžina priežastį, kodėl dabar reikia patikros, arba null. Tvarka: svarbiausia pirmiau.
export function livenessDue(s: LivenessState, c: DueContext): DueReason | null {
  if (!s.identity_verified_at) return "initial";
  if (s.liveness_due_reason) return s.liveness_due_reason as DueReason;
  const last = s.liveness_checked_at ? new Date(s.liveness_checked_at).getTime() : 0;
  const checkedToday = !!s.liveness_checked_at && vilniusDay(new Date(s.liveness_checked_at)) === vilniusDay(c.now);
  if (s.last_active_at && c.now.getTime() - new Date(s.last_active_at).getTime() > INACTIVE_DAYS * DAY) return "inactive";
  if (c.now.getTime() - last > WEEKLY_DAYS * DAY) return "weekly";
  if (checkedToday) return null;
  if (c.childRouteStart) return "child_route";
  if (c.newClient) return "new_client";
  if (randomDay(c.driverId, c.now, c.secret)) return "random";
  return null;
}

// Profilis rodomas klientams (atitinka SQL funkciją liveness_ok)
export const livenessOk = (s: LivenessState, now = new Date()) =>
  !!s.identity_verified_at && !s.liveness_review && !s.liveness_due_reason && !!s.liveness_checked_at &&
  now.getTime() - new Date(s.liveness_checked_at).getTime() < WEEKLY_DAYS * DAY;

// Būsena po patikros rezultato
export function afterResult(failed: number, passed: boolean) {
  if (passed) return { liveness_failed: 0, liveness_review: false, liveness_due_reason: null };
  const n = failed + 1;
  return { liveness_failed: n, liveness_review: n >= MAX_ATTEMPTS };
}

// Didit būsena -> mūsų rezultatas. Tarpinės būsenos (In Progress, In Review) dar nėra rezultatas.
export function diditResult(status: string): "passed" | "failed" | null {
  if (status === "Approved") return "passed";
  if (["Declined", "Abandoned", "Expired", "Kyc Expired"].includes(status)) return "failed";
  return null;
}

// Didit webhook parašas: X-Signature = HMAC-SHA256(neapdorotas kūnas, secret) hex; X-Timestamp ne senesnis nei 5 min.
export function verifyDiditSignature(raw: string, sig: string | null, ts: string | null, secret: string, now = Date.now()) {
  if (!sig || !ts || !secret) return false;
  if (!/^\d+$/.test(ts) || Math.abs(now / 1000 - Number(ts)) > 300) return false;
  const want = createHmac("sha256", secret).update(raw, "utf8").digest("hex");
  const a = Buffer.from(want, "utf8"), b = Buffer.from(sig.trim().toLowerCase(), "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

export const REASON_LT: Record<DueReason, string> = {
  initial: "Pirminė tapatybės patikra",
  weekly: "Savaitinė patikra",
  new_client: "Pirmoji kelionė su nauju klientu",
  random: "Atsitiktinė patikra",
  new_device: "Prisijungėte nauju įrenginiu",
  profile_change: "Pakeista nuotrauka ar automobilis",
  report: "Gautas kliento pranešimas",
  inactive: "Ilgai nebuvote prisijungę",
  child_route: "Prasideda vaikų pastovus maršrutas",
};
