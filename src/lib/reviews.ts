// Atsiliepimai po kelionės. Grynos funkcijos, kad būtų lengva testuoti.
export const REVIEW_WINDOW_DAYS = 14; // rašyti galima ir atsiliepimas be atsakymo tampa matomas po tiek dienų
export const COMMENT_MAX = 500;
const DAY = 864e5;

export function validateReview(i: { stars: unknown; comment?: unknown }) {
  const stars = Number(i.stars);
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) return { ok: false as const, error: "Pasirinkite nuo 1 iki 5 žvaigždučių." };
  const comment = String(i.comment ?? "").trim().slice(0, COMMENT_MAX);
  return { ok: true as const, stars, comment: comment || null };
}

// Ar dar galima rašyti atsiliepimą apie kelionę
export const canReview = (t: { status: string; delivered_at: string | null }, now = Date.now()) =>
  t.status === "delivered" && !!t.delivered_at && now - new Date(t.delivered_at).getTime() <= REVIEW_WINDOW_DAYS * DAY;

// Atsiliepimas matomas, kai įvertino abu arba praėjo 14 d.
export const reviewVisible = (r: { created_at: string; hidden?: boolean }, counterpartReviewed: boolean, now = Date.now()) =>
  !r.hidden && (counterpartReviewed || now - new Date(r.created_at).getTime() > REVIEW_WINDOW_DAYS * DAY);

// Vidurkis su viena dešimtąja ir kiekiu. Mažiau nei 3 atsiliepimai – vidurkio nerodome, kad vienas balas neiškreiptų.
export function rating(stars: number[]) {
  if (stars.length < 3) return { avg: null, count: stars.length };
  return { avg: Math.round((stars.reduce((a, b) => a + b, 0) / stars.length) * 10) / 10, count: stars.length };
}
