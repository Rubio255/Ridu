// Ilgalaikio užsakymo kainos ir grafiko taisyklės (gryna logika, be duomenų bazės).
import type { Settings } from "./settings";
import { toMin } from "./time";

export type SubLike = {
  id?: string;
  weekdays: number[];
  period: "am" | "pm";
  pickup_time: string; // "HH:MM"
  extra_kids: number;
  block_min: number; // automobilio minutės vienai kelionei
  status: string;
};

export const blockMin = (s: Settings, driveMin: number) => driveMin + s.handover_min + s.deadhead_min + s.gap_min;

export function inAfternoon(s: Settings, time: string) {
  const m = toMin(time);
  return m >= toMin(s.afternoon_start) && m < toMin(s.afternoon_end);
}

const live = (x: SubLike) => x.status === "active" || x.status === "pending";

export function morningKids(subs: SubLike[], wd: number, ignore?: string) {
  return subs.filter((x) => x.id !== ignore && live(x) && x.period === "am" && x.weekdays.includes(wd))
    .reduce((a, x) => a + 1 + x.extra_kids, 0);
}
export function afternoonTrips(subs: SubLike[], wd: number, ignore?: string) {
  return subs.filter((x) => x.id !== ignore && live(x) && x.period === "pm" && x.weekdays.includes(wd)).length;
}
// Užimtumas: parduotos automobilio minutės tos savaitės dienos valandoje / 60
export function hourOccupancy(subs: SubLike[], wd: number, hour: number, ignore?: string) {
  return subs.filter((x) => x.id !== ignore && live(x) && x.period === "pm" && x.weekdays.includes(wd)
    && Math.floor(toMin(x.pickup_time) / 60) === hour).reduce((a, x) => a + x.block_min, 0) / 60;
}

function occMult(s: Settings, o: number) {
  return o >= 0.95 ? s.occ_m4 : o >= 0.8 ? s.occ_m3 : o >= 0.5 ? s.occ_m2 : s.occ_m1;
}

export type Quote = {
  ok: boolean;
  reason?: string;
  full: boolean; // laisvų vietų nėra -> galima tik pasiūlymas
  perTrip: number;
  monthly: number;
  tripsPerMonth: number;
  kids: number;
  // vidinė informacija savininkui
  internal: { carTrip: number; occupancy: number; multiplier: number; commitPct: number; blockMin: number };
};

export function quoteSubscription(
  s: Settings,
  existing: SubLike[],
  req: { weekdays: number[]; period: "am" | "pm"; pickup_time: string; extra_kids: number; months: number; km: number; driveMin: number },
): Quote {
  const kids = Math.min(4, 1 + Math.max(0, req.extra_kids));
  const bm = blockMin(s, req.driveMin);
  const empty: Quote = { ok: false, full: false, perTrip: 0, monthly: 0, tripsPerMonth: 0, kids,
    internal: { carTrip: 0, occupancy: 0, multiplier: 1, commitPct: 0, blockMin: bm } };
  const wds = req.weekdays.filter((w) => w >= 1 && w <= 5);
  if (!wds.length) return { ...empty, reason: "Pasirinkite bent vieną darbo dieną." };
  if (req.period === "pm" && !inAfternoon(s, req.pickup_time))
    return { ...empty, reason: `Po pietų vežame ${s.afternoon_start}–${s.afternoon_end}.` };

  let occ: number, full: boolean;
  if (req.period === "am") {
    occ = Math.max(...wds.map((w) => morningKids(existing, w))) / s.morning_max_kids;
    full = Math.max(...wds.map((w) => morningKids(existing, w) + kids)) > s.morning_max_kids;
  } else {
    const hour = Math.floor(toMin(req.pickup_time) / 60);
    occ = Math.max(...wds.map((w) => hourOccupancy(existing, w, hour)));
    const after = Math.max(...wds.map((w) => hourOccupancy(existing, w, hour) + bm / 60));
    full = occ > 0.95 || after > 1 || Math.max(...wds.map((w) => afternoonTrips(existing, w))) >= s.afternoon_max_trips;
  }
  const mult = full ? s.occ_m4 : occMult(s, occ);
  const commitPct = req.months >= 9 ? s.commit9_pct : req.months >= 3 ? s.commit3_pct : 0;
  const carTrip = s.minute_rate * bm + s.km_rate * (req.km + s.empty_km);
  const share = kids === 1 ? 1 : (s[`share${kids}` as "share2"] as number) / 100;
  const perWeekToMonth = (wds.length * 52) / 12;
  const perChildMonthly = Math.round(carTrip * share * mult * (1 - commitPct / 100) * perWeekToMonth);
  return {
    ok: true, full, kids,
    monthly: perChildMonthly * kids,
    perTrip: Math.round((perChildMonthly / perWeekToMonth) * 100) / 100,
    tripsPerMonth: Math.round(perWeekToMonth),
    internal: { carTrip: Math.round(carTrip * 100) / 100, occupancy: occ, multiplier: mult, commitPct, blockMin: bm },
  };
}

export function cancelFeePct(s: Settings, hoursBefore: number) {
  return hoursBefore < s.very_late_hours ? s.very_late_pct : hoursBefore < s.cancel_hours ? s.late_cancel_pct : 0;
}
