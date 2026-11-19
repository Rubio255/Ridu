// Laikas visada skaičiuojamas Vilniaus laiku, nepriklausomai nuo serverio laiko juostos.
export const TZ = "Europe/Vilnius";

export const toMin = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
};
export const fromMin = (m: number) =>
  `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(Math.round(m % 60)).padStart(2, "0")}`;

// Vilniaus data + laikas -> UTC Date
export function vilniusToDate(date: string, time: string): Date {
  const [y, mo, d] = date.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  const offset = tzOffsetMin(new Date(guess));
  return new Date(guess - offset * 60000);
}

function tzOffsetMin(d: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
  }).formatToParts(d);
  const g = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(g("year"), g("month") - 1, g("day"), g("hour"), g("minute"));
  return Math.round((asUtc - d.getTime()) / 60000);
}

// Šiandienos data Vilniuje "YYYY-MM-DD"
export function vilniusToday(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: TZ }).format(new Date());
}
export function addDays(date: string, n: number): string {
  const d = new Date(date + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
// 1 = pirmadienis ... 7 = sekmadienis
export function weekday(date: string): number {
  return new Date(date + "T12:00:00Z").getUTCDay() || 7;
}

export const fmtTime = (d: Date | string) =>
  new Date(d).toLocaleTimeString("lt-LT", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
export const fmtDay = (d: Date | string) =>
  new Date(d).toLocaleDateString("lt-LT", { timeZone: TZ, weekday: "long", month: "long", day: "numeric" });
export const dayKey = (d: Date | string) => new Intl.DateTimeFormat("sv-SE", { timeZone: TZ }).format(new Date(d));

export const DAYS = ["Pr", "An", "Tr", "Kt", "Pn", "Še", "Se"];
export const eur = (n: number) =>
  Number(n).toLocaleString("lt-LT", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
