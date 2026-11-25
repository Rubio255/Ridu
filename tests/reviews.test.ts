import { test } from "node:test";
import assert from "node:assert/strict";
import { canReview, rating, reviewVisible, validateReview } from "../src/lib/reviews";

const now = Date.parse("2026-11-25T12:00:00Z");
const ago = (d: number) => new Date(now - d * 864e5).toISOString();

test("žvaigždutės 1–5 ir komentaras iki 500 simbolių", () => {
  assert.equal(validateReview({ stars: 0 }).ok, false);
  assert.equal(validateReview({ stars: 6 }).ok, false);
  assert.equal(validateReview({ stars: 4.5 }).ok, false);
  const v = validateReview({ stars: "5", comment: "x".repeat(600) });
  assert.ok(v.ok && v.stars === 5 && v.comment!.length === 500);
  const e = validateReview({ stars: 3, comment: "  " });
  assert.ok(e.ok && e.comment === null);
});
test("vertinti galima tik baigtą kelionę 14 d.", () => {
  assert.ok(canReview({ status: "delivered", delivered_at: ago(2) }, now));
  assert.ok(!canReview({ status: "delivered", delivered_at: ago(15) }, now));
  assert.ok(!canReview({ status: "picked_up", delivered_at: null }, now));
});
test("matomas, kai įvertina abu arba po 14 d.", () => {
  assert.ok(!reviewVisible({ created_at: ago(1) }, false, now));
  assert.ok(reviewVisible({ created_at: ago(1) }, true, now));
  assert.ok(reviewVisible({ created_at: ago(15) }, false, now));
  assert.ok(!reviewVisible({ created_at: ago(15), hidden: true }, true, now));
});
test("vidurkis rodomas nuo 3 atsiliepimų", () => {
  assert.deepEqual(rating([5, 4]), { avg: null, count: 2 });
  assert.deepEqual(rating([5, 4, 5]), { avg: 4.7, count: 3 });
});
