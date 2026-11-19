// Visi kainodaros ir grafiko parametrai. Saugomi lentelėje settings (jsonb), keičia savininkas.
// Pradinės reikšmės pagal kainodaros skaičiavimą (pricing_config.json v4).

export type Settings = {
  // Ilgalaikių užsakymų kaina
  minute_rate: number; // € už automobilio minutę
  km_rate: number; // € už km
  empty_km: number; // tušti km iki paėmimo
  share2: number; // vieno vaiko dalis, kai vežami 2 (%)
  share3: number;
  share4: number;
  occ_m1: number; // paklausos koeficientas, kai užimta < 50 %
  occ_m2: number; // 50–80 %
  occ_m3: number; // 80–95 %
  occ_m4: number; // > 95 % (aukciono minimumas)
  commit3_pct: number;
  commit9_pct: number;
  bid_close_day: number;
  // Grafikas
  handover_min: number;
  deadhead_min: number;
  gap_min: number;
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
  // Vienos dienos kelionės (kol kas išjungtos)
  single_enabled: boolean;
  single_base: number;
  driver_pct: number;
  mb_costs: number;
  platform_fee: number;
};

export const DEFAULT_SETTINGS: Settings = {
  driver_pct: 70, mb_costs: 60, platform_fee: 9.9,
  minute_rate: 0.56,
  km_rate: 0.12,
  empty_km: 6,
  share2: 60,
  share3: 45,
  share4: 37,
  occ_m1: 0.9,
  occ_m2: 1.0,
  occ_m3: 1.15,
  occ_m4: 1.3,
  commit3_pct: 5,
  commit9_pct: 10,
  bid_close_day: 25,
  handover_min: 14,
  deadhead_min: 14,
  gap_min: 10,
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
  cost_insurance: 35,
  cost_wash: 45,
  cost_service: 50,
  fuel_l_100km: 4.8,
  fuel_price: 1.8,
  target_net: 2000,
  single_enabled: false,
  single_base: 28.5,
};

export function withDefaults(data: unknown): Settings {
  return { ...DEFAULT_SETTINGS, ...((data as Partial<Settings>) ?? {}) };
}

// Laukų aprašai nustatymų formai
export const SETTINGS_GROUPS: { title: string; fields: [keyof Settings, string][] }[] = [
  { title: "Ilgalaikių užsakymų kaina", fields: [
    ["minute_rate", "Automobilio minutė, €"], ["km_rate", "Kilometras, €"], ["empty_km", "Tušti km iki paėmimo"],
    ["share2", "Vaiko dalis, kai vežami 2, %"], ["share3", "Vaiko dalis, kai vežami 3, %"], ["share4", "Vaiko dalis, kai vežami 4, %"],
    ["commit3_pct", "Nuolaida įsipareigojus 3 mėn., %"], ["commit9_pct", "Nuolaida įsipareigojus 9 mėn., %"],
  ]},
  { title: "Paklausa ir aukcionas", fields: [
    ["occ_m1", "Koeficientas, kai užimta iki 50 %"], ["occ_m2", "Kai užimta 50–80 %"], ["occ_m3", "Kai užimta 80–95 %"],
    ["occ_m4", "Kai užimta virš 95 % (aukciono minimumas)"], ["bid_close_day", "Pasiūlymai priimami iki mėnesio dienos"],
  ]},
  { title: "Darbo laikas", fields: [
    ["morning_start", "Rytinio maršruto pradžia"], ["morning_end", "Rytinio maršruto pabaiga"], ["morning_deliver_by", "Visi nuvežti iki"],
    ["morning_max_kids", "Vaikų rytiniame maršrute"], ["afternoon_start", "Popietės pradžia"], ["afternoon_end", "Popietės pabaiga"],
    ["afternoon_max_trips", "Kelionių po pietų"], ["day_limit_h", "Darbo valandų per dieną"],
    ["handover_min", "Parkavimas ir palyda, min"], ["deadhead_min", "Privažiavimas iki kito paėmimo, min"], ["gap_min", "Pertrauka tarp kelionių, min"],
  ]},
  { title: "Atšaukimas ir priemokos", fields: [
    ["cancel_hours", "Vėlyvas atšaukimas, likus mažiau nei val."], ["late_cancel_pct", "Vėlyvo atšaukimo mokestis, %"],
    ["very_late_hours", "Labai vėlyvas, likus mažiau nei val."], ["very_late_pct", "Labai vėlyvo ar neatvykus mokestis, %"],
    ["weekend_pct", "Savaitgalio ir švenčių priemoka, %"],
  ]},
  { title: "Vairuotojai ir MB", fields: [
    ["driver_pct", "Vairuotojui nuo kainos be PVM, %"], ["platform_fee", "Platformos mokestis šeimai, €/mėn. su PVM"], ["mb_costs", "MB pastovios išlaidos, €/mėn."],
    ["vat_pct", "PVM, %"], ["tax_pct", "Mokesčiai MB, % nuo pelno"], ["target_net", "MB tikslas į rankas, €/mėn."], ["single_base", "Vienos dienos kelionės kaina, €"],
  ]},
  { title: "Vairuotojo automobilio išlaidos (uždarbio skaičiavimui)", fields: [
    ["cost_insurance", "Draudimas, €/mėn."], ["cost_wash", "Plovimas, €/mėn."], ["cost_service", "Priežiūra, €/mėn."],
    ["fuel_l_100km", "Kuras, l/100 km"], ["fuel_price", "Kuro kaina, €/l"],
  ]},
];
