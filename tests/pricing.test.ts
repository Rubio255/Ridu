import { test } from "node:test";
import assert from "node:assert/strict";
import { quoteSubscription, cancelFeePct, type SubLike } from "../src/lib/pricing";
import { DEFAULT_SETTINGS as S } from "../src/lib/settings";
import { vilniusToDate } from "../src/lib/time";

const req = { weekdays: [2, 4], period: "pm" as const, pickup_time: "14:00", extra_kids: 0, months: 1, km: 5.3, driveMin: 14 };

test("tuščias grafikas: koeficientas 0.90", () => {
  const q = quoteSubscription(S, [], req);
  assert.equal(q.ok, true); assert.equal(q.full, false); assert.equal(q.internal.multiplier, 0.9);
  assert.equal(q.internal.blockMin, 14 + 14 + 14 + 10);
  // 0.56*52 + 0.12*(5.3+6) = 30.476 -> ×0.9 × 2×52/12
  assert.equal(q.monthly, Math.round(30.476 * 0.9 * (104 / 12)));
});

test("už darbo laiko ribų – atmetama", () => {
  assert.equal(quoteSubscription(S, [], { ...req, pickup_time: "10:00" }).ok, false);
});

test("rytinis maršrutas pilnas po 3 vaikų", () => {
  const am: SubLike = { id: "a", weekdays: [2], period: "am", pickup_time: "07:15", extra_kids: 1, block_min: 50, status: "active" };
  const q = quoteSubscription(S, [am], { ...req, period: "am", weekdays: [2], extra_kids: 1 });
  assert.equal(q.full, true); assert.equal(q.internal.multiplier, S.occ_m4);
});

test("broliai ir seserys: dalis 60 %", () => {
  const q = quoteSubscription(S, [], { ...req, extra_kids: 1 });
  assert.equal(q.kids, 2);
  assert.equal(q.monthly, Math.round(30.476 * 0.6 * 0.9 * (104 / 12)) * 2);
});

test("atšaukimo mokestis", () => {
  assert.equal(cancelFeePct(S, 24), 0); assert.equal(cancelFeePct(S, 5), 50); assert.equal(cancelFeePct(S, 1), 100);
});

test("Vilniaus laikas: žiemą UTC+2, vasarą UTC+3", () => {
  assert.equal(vilniusToDate("2026-12-01", "07:15").toISOString(), "2026-12-01T05:15:00.000Z");
  assert.equal(vilniusToDate("2026-07-01", "07:15").toISOString(), "2026-07-01T04:15:00.000Z");
});

test("suaugusiam be palydos – trumpesnis laikas ir pigiau, vyresnio amžiaus kaip vaikui", async () => {
  const { blockMin } = await import("../src/lib/pricing");
  assert.equal(blockMin(S, 14, "adult"), 14 + 6 + 14 + 10);
  assert.equal(blockMin(S, 14, "senior"), blockMin(S, 14, "child"));
  const child = quoteSubscription(S, [], req), adult = quoteSubscription(S, [], { ...req, passenger: "adult" });
  assert.ok(adult.ok && child.ok && adult.monthly < child.monthly);
});
