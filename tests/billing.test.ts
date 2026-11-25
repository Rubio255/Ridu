import { test } from "node:test";
import assert from "node:assert/strict";
import { effectivePlan, planFromPrice, priceEnvName, priceId, withdrawRefund } from "../src/lib/billing";

const env = { STRIPE_PRICE_PLUS_CLIENT: "price_pc", STRIPE_PRICE_PRO_DRIVER: "price_rd" };
const now = new Date("2026-12-10T12:00:00Z");

test("kainų ID iš env", () => {
  assert.equal(priceEnvName("plus", "client"), "STRIPE_PRICE_PLUS_CLIENT");
  assert.equal(priceId("plus", "client", env), "price_pc");
  assert.equal(priceId("pro", "client", env), null);
  assert.deepEqual(planFromPrice("price_rd", env), { plan: "pro", role: "driver" });
  assert.equal(planFromPrice("price_x", env), null);
});

test("galiojantis planas", () => {
  const end = "2027-01-01T00:00:00Z";
  assert.equal(effectivePlan({ plan: "pro", status: "active", current_period_end: end }, null, now), "pro");
  assert.equal(effectivePlan({ plan: "pro", status: "past_due", current_period_end: end }, null, now), "pro");
  assert.equal(effectivePlan({ plan: "pro", status: "canceled", current_period_end: end }, null, now), "free");
  assert.equal(effectivePlan({ plan: "pro", status: "active", current_period_end: "2026-12-01T00:00:00Z" }, null, now), "free");
  assert.equal(effectivePlan(null, "2026-12-20T00:00:00Z", now), "plus");
  assert.equal(effectivePlan(null, "2026-12-01T00:00:00Z", now), "free");
});

test("atsisakymas per 14 d.", () => {
  const base = { startedAt: "2026-12-01T12:00:00Z", periodStart: "2026-12-01T12:00:00Z", periodEnd: "2026-12-31T12:00:00Z", amountPaidCents: 999, now };
  const r = withdrawRefund({ ...base, role: "client" });
  assert.deepEqual(r, { ok: true, refundCents: Math.floor(999 * 21 / 30) });
  assert.deepEqual(withdrawRefund({ ...base, role: "driver" }), { ok: false, error: "role" });
  assert.deepEqual(withdrawRefund({ ...base, role: "client", now: new Date("2026-12-16T12:00:01Z") }), { ok: false, error: "late" });
  assert.deepEqual(withdrawRefund({ ...base, role: "client", amountPaidCents: 0 }), { ok: true, refundCents: 0 });
});
