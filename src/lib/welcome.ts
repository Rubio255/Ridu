import { handoverFor, type PassengerType } from "./pricing";
import type { Settings } from "./settings";
import { vilniusToday } from "./time";

export const VISIT_HOW = { home: "Vairuotojas atvyksta pas jus", institution: "Susitinkame įstaigoje", phone: "Pokalbis telefonu" } as const;
export const VISIT_WHO = { child: "Vaikui", self: "Sau", relative: "Artimajam (pvz., tėvams)" } as const;
export const VISIT_STATUS: Record<string, [string, string]> = { new: ["Laukia patvirtinimo", "p-warn"], confirmed: ["Patvirtinta", "p-ok"], done: ["Įvyko", "p-info"], declined: ["Atšaukta", "p-bad"] };

// „Ar apsimoka?“: vežiojant patiems mokate už kelionę ten ir atgal (0,30 €/km, 1 € parkavimas) ir savo laiku (valandos vertę nurodo klientas).
// Prielaidos kaip kainų puslapyje: 2,75 min/km, papildomi 6 km, 15 min palyda + 5 min laukimas. Abonementas – 3 mėn. sutartis su platformos mokesčiu.
// Tikslinant klientas gali pakeisti ir savo automobilio kainą už km bei parkavimą vienai kelionei.
export type CalcInput = { km: number; perWeek: number; passenger: PassengerType; hourValue: number; costPerKm?: number; parking?: number };
export function quickCalc(s: Settings, i: CalcInput) {
  const km = Math.min(40, Math.max(1, i.km)), perWeek = Math.min(20, Math.max(1, Math.round(i.perWeek))), hv = Math.min(200, Math.max(0, i.hourValue));
  const perKm = Math.min(2, Math.max(0, i.costPerKm ?? 0.3)), park = Math.min(20, Math.max(0, i.parking ?? 1));
  const n = perWeek * 52 / 12, drive = Math.round(km * 2.75), extra = 6;
  const trip = (s.minute_rate * (drive + handoverFor(s, i.passenger) + s.deadhead_min + s.gap_min) + s.km_rate * (km + s.empty_km)) * (1 - s.commit3_pct / 100);
  const sub = Math.round(trip * n + s.platform_fee);
  // Vežiodamas pats tėvas nuvažiuoja iki paėmimo vietos, nuveža keleivį ir grįžta atgal: 2 × atstumas + privažiavimas
  const selfKm = km * 2 + extra;
  const hours = Math.round((selfKm * 2.75 + 15 + 5) * n / 60 * 10) / 10;
  const car = Math.round(selfKm * n * perKm + n * park), time = Math.round(hours * hv);
  return { sub, car, time, self: car + time, hours, tripsPerMonth: Math.round(n) };
}

// Klientui rodomas tik švelnus ženklas „Patikimas ir patikrintas vairuotojas“: visi dokumentai pateikti ir galioja.
// Konkrečių pažymų (pvz., apie teistumą) klientams nevardijame.
export const isVerified = (d: { docs: { valid_until: string | null }[] }) => d.docs.length > 0 && d.docs.every((x) => !x.valid_until || x.valid_until >= vilniusToday());

// „Jūsų saugumas“: kaip atrenkame vairuotojus ir rūpinamės automobiliais (švelni formuluotė, be konkrečių pažymų)
export const SAFETY: [string, string[]][] = [
  [
    "Kaip atrenkame vairuotojus",
    [
      "Su kiekvienu vairuotoju susitinkame asmeniškai ir domimės jo patirtimi.",
      "Tikriname dokumentus ir patikimumą. Aplikacija seka dokumentų galiojimą: jam pasibaigus, vairuotojas naujų kelionių negauna.",
      "Vaikus veža tik vairuotojai, praėję papildomą patikrą ir turintys vaikiškas kėdutes."
    ]
  ],
  [
    "Automobilio būklė",
    [
      "Techninė apžiūra kas pusmetį ir galiojantis draudimas, jų terminus stebime.",
      "Reguliari priežiūra ir švarus salonas.",
      "Kėdutės ir paaukštinimai pagal vaiko ūgį ir svorį."
    ]
  ],
  [
    "Kelionėje",
    [
      "Visi keleiviai prisisegę, vairuotojas neskuba: tarp kelionių planuojama pertrauka, o darbo diena ne ilgesnė nei 7,5 val.",
      "Matote, kas ir kokiu automobiliu atvyks, ir gaunate pranešimą, kai keleivis paimtas ir nuvežtas."
    ]
  ]
];
