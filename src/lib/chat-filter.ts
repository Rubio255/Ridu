// Pokalbių filtras: įspėja (ne blokuoja) apie išankstinio mokėjimo prašymus, banko duomenis ir siūlymą išeiti iš platformos.
// Telefono numeriai neatpažįstami: po sutikimo kontaktuoti jais dalinamasi teisėtai.
export type ChatFlag = "prepay" | "bank" | "offplatform";

const PREPAY = /(avans|i[šs]\s*anksto|prie[šs]\s+(kelion|susitikim|pirm)|pervesk|pervedim|sumok[ėe]k(ite)?\s+(dabar|i[šs]\s*karto)|u[žz]stat|depozit|prepay|upfront|in advance|deposit|send (me )?(the )?money|paysera|revolut\s*(link|nuorod)|mok[ėe]jimo nuorod|payment link)/i;
const BANK_WORDS = /(kortel[ėe]s\s*(numer|duomen|kod)|cvv|cvc|pin\s*kod|sąskaitos numer|saskaitos numer|card number|bank details|iban)/i;
const IBAN = /\bLT\d{2}\s?(\d{4}\s?){3}\d{4}\b/i;
const OFFPLATFORM = /(whats\s?app|viber|telegram|signal\b|messenger|instagram|facebook|be\s+ridu|apeiti\s+ridu|ne\s+per\s+ridu|outside\s+(of\s+)?ridu|off\s+the\s+app|without\s+ridu|el\.\s*pa[šs]t|e-?mail|[\w.+-]+@[\w-]+\.[\w.]{2,})/i;

// Banko kortelės numeris: 13–19 skaitmenų, tenkinantis Luhn
function hasCard(text: string) {
  for (const m of text.matchAll(/(?:\d[ -]?){13,19}/g)) {
    const d = m[0].replace(/\D/g, "");
    if (d.length < 13 || d.length > 19) continue;
    let sum = 0;
    for (let i = 0; i < d.length; i++) { let n = Number(d[d.length - 1 - i]); if (i % 2) { n *= 2; if (n > 9) n -= 9; } sum += n; }
    if (sum % 10 === 0) return true;
  }
  return false;
}

export function scanMessage(text: string): ChatFlag[] {
  const f: ChatFlag[] = [];
  if (PREPAY.test(text)) f.push("prepay");
  if (BANK_WORDS.test(text) || IBAN.test(text) || hasCard(text)) f.push("bank");
  if (OFFPLATFORM.test(text)) f.push("offplatform");
  return f;
}

export const FLAG_LT: Record<ChatFlag, string> = {
  prepay: "Nemokėkite iš anksto prieš pirmą susitikimą ir nespauskite mokėjimo nuorodų žinutėse.",
  bank: "Niekada nesiųskite kortelės duomenų, kodų ar slaptažodžių. Ridu jų niekada neprašo.",
  offplatform: "Likite Ridu pokalbyje: čia veikia atsiliepimai, pranešimai apie pažeidimus ir pagalba.",
};

// Po 3 pažymėtų žinučių per 7 d. siuntėjas perduodamas administratoriui peržiūrėti
export const ESCALATE_AFTER = 3;
export const shouldEscalate = (flaggedLast7d: number) => flaggedLast7d >= ESCALATE_AFTER;
