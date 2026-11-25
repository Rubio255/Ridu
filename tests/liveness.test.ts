import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { livenessDue, livenessOk, afterResult, diditResult, verifyDiditSignature, randomDay, type LivenessState } from "../src/lib/liveness";

const now = new Date("2026-11-25T10:00:00Z");
const ago = (d: number) => new Date(now.getTime() - d * 864e5).toISOString();
const base: LivenessState = { identity_verified_at: ago(30), liveness_checked_at: ago(1), liveness_due_reason: null, liveness_review: false, last_active_at: ago(1) };
// randomDay nebūtų pasirinkta: ieškome vairuotojo id, kuriam šiandien atsitiktinės patikros nėra
const quiet = Array.from({ length: 50 }, (_, i) => `d${i}`).find((id) => !randomDay(id, now, "s"))!;
const ctx = { now, driverId: quiet, secret: "s" };

test("be pirminės patikros reikia pilnos patikros", () => {
  assert.equal(livenessDue({ ...base, identity_verified_at: null }, ctx), "initial");
});
test("kas 7 dienas ir po 14 d. neaktyvumo", () => {
  assert.equal(livenessDue(base, ctx), null);
  assert.equal(livenessDue({ ...base, liveness_checked_at: ago(8) }, ctx), "weekly");
  assert.equal(livenessDue({ ...base, last_active_at: ago(20) }, ctx), "inactive");
});
test("naujas klientas ir vaikų maršrutas, bet ne du kartus tą pačią dieną", () => {
  assert.equal(livenessDue(base, { ...ctx, newClient: true }), "new_client");
  assert.equal(livenessDue(base, { ...ctx, childRouteStart: true }), "child_route");
  assert.equal(livenessDue({ ...base, liveness_checked_at: now.toISOString() }, { ...ctx, newClient: true }), null);
});
test("rizikos signalas laimi prieš kitas taisykles", () => {
  assert.equal(livenessDue({ ...base, liveness_due_reason: "new_device", liveness_checked_at: now.toISOString() }, ctx), "new_device");
});
test("atsitiktinė diena: apie 1 iš 10 ir stabili per parą", () => {
  let n = 0;
  for (let i = 0; i < 2000; i++) if (randomDay(`d${i}`, now, "s")) n++;
  assert.ok(n > 140 && n < 260, String(n));
  assert.equal(randomDay("d1", now, "s"), randomDay("d1", new Date("2026-11-25T20:00:00Z"), "s"));
});
test("profilis matomas tik su galiojančia patikra", () => {
  assert.ok(livenessOk(base, now));
  assert.ok(!livenessOk({ ...base, liveness_checked_at: ago(8) }, now));
  assert.ok(!livenessOk({ ...base, liveness_review: true }, now));
});
test("2 nesėkmės iš eilės -> peržiūra", () => {
  assert.deepEqual(afterResult(0, false), { liveness_failed: 1, liveness_review: false });
  assert.deepEqual(afterResult(1, false), { liveness_failed: 2, liveness_review: true });
  assert.equal(afterResult(1, true).liveness_failed, 0);
});
test("Didit būsenos ir parašas", () => {
  assert.equal(diditResult("Approved"), "passed");
  assert.equal(diditResult("Declined"), "failed");
  assert.equal(diditResult("In Review"), null);
  const raw = '{"session_id":"x","status":"Approved"}', ts = String(Math.floor(now.getTime() / 1000));
  const sig = createHmac("sha256", "k").update(raw).digest("hex");
  assert.ok(verifyDiditSignature(raw, sig, ts, "k", now.getTime()));
  assert.ok(!verifyDiditSignature(raw + " ", sig, ts, "k", now.getTime()));
  assert.ok(!verifyDiditSignature(raw, sig, ts, "k", now.getTime() + 600_000));
});
