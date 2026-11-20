import { handoverFor, type PassengerType } from "./pricing";
import type { Settings } from "./settings";
import { vilniusToday } from "./time";

export const VISIT_HOW = { home: "Vairuotojas atvyksta pas jus", institution: "Susitinkame įstaigoje", phone: "Pokalbis telefonu" } as const;
export const VISIT_WHO = { child: "Vaikui", self: "Sau", relative: "Artimajam (pvz., tėvams)" } as const;
export const VISIT_STATUS: Record<string, [string, string]> = { new: ["Laukia patvirtinimo", "p-warn"], confirmed: ["Patvirtinta", "p-ok"], done: ["Įvyko", "p-info"], declined: ["Atšaukta", "p-bad"] };

// „Ar apsimoka?“: abonementas (3 mėn. sutartis, su platformos mokesčiu) prieš vežiojimą patiems.
// Prielaidos kaip kainų puslapyje: 2,75 min/km, papildomi 6 km, 0,30 €/km, 1 € parkavimas, 15 + 5 min palyda ir laukimas, 2 600 € atlyginimas.
export function quickCalc(s: Settings, i: { km: number; perWeek: number; passenger: PassengerType; leisure: boolean }) {
  const km = Math.min(40, Math.max(1, i.km)), perWeek = Math.min(14, Math.max(1, Math.round(i.perWeek)));
  const n = perWeek * 52 / 12, drive = Math.round(km * 2.75), extra = 6;
  const trip = (s.minute_rate * (drive + handoverFor(s, i.passenger) + s.deadhead_min + s.gap_min) + s.km_rate * (km + s.empty_km)) * (1 - s.commit3_pct / 100);
  const sub = Math.round(trip * n + s.platform_fee);
  const hours = ((km + extra) * 2.75 + 15 + 5) * n / 60, hour = 2600 / 168 * (i.leisure ? 0.45 : 1);
  const self = Math.round((km + extra) * n * 0.3 + n + hours * hour);
  return { sub, self, hours: Math.round(hours * 10) / 10 };
}

// Ką klientas mato apie vairuotoją: tik galiojančius patikrinimus, be dokumentų numerių
export function driverChecks(d: { child_qr_verified: boolean; child_seats: boolean; docs: { name: string; valid_until: string | null }[] }) {
  const ok = (n: string) => d.docs.some((x) => x.name.startsWith(n) && (!x.valid_until || x.valid_until >= vilniusToday()));
  return ([
    [ok("Individualios veiklos"), "Dirba legaliai pagal individualios veiklos pažymą"],
    [d.child_qr_verified, "Patikrinta: neteistas (QR kodas)"],
    [!d.child_qr_verified && ok("Pažyma apie teistumą"), "Pateikta pažyma apie neteistumą"],
    [ok("Automobilio draudimas") && ok("Techninė"), "Apdraustas, techniškai tvarkingas automobilis"],
    [d.child_seats, "Turi vaikiškas kėdutes"],
  ] as [boolean, string][]).filter((x) => x[0]).map((x) => x[1]);
}
