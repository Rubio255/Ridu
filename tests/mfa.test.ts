import { test } from "node:test";
import assert from "node:assert/strict";
import { mfaNeed } from "../src/lib/mfa";

const now = 1_800_000_000;
const amr = (ago: number) => [{ method: "otp", timestamp: now - 99999 }, { method: "totp", timestamp: now - ago }];

test("darbuotojai be MFA turi jį įsijungti, klientai ne", () => {
  assert.equal(mfaNeed({ role: "owner", aal: "aal1", amr: undefined, hasMfa: false, now }), "enroll");
  assert.equal(mfaNeed({ role: "driver", aal: "aal1", amr: undefined, hasMfa: false, now }), "enroll");
  assert.equal(mfaNeed({ role: "client", aal: "aal1", amr: undefined, hasMfa: false, now }), "ok");
});

test("turint MFA be antro žingsnio reikia patvirtinti", () => {
  for (const role of ["owner", "driver", "client"] as const) assert.equal(mfaNeed({ role, aal: "aal1", amr: undefined, hasMfa: true, now }), "verify");
});

test("savininkas kodą kartoja po 12 val., vairuotojas po 7 d., klientas ne", () => {
  assert.equal(mfaNeed({ role: "owner", aal: "aal2", amr: amr(3600), hasMfa: true, now }), "ok");
  assert.equal(mfaNeed({ role: "owner", aal: "aal2", amr: amr(13 * 3600), hasMfa: true, now }), "verify");
  assert.equal(mfaNeed({ role: "driver", aal: "aal2", amr: amr(13 * 3600), hasMfa: true, now }), "ok");
  assert.equal(mfaNeed({ role: "driver", aal: "aal2", amr: amr(8 * 86400), hasMfa: true, now }), "verify");
  assert.equal(mfaNeed({ role: "client", aal: "aal2", amr: amr(30 * 86400), hasMfa: true, now }), "ok");
  assert.equal(mfaNeed({ role: "owner", aal: "aal2", amr: undefined, hasMfa: true, now }), "verify");
});
