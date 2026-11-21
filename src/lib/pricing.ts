// Abonemento kainos ir grafiko taisyklės (gryna logika, be duomenų bazės).
import { plansOf, type Settings, type PlanId } from "./settings";
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

export type PassengerType = "child" | "adult" | "senior";
export const PASSENGER_LT: Record<PassengerType, string> = { child: "Vaikas", adult: "Suaugęs", senior: "Vyresnio amžiaus" };
// Laikas išlaipinti (kainodara v6): vaikas ir vyresnio amžiaus su palyda iki durų, suaugęs be palydos
export const handoverFor = (s: Settings, t: PassengerType = "child") => t === "adult" ? s.handover_adult : t === "senior" ? s.handover_senior : s.handover_min;
// Automobilis užimtas: važiavimas + perdavimas + privažiavimas + pertrauka (pertrauka planuojama grafike)
export const blockMin = (s: Settings, driveMin: number, t: PassengerType = "child") => driveMin + handoverFor(s, t) + s.deadhead_min + s.gap_min;

const r2 = (x: number) => Math.round(x * 100) / 100;

// Standartinė kelionės vertė su PVM (v7): pertrauka klientui neskaičiuojama (billed_break_min = 0)
export function standardTripValue(s: Settings, driveMin: number, km: number, t: PassengerType = "child") {
  return r2(s.minute_rate * (driveMin + handoverFor(s, t) + s.deadhead_min + s.billed_break_min) + s.km_rate * (km + s.empty_km));
}

// Vairuotojo dalis: visada procentas nuo STANDARTINĖS vertės be PVM, nesvarbu, kaip mokėjo klientas
export const driverShare = (s: Settings, standard: number, pct = s.driver_pct) => r2((standard / (1 + s.vat_pct / 100)) * pct / 100);

function inWindows(windows: string, time: string) {
  const m = toMin(time);
  return windows.split(",").some((w) => {
    const [a, b] = w.split("-").map((x) => x.trim());
    return a && b && m >= toMin(a) && m < toMin(b);
  });
}
// Laiko koeficientas: pikas, ramus laikas arba įprastas (1,0). Abonementams jis užfiksuojamas užsakant;
// plano kreditas visada leidžiamas standartine verte be koeficientų.
export function timeMultiplier(s: Settings, time: string) {
  return inWindows(s.peak_windows, time) ? s.peak_mult : inWindows(s.quiet_windows, time) ? s.quiet_mult : 1;
}

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

// Vieno keleivio dalis, kai kelionėje vežami keli (1 → 1,0; 2 → 0,6; 3 → 0,45; 4 → 0,37)
export const kidsShare = (s: Settings, kids: number) => {
  const n = Math.min(4, Math.max(1, kids));
  return n === 1 ? 1 : (s[`share${n}` as "share2"] as number) / 100;
};

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
  standard: number; // standartinė vienos kelionės vertė (visam automobiliui), iš jos skaičiuojama vairuotojo dalis
};

export function quoteSubscription(
  s: Settings,
  existing: SubLike[],
  req: { weekdays: number[]; period: "am" | "pm"; pickup_time: string; extra_kids: number; months: number; km: number; driveMin: number; passenger?: PassengerType },
): Quote {
  const kids = Math.min(4, 1 + Math.max(0, req.extra_kids));
  const bm = blockMin(s, req.driveMin, req.passenger);
  const empty: Quote = { ok: false, full: false, perTrip: 0, monthly: 0, tripsPerMonth: 0, kids, standard: 0,
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
  // Nėra laisvų vietų: galimas tik pasiūlymas aukcione, minimumas skaičiuojamas su aukciono koeficientu
  const mult = full ? s.auction_mult : timeMultiplier(s, req.pickup_time);
  const commitPct = req.months >= 9 ? s.commit9_pct : req.months >= 3 ? s.commit3_pct : 0;
  const carTrip = standardTripValue(s, req.driveMin, req.km, req.passenger);
  const share = kidsShare(s, kids);
  const perWeekToMonth = (wds.length * 52) / 12;
  const perChildMonthly = Math.round(carTrip * share * mult * (1 - commitPct / 100) * perWeekToMonth);
  return {
    ok: true, full, kids, standard: carTrip,
    monthly: perChildMonthly * kids,
    perTrip: Math.round((perChildMonthly / perWeekToMonth) * 100) / 100,
    tripsPerMonth: Math.round(perWeekToMonth),
    internal: { carTrip: Math.round(carTrip * 100) / 100, occupancy: occ, multiplier: mult, commitPct, blockMin: bm },
  };
}

export function cancelFeePct(s: Settings, hoursBefore: number) {
  return hoursBefore < s.very_late_hours ? s.very_late_pct : hoursBefore < s.cancel_hours ? s.late_cancel_pct : 0;
}

// Mėnesio kelionių standartinė vertė pagal grafiką (kredito planams parinkti)
export const monthlyStandard = (standardPerTrip: number, tripsPerWeek: number) => r2(standardPerTrip * tripsPerWeek * 52 / 12);

// Kredito planas: mokėti = plano kaina + viršijimas. Pirmiausia naudojamas perkeltas kreditas (jis baigiasi greičiau).
// Nepanaudotas šio mėnesio kreditas perkeliamas credit_carry_months mėnesiams (v7: 1), toliau nebeperkeliamas.
export function planBill(s: Settings, plan: { price: number; credit: number }, used: number, carriedIn = 0) {
  const fromCarry = Math.min(carriedIn, used), rest = used - fromCarry;
  const fromCredit = Math.min(plan.credit, rest), over = r2(rest - fromCredit);
  return { due: r2(plan.price + over), over, carryOut: s.credit_carry_months > 0 ? r2(plan.credit - fromCredit) : 0, expired: r2(carriedIn - fromCarry) };
}

// Pigiausias planas pagal numatomą mėnesio standartinę vertę
export function recommendPlan(s: Settings, monthlyValue: number) {
  return plansOf(s).map((p) => ({ ...p, due: planBill(s, p, monthlyValue).due })).sort((a, b) => a.due - b.due)[0];
}
export const planById = (s: Settings, id: PlanId | string | null | undefined) => plansOf(s).find((p) => p.id === id) ?? null;

// Vyresnio amžiaus žmogaus palyda: valandinis tarifas, mažiausiai escort_min_h, apvalinama į viršų escort_step_min
export function escortPrice(s: Settings, minutes: number, km: number) {
  const billed = Math.max(s.escort_min_h * 60, Math.ceil(Math.max(0, minutes) / s.escort_step_min) * s.escort_step_min);
  return r2(s.escort_hour * billed / 60 + s.escort_km * Math.max(0, km));
}

// Vienkartinė kelionė pagal zoną; virš 20 km – standartinė vertė su antkainiu. Antkainis lieka platformai.
// Savaitgalio ir švenčių priemoka (savininkas patvirtino 2026-11-21) taikoma TIK vienkartinėms kelionėms.
export function oneOffPrice(s: Settings, km: number, driveMin: number, t: PassengerType = "child", weekend = false) {
  const zones: [number, number][] = [[5, s.zone_a], [10, s.zone_b], [15, s.zone_c], [20, s.zone_d]];
  const z = zones.find(([max]) => km <= max);
  const base = z ? z[1] : Math.round(standardTripValue(s, driveMin, km, t) * (1 + s.zone_over_pct / 100));
  const price = Math.max(0, t === "adult" ? base - s.zone_adult_off : base);
  return weekend && s.surcharge_approved ? Math.round(price * (1 + s.weekend_pct / 100)) : price;
}

// Kiek kelionės vertės skaičiuojama: įvykusi, suplanuota ar neatvykus – visa; atšaukta – pagal atšaukimo mokestį;
// atšaukta dėl teikėjo (įskaityta klientui) – nieko.
export type CountTrip = { status: string; cancel_fee_pct: number | null; credit_eur: number | null };
export function countedPart(t: CountTrip) {
  if (t.status !== "cancelled") return 1;
  if (Number(t.credit_eur ?? 0) > 0) return 0;
  return Number(t.cancel_fee_pct ?? 0) / 100;
}

// Plano mėnesių grandinė nuo plano pradžios: kiekvieno mėnesio sąskaita su perkeltu kreditu
export function planChain(s: Settings, plan: { price: number; credit: number }, usedByMonth: number[]) {
  let carry = 0;
  return usedByMonth.map((used) => { const b = planBill(s, plan, used, carry); carry = b.carryOut; return { used, ...b }; });
}
