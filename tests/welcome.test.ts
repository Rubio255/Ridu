import { test } from "node:test";
import assert from "node:assert/strict";
import { quickCalc, isVerified } from "../src/lib/welcome";
import { DEFAULT_SETTINGS as S } from "../src/lib/settings";

test("skaičiuoklė kaip kainų puslapyje: 8 km, 2 k./sav., vaikas – 300 €", () => {
  assert.equal(quickCalc(S, { km: 8, perWeek: 2, passenger: "child", hourValue: 15 }).sub, 300);
  assert.equal(quickCalc(S, { km: 8, perWeek: 2, passenger: "adult", hourValue: 15 }).sub, 263);
});

test("jūsų laikas kainuoja: valandos vertė didina vežiojimo patiems kainą", () => {
  const r = quickCalc(S, { km: 8, perWeek: 2, passenger: "child", hourValue: 15 });
  assert.equal(r.hours, 11.6); assert.equal(r.time, 174); assert.equal(r.self, r.car + r.time);
  assert.equal(quickCalc(S, { km: 8, perWeek: 2, passenger: "child", hourValue: 0 }).time, 0);
});

test("ženklas „patikrintas“ tik kai visi dokumentai galioja", () => {
  assert.equal(isVerified({ docs: [{ valid_until: null }, { valid_until: "2999-01-01" }] }), true);
  assert.equal(isVerified({ docs: [{ valid_until: null }, { valid_until: "2000-01-01" }] }), false);
  assert.equal(isVerified({ docs: [] }), false);
});
