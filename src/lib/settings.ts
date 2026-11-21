// Visi kainodaros ir grafiko parametrai. Saugomi lentelėje settings (jsonb), keičia savininkas.
// Pradinės reikšmės pagal kainodarą v7 (pricing_config.json, savininkas patvirtino 2026-11-21).

export type Settings = {
  // Abonementų kaina
  minute_rate: number; // € už automobilio minutę, su PVM
  km_rate: number; // € už km, su PVM
  empty_km: number; // tušti km iki paėmimo
  share2: number; // vieno vaiko dalis, kai vežami 2 (%)
  share3: number;
  share4: number;
  // Laiko koeficientai: piko ir ramaus laiko langai, pvz. "07:15-08:30, 13:30-16:00"
  peak_windows: string;
  peak_mult: number;
  quiet_windows: string;
  quiet_mult: number;
  commit3_pct: number;
  commit9_pct: number;
  // Aukcionas, kai laisvų vietų nėra (užimta > 95 %)
  auction_mult: number; // minimalaus pasiūlymo koeficientas
  bid_step_pct: number;
  bid_close_day: number;
  // Kredito planai (kaina su PVM ir platformos mokesčiu; kreditas leidžiamas standartine kelionės verte)
  plan_basic_price: number;
  plan_basic_credit: number;
  plan_family_price: number;
  plan_family_credit: number;
  plan_premium_price: number;
  plan_premium_credit: number;
  credit_carry_months: number;
  // Rytinio maršruto vieta
  seat_price: number; // €/mėn. su platformos mokesčiu
  seat_max: number;
  // Vyresnio amžiaus žmogaus palyda valandiniu tarifu
  escort_hour: number;
  escort_km: number;
  escort_min_h: number;
  escort_step_min: number;
  // Vienkartinės kelionės pagal zonas (vaikas, vyresnio amžiaus; suaugusiam pigiau)
  zone_a: number; // iki 5 km
  zone_b: number; // iki 10 km
  zone_c: number; // iki 15 km
  zone_d: number; // iki 20 km
  zone_over_pct: number; // virš 20 km: standartinė vertė + %
  zone_adult_off: number;
  // Grafikas
  handover_min: number;
  handover_adult: number;
  handover_senior: number;
  deadhead_min: number;
  gap_min: number; // pertrauka planuojama, bet klientui neskaičiuojama
  billed_break_min: number; // kiek pertraukos minučių įskaičiuojama į kainą (v7: 0)
  day_limit_h: number;
  morning_start: string; // "07:15"
  morning_end: string;
  morning_deliver_by: string;
  morning_max_kids: number;
  afternoon_start: string;
  afternoon_end: string;
  afternoon_max_trips: number;
  // Atšaukimas
  cancel_hours: number;
  late_cancel_pct: number;
  very_late_hours: number;
  very_late_pct: number;
  // Šventės ir savaitgaliai
  weekend_pct: number;
  surcharge_approved: boolean;
  // Finansai
  vat_pct: number;
  tax_pct: number;
  cost_insurance: number;
  cost_wash: number;
  cost_service: number;
  fuel_l_100km: number;
  fuel_price: number;
  target_net: number;
  driver_pct: number; // vairuotojui nuo standartinės kelionės vertės be PVM
  mb_costs: number;
  platform_fee: number;
};

export const DEFAULT_SETTINGS: Settings = {
  driver_pct: 70, mb_costs: 60, platform_fee: 9.9,
  minute_rate: 0.37,
  km_rate: 0.43,
  empty_km: 6,
  share2: 60,
  share3: 45,
  share4: 37,
  peak_windows: "07:15-08:30, 13:30-16:00",
  peak_mult: 1.15,
  quiet_windows: "10:00-13:00",
  quiet_mult: 0.9,
  commit3_pct: 5,
  commit9_pct: 10,
  auction_mult: 1.3,
  bid_step_pct: 5,
  bid_close_day: 25,
  plan_basic_price: 219,
  plan_basic_credit: 210,
  plan_family_price: 469,
  plan_family_credit: 505,
  plan_premium_price: 749,
  plan_premium_credit: 810,
  credit_carry_months: 1,
  seat_price: 249,
  seat_max: 4,
  escort_hour: 22.5,
  escort_km: 0.43,
  escort_min_h: 1,
  escort_step_min: 15,
  zone_a: 21,
  zone_b: 28,
  zone_c: 36,
  zone_d: 44,
  zone_over_pct: 20,
  zone_adult_off: 3,
  handover_min: 14,
  handover_adult: 6,
  handover_senior: 14,
  deadhead_min: 10,
  gap_min: 10,
  billed_break_min: 0,
  day_limit_h: 7.5,
  morning_start: "07:15",
  morning_end: "08:30",
  morning_deliver_by: "08:00",
  morning_max_kids: 3,
  afternoon_start: "13:30",
  afternoon_end: "18:30",
  afternoon_max_trips: 5,
  cancel_hours: 12,
  late_cancel_pct: 50,
  very_late_hours: 2,
  very_late_pct: 100,
  weekend_pct: 25,
  surcharge_approved: false,
  vat_pct: 21,
  tax_pct: 15,
  cost_insurance: 60,
  cost_wash: 40,
  cost_service: 50,
  fuel_l_100km: 4.8,
  fuel_price: 1.8,
  target_net: 2000,
};

export function withDefaults(data: unknown): Settings {
  return { ...DEFAULT_SETTINGS, ...((data as Partial<Settings>) ?? {}) };
}

// Laiko langų tekstas "07:15-08:30, 13:30-16:00"
export const WINDOWS_RE = /^\s*\d{2}:\d{2}\s*-\s*\d{2}:\d{2}(\s*,\s*\d{2}:\d{2}\s*-\s*\d{2}:\d{2})*\s*$/;

export type PlanId = "basic" | "family" | "premium";
export const PLAN_NAMES: Record<PlanId, string> = { basic: "Bazinis", family: "Šeimos", premium: "Premium" };
export const plansOf = (s: Settings) => ([
  { id: "basic", name: PLAN_NAMES.basic, price: s.plan_basic_price, credit: s.plan_basic_credit },
  { id: "family", name: PLAN_NAMES.family, price: s.plan_family_price, credit: s.plan_family_credit },
  { id: "premium", name: PLAN_NAMES.premium, price: s.plan_premium_price, credit: s.plan_premium_credit },
] as { id: PlanId; name: string; price: number; credit: number }[]);

// Laukų aprašai nustatymų formai
export const SETTINGS_GROUPS: { title: string; fields: [keyof Settings, string][] }[] = [
  { title: "Kelionės vertė", fields: [
    ["minute_rate", "Automobilio minutė, € su PVM"], ["km_rate", "Kilometras, € su PVM"], ["empty_km", "Tušti km iki paėmimo"],
    ["share2", "Keleivio dalis, kai vežami 2, %"], ["share3", "Keleivio dalis, kai vežami 3, %"], ["share4", "Keleivio dalis, kai vežami 4, %"],
    ["commit3_pct", "Nuolaida įsipareigojus 3 mėn., %"], ["commit9_pct", "Nuolaida įsipareigojus 9 mėn., %"],
  ]},
  { title: "Laiko koeficientai", fields: [
    ["peak_windows", "Piko laikas (pvz. 07:15-08:30, 13:30-16:00)"], ["peak_mult", "Piko koeficientas"],
    ["quiet_windows", "Ramus laikas"], ["quiet_mult", "Ramaus laiko koeficientas"], ["weekend_pct", "Savaitgalio ir švenčių priemoka, %"],
  ]},
  { title: "Aukcionas", fields: [
    ["auction_mult", "Minimalaus pasiūlymo koeficientas"], ["bid_step_pct", "Pasiūlymo žingsnis, %"], ["bid_close_day", "Pasiūlymai priimami iki mėnesio dienos"],
  ]},
  { title: "Kredito planai (su PVM ir platformos mokesčiu)", fields: [
    ["plan_basic_price", "Bazinis: kaina, €/mėn."], ["plan_basic_credit", "Bazinis: kreditas, €"],
    ["plan_family_price", "Šeimos: kaina, €/mėn."], ["plan_family_credit", "Šeimos: kreditas, €"],
    ["plan_premium_price", "Premium: kaina, €/mėn."], ["plan_premium_credit", "Premium: kreditas, €"],
    ["credit_carry_months", "Nepanaudotas kreditas galioja dar, mėn."],
  ]},
  { title: "Rytinis maršrutas, palyda ir vienkartinės kelionės", fields: [
    ["seat_price", "Rytinio maršruto vieta, €/mėn."], ["seat_max", "Vietų rytiniame maršrute"],
    ["escort_hour", "Palyda: valanda, €"], ["escort_km", "Palyda: kilometras, €"], ["escort_min_h", "Palyda: mažiausiai valandų"], ["escort_step_min", "Palyda: apvalinama minutėmis"],
    ["zone_a", "Vienkartinė A zona iki 5 km, €"], ["zone_b", "B zona iki 10 km, €"], ["zone_c", "C zona iki 15 km, €"], ["zone_d", "D zona iki 20 km, €"],
    ["zone_over_pct", "Virš 20 km: antkainis, %"], ["zone_adult_off", "Suaugusiam pigiau, €"],
  ]},
  { title: "Darbo laikas", fields: [
    ["morning_start", "Rytinio maršruto pradžia"], ["morning_end", "Rytinio maršruto pabaiga"], ["morning_deliver_by", "Visi nuvežti iki"],
    ["morning_max_kids", "Keleivių rytiniame maršrute"], ["afternoon_start", "Popietės pradžia"], ["afternoon_end", "Popietės pabaiga"],
    ["afternoon_max_trips", "Kelionių po pietų"], ["day_limit_h", "Darbo valandų per dieną"],
    ["handover_min", "Vaikas: parkavimas ir palyda, min"], ["handover_adult", "Suaugęs: išlaipinimas, min"], ["handover_senior", "Vyresnio amžiaus: palyda ir pagalba, min"], ["deadhead_min", "Privažiavimas iki kito paėmimo, min"],
    ["gap_min", "Pertrauka tarp kelionių, min"], ["billed_break_min", "Kiek pertraukos minučių įskaičiuoti į kainą"],
  ]},
  { title: "Atšaukimas", fields: [
    ["cancel_hours", "Vėlyvas atšaukimas, likus mažiau nei val."], ["late_cancel_pct", "Vėlyvo atšaukimo mokestis, %"],
    ["very_late_hours", "Labai vėlyvas, likus mažiau nei val."], ["very_late_pct", "Labai vėlyvo ar neatvykus mokestis, %"],
  ]},
  { title: "Vairuotojai ir MB", fields: [
    ["driver_pct", "Vairuotojui nuo standartinės vertės be PVM, %"], ["platform_fee", "Platformos mokestis šeimai be plano, €/mėn. su PVM"], ["mb_costs", "MB pastovios išlaidos, €/mėn."],
    ["vat_pct", "PVM, %"], ["tax_pct", "Mokesčiai MB, % nuo pelno"], ["target_net", "MB tikslas į rankas, €/mėn."],
  ]},
  { title: "Vairuotojo automobilio išlaidos (uždarbio skaičiavimui)", fields: [
    ["cost_insurance", "Draudimas pavežėjui, €/mėn."], ["cost_wash", "Plovimas, €/mėn."], ["cost_service", "Priežiūra, €/mėn."],
    ["fuel_l_100km", "Kuras, l/100 km"], ["fuel_price", "Kuro kaina, €/l"],
  ]},
];
