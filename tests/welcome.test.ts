import { test } from "node:test";
import assert from "node:assert/strict";
import { quickCalc, driverChecks } from "../src/lib/welcome";
import { DEFAULT_SETTINGS as S } from "../src/lib/settings";

test("skaičiuoklė kaip kainų puslapyje: 8 km, 2 k./sav., vaikas – 300 €", () => {
  assert.equal(quickCalc(S, { km: 8, perWeek: 2, passenger: "child", leisure: false }).sub, 300);
  assert.equal(quickCalc(S, { km: 8, perWeek: 2, passenger: "adult", leisure: false }).sub, 263);
});

test("laisvalaikis vertinamas pigiau, todėl vežioti patiems kainuoja mažiau", () => {
  const w = quickCalc(S, { km: 8, perWeek: 2, passenger: "child", leisure: false }), l = quickCalc(S, { km: 8, perWeek: 2, passenger: "child", leisure: true });
  assert.ok(l.self < w.self); assert.equal(l.hours, w.hours);
});

test("klientui rodomi tik galiojantys patikrinimai", () => {
  const c = driverChecks({ child_qr_verified: true, child_seats: false, docs: [{ name: "Pažyma apie teistumą", valid_until: "2000-01-01" }, { name: "Individualios veiklos pažyma", valid_until: null }] });
  assert.deepEqual(c, ["Dirba legaliai pagal individualios veiklos pažymą", "Patikrinta: neteistas (QR kodas)"]);
  assert.ok(!c.some((x) => /leidim/i.test(x)));
});
