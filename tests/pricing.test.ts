import { test } from "node:test";
import assert from "node:assert/strict";
import { quoteSubscription, cancelFeePct, type SubLike } from "../src/lib/pricing";
import { DEFAULT_SETTINGS as S } from "../src/lib/settings";
import { vilniusToDate } from "../src/lib/time";

const req = { weekdays: [2, 4], period: "pm" as const, pickup_time: "14:00", extra_kids: 0, months: 1, km: 5.3, driveMin: 14 };

test("v7: pertrauka planuojama, bet neskaičiuojama; 14:00 – piko koeficientas 1,15", () => {
  const q = quoteSubscription(S, [], req);
  assert.equal(q.ok, true); assert.equal(q.full, false); assert.equal(q.internal.multiplier, 1.15);
  assert.equal(q.internal.blockMin, 14 + 14 + 10 + 10);
  // 0.37*(14+14+10) + 0.43*(5.3+6) = 18.92 -> ×1.15 × 2×52/12
  assert.equal(q.standard, 18.92);
  assert.equal(q.monthly, Math.round(18.92 * 1.15 * (104 / 12)));
});

test("v7 pavyzdys: vaikas 8 km, 22 min – 23,04 €", async () => {
  const { standardTripValue } = await import("../src/lib/pricing");
  assert.equal(standardTripValue(S, 22, 8, "child"), 23.04);
});

test("laiko koeficientai: pikas, ramus, įprastas, savaitgalis tik patvirtinus", async () => {
  const { timeMultiplier } = await import("../src/lib/pricing");
  assert.equal(timeMultiplier(S, "07:30"), 1.15); assert.equal(timeMultiplier(S, "15:59"), 1.15);
  assert.equal(timeMultiplier(S, "11:00"), 0.9); assert.equal(timeMultiplier(S, "17:00"), 1);
  assert.equal(timeMultiplier(S, "17:00", true), 1);
  assert.equal(timeMultiplier({ ...S, surcharge_approved: true }, "17:00", true), 1.25);
});

test("už darbo laiko ribų – atmetama", () => {
  assert.equal(quoteSubscription(S, [], { ...req, pickup_time: "10:00" }).ok, false);
});

test("rytinis maršrutas pilnas po 3 vaikų", () => {
  const am: SubLike = { id: "a", weekdays: [2], period: "am", pickup_time: "07:15", extra_kids: 1, block_min: 50, status: "active" };
  const q = quoteSubscription(S, [am], { ...req, period: "am", weekdays: [2], extra_kids: 1 });
  assert.equal(q.full, true); assert.equal(q.internal.multiplier, S.auction_mult); assert.equal(S.auction_mult, 1.3);
});

test("broliai ir seserys: dalis 60 %", () => {
  const q = quoteSubscription(S, [], { ...req, extra_kids: 1 });
  assert.equal(q.kids, 2);
  assert.equal(q.monthly, Math.round(18.92 * 0.6 * 1.15 * (104 / 12)) * 2);
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
  assert.equal(blockMin(S, 14, "adult"), 14 + 6 + 10 + 10);
  assert.equal(blockMin(S, 14, "senior"), blockMin(S, 14, "child"));
  const child = quoteSubscription(S, [], req), adult = quoteSubscription(S, [], { ...req, passenger: "adult" });
  assert.ok(adult.ok && child.ok && adult.monthly < child.monthly);
});

test("vairuotojui 70 % standartinės vertės be PVM", async () => {
  const { driverShare } = await import("../src/lib/pricing");
  assert.equal(driverShare(S, 23.04), Math.round(23.04 / 1.21 * 0.7 * 100) / 100);
  assert.equal(driverShare(S, 23.04, 75), Math.round(23.04 / 1.21 * 0.75 * 100) / 100);
});

test("kredito planas: kaina + viršijimas, likutis perkeliamas 1 mėn.", async () => {
  const { planBill, planChain, recommendPlan } = await import("../src/lib/pricing");
  const basic = { price: 219, credit: 210 };
  assert.deepEqual(planBill(S, basic, 250), { due: 259, over: 40, carryOut: 0, expired: 0 });
  assert.equal(planBill(S, basic, 150).carryOut, 60);
  // 150 -> likutis 60; kitą mėnesį 250: 60 iš perkelto + 190 iš kredito, viršijimo nėra, liko 20
  const [, m2, m3] = planChain(S, basic, [150, 250, 100]);
  assert.equal(m2.due, 219); assert.equal(m2.carryOut, 20);
  // trečią mėnesį perkelta 20 panaudojama pirmiausia, likęs kreditas 130 perkeliamas, senas nebeperkeliamas
  assert.equal(m3.carryOut, 130);
  assert.equal(recommendPlan(S, 200).id, "basic");
  assert.equal(recommendPlan(S, 480).id, "family");
});

test("palyda: 22,50 €/val., mažiausiai 1 val., po 15 min.", async () => {
  const { escortPrice } = await import("../src/lib/pricing");
  assert.equal(escortPrice(S, 30, 0), 22.5);
  assert.equal(escortPrice(S, 80, 10), 38.05); // 80 min -> 90 min
});

test("vienkartinė kelionė pagal zonas, suaugusiam 3 € pigiau", async () => {
  const { oneOffPrice, standardTripValue } = await import("../src/lib/pricing");
  assert.equal(oneOffPrice(S, 4, 12), 21); assert.equal(oneOffPrice(S, 9, 25, "adult"), 25);
  assert.equal(oneOffPrice(S, 20, 50), 44);
  assert.equal(oneOffPrice(S, 25, 60), Math.round(standardTripValue(S, 60, 25) * 1.2));
});

test("atšaukimai: vėlyvas – dalis, dėl teikėjo – nieko", async () => {
  const { countedPart } = await import("../src/lib/pricing");
  assert.equal(countedPart({ status: "delivered", cancel_fee_pct: null, credit_eur: null }), 1);
  assert.equal(countedPart({ status: "cancelled", cancel_fee_pct: 50, credit_eur: null }), 0.5);
  assert.equal(countedPart({ status: "cancelled", cancel_fee_pct: 0, credit_eur: 20 }), 0);
});
