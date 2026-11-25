import { test } from "node:test";
import assert from "node:assert/strict";
import { scanMessage, shouldEscalate } from "../src/lib/chat-filter";
import { extendPlus, normCode, rewardCheck, type Party } from "../src/lib/referrals";

test("filtras: išankstinis mokėjimas", () => {
  assert.deepEqual(scanMessage("Prieš susitikimą pervesk 50 € avansą"), ["prepay"]);
  assert.deepEqual(scanMessage("Please pay a deposit upfront"), ["prepay"]);
  assert.deepEqual(scanMessage("Atvyksiu 14:30, iki pasimatymo"), []);
});
test("filtras: banko duomenys ir kortelė (Luhn)", () => {
  assert.ok(scanMessage("Parašyk kortelės numerį ir CVV").includes("bank"));
  assert.ok(scanMessage("LT12 1000 0111 0100 1000").includes("bank"));
  assert.ok(scanMessage("4111 1111 1111 1111").includes("bank"));
  assert.ok(!scanMessage("Mano tel. +370 612 34567").includes("bank"));
});
test("filtras: išėjimas iš platformos, bet ne telefonas", () => {
  assert.ok(scanMessage("Rašyk man į WhatsApp").includes("offplatform"));
  assert.ok(scanMessage("jonas@pastas.lt").includes("offplatform"));
  assert.deepEqual(scanMessage("Skambinkite +370 612 34567"), []);
});
test("eskalacija po 3 žymų", () => {
  assert.ok(!shouldEscalate(2));
  assert.ok(shouldEscalate(3));
});

const now = Date.parse("2026-11-25T12:00:00Z");
const p = (o: Partial<Party>): Party => ({ id: "x", email: null, phone: null, created_at: new Date(now - 864e5).toISOString(), email_confirmed: true, phone_confirmed: true, ...o });
const A = p({ id: "a", email: "a@a.lt", phone: "+37061111111", created_at: "2025-01-01T00:00:00Z" });
const opt = { inviterRewardsThisMonth: 0, inviteeAlreadyReferred: false, now };
test("rekomendacijos: apsauga nuo piktnaudžiavimo", () => {
  assert.equal(rewardCheck(A, p({ id: "b", email: "b@b.lt" }), opt), null);
  assert.equal(rewardCheck(A, { ...A }, opt), "self");
  assert.equal(rewardCheck(A, p({ id: "b", email: "A@a.lt" }), opt), "same_contact");
  assert.equal(rewardCheck(A, p({ id: "b", phone_confirmed: false }), opt), "not_confirmed");
  assert.equal(rewardCheck(A, p({ id: "b", created_at: "2026-09-01T00:00:00Z" }), opt), "not_new");
  assert.equal(rewardCheck(A, p({ id: "b" }), { ...opt, inviterRewardsThisMonth: 5 }), "cap");
});
test("Plus pratęsiamas nuo esamos pabaigos", () => {
  const n = new Date("2026-11-25T00:00:00Z");
  assert.equal(extendPlus(null, n), "2026-12-25T00:00:00.000Z");
  assert.equal(extendPlus("2027-01-10T00:00:00.000Z", n), "2027-02-10T00:00:00.000Z");
  assert.equal(normCode(" ab-c2d "), "ABC2D");
});
