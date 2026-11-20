import { test } from "node:test";
import assert from "node:assert/strict";
import { quickCalc, isVerified } from "../src/lib/welcome";
import { DEFAULT_SETTINGS as S } from "../src/lib/settings";

test("skaičiuoklė kaip kainų puslapyje: 8 km, 2 k./sav., vaikas – 300 €", () => {
  assert.equal(quickCalc(S, { km: 8, perWeek: 2, passenger: "child", leisure: false }).sub, 300);
  assert.equal(quickCalc(S, { km: 8, perWeek: 2, passenger: "adult", leisure: false }).sub, 263);
});

test("laisvalaikis vertinamas pigiau, todėl vežioti patiems kainuoja mažiau", () => {
  const w = quickCalc(S, { km: 8, perWeek: 2, passenger: "child", leisure: false }), l = quickCalc(S, { km: 8, perWeek: 2, passenger: "child", leisure: true });
  assert.ok(l.self < w.self); assert.equal(l.hours, w.hours);
});

test("ženklas „patikrintas“ tik kai visi dokumentai galioja", () => {
  assert.equal(isVerified({ docs: [{ valid_until: null }, { valid_until: "2999-01-01" }] }), true);
  assert.equal(isVerified({ docs: [{ valid_until: null }, { valid_until: "2000-01-01" }] }), false);
  assert.equal(isVerified({ docs: [] }), false);
});
