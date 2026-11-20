// Ridu logo concepts (2026-11-20), 64x64 viewBox. bg = tile, a = main, b = accent
const S = (bg, body) => `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><rect width="64" height="64" rx="14" fill="${bg}"/>${body}</svg>`;
module.exports = {
  // 1. Route that ends in a check mark: start point, trip, arrived safely
  pasieke: (bg="#0f4c45", a="#ffffff", b="#f2b705") => S(bg,
    `<path d="M15 34 L27 46 L49 21" fill="none" stroke="${a}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/><circle cx="15" cy="34" r="6.5" fill="${b}"/><circle cx="49" cy="21" r="6.5" fill="${b}"/><circle cx="49" cy="21" r="2.6" fill="${bg}"/>`),
  // 2. Lowercase r drawn as one road, the end of the road is the destination
  r: (bg="#0f4c45", a="#ffffff", b="#f2b705") => S(bg,
    `<path d="M23 48 V31 C23 23 29 19 37 19 H40" fill="none" stroke="${a}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/><circle cx="46" cy="19" r="6" fill="${b}"/>`),
  // 3. Shelter: a protective arc over a passenger, care for kids and seniors alike
  globa: (bg="#0f4c45", a="#ffffff", b="#f2b705") => S(bg,
    `<path d="M13 40 A19 19 0 0 1 51 40" fill="none" stroke="${a}" stroke-width="7" stroke-linecap="round"/><circle cx="32" cy="38" r="7" fill="${b}"/><path d="M17 50 H47" stroke="${a}" stroke-width="4" stroke-linecap="round" opacity=".55"/>`),
  // 4. Two passengers side by side (big + small, or two adults), one shared route under them
  kartu: (bg="#0f4c45", a="#ffffff", b="#f2b705") => S(bg,
    `<circle cx="24" cy="23" r="7" fill="${a}"/><circle cx="41" cy="27" r="5.5" fill="${b}"/><path d="M13 47 C13 38 18 33 24 33 C30 33 33 37 33 41" fill="none" stroke="${a}" stroke-width="6" stroke-linecap="round"/><path d="M33 47 C33 41 36 37 41 37 C46 37 50 41 50 47" fill="none" stroke="${b}" stroke-width="6" stroke-linecap="round"/>`),
};
