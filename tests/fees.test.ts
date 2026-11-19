import { test } from "node:test";
import assert from "node:assert/strict";
import { familyFees, feeForPayer, type FeeSub } from "../src/lib/fees";

const g = new Map([["c1", ["mama", "tetis"]], ["c2", ["mama", "tetis"]], ["c3", ["egle"]]]);
const sub = (o: Partial<FeeSub>): FeeSub => ({ id: "s1", child_id: "c1", payer_id: "mama", status: "active", starts_on: "2026-10-01", ends_on: null, ...o });

test("visas mėnuo – pilnas mokestis", () => {
  const f = familyFees("2026-11", 9.9, [sub({})], [], g);
  assert.equal(f[0].fee, 9.9); assert.equal(feeForPayer(f, "mama"), 9.9);
});

test("pirmas mėnuo – pagal dienas", () => {
  const f = familyFees("2026-11", 9.9, [sub({ starts_on: "2026-11-16" })], [], g);
  assert.equal(f[0].days, 15); assert.equal(f[0].fee, 4.95);
});

test("nutraukta sutartis – iki pabaigos dienos, vėliau nebeskaičiuojama", () => {
  assert.equal(familyFees("2026-11", 9.9, [sub({ status: "ended", ends_on: "2026-11-10" })], [], g)[0].fee, 3.3);
  assert.equal(familyFees("2026-12", 9.9, [sub({ status: "ended", ends_on: "2026-11-10" })], [], g).length, 0);
});

test("du vaikai ir abu tėvai – vienas mokestis šeimai, dalijamas per pusę", () => {
  const f = familyFees("2026-11", 9.9, [sub({}), sub({ id: "s2", child_id: "c2", payer_id: "tetis" })], [], g);
  assert.equal(f.length, 1); assert.equal(f[0].fee, 9.9); assert.equal(feeForPayer(f, "tetis"), 4.95);
});

test("visas keliones atšaukė teikėjas – mokesčio nėra", () => {
  const trips = [{ subscription_id: "s1", status: "cancelled", credit_eur: 29.5 }, { subscription_id: "s1", status: "cancelled", credit_eur: 29.5 }];
  assert.equal(familyFees("2026-11", 9.9, [sub({})], trips, g)[0].fee, 0);
  assert.equal(familyFees("2026-11", 9.9, [sub({})], [...trips, { subscription_id: "s1", status: "delivered", credit_eur: null }], g)[0].fee, 9.9);
});
