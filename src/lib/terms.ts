// Paslaugų sąlygos (trumpa versija). Šaltinis: /mnt/project-files/salygos/salygos-aplikacijai.md
// PROJEKTAS: prieš naudojimą turi peržiūrėti teisininkas. Pakeitus tekstą, padidinkite TERMS_VERSION:
// tada visi klientai bus paprašyti sutikti iš naujo.
export const TERMS_VERSION = "2026-11-19.2";
export const FULL_TERMS_URL = "https://claude.ai/artifact/V8ui7gE6T1xJBCcA3MBoPs";

export const TERMS: [string, string][] = [
  [
    "Paslauga",
    "Pavežame jūsų vaiką sutartu maršrutu Vilniuje ir perduodame tik jūsų patvirtintiems asmenims arba į įstaigą. Keliones vykdo mūsų patikrinti vairuotojai; priskirtą vairuotoją ir automobilį matysite aplikacijoje, o už paslaugą atsakome mes."
  ],
  [
    "Laikas",
    "Galimas ±10 min. nukrypimas dėl eismo. Nemokamas laukimas – 10 min., vėliau – laukimo mokestis, po 20 min. kelionė laikoma įvykusia."
  ],
  [
    "Atšaukimas",
    "Daugiau nei 12 val. iki kelionės – nemokamai; 12–2 val. – 50 %; mažiau nei 2 val. ar neatvykus – 100 %. Ligos atveju su gydytojo pažyma – nemokamai. Jei suserga vairuotojas ar sugenda automobilis, skirsime kitą patikrintą vairuotoją ir pranešime; jei nepavyks – kelionę atšauksime be mokesčio, o jos kainą grąžinsime ar įskaitysime į kitą mėnesį. Jei paslauga neteikiama ilgiau nei 5 darbo dienas, galite nutraukti sutartį iš karto."
  ],
  [
    "Mokėjimas",
    "Sąskaita kas mėnesį, apmokėti per 7 dienas."
  ],
  [
    "Saugumas",
    "Vaikai iki 135 cm vežami tinkamoje kėdutėje ar paaukštinime. Pateikite tikslų ūgį, svorį, alergijas ir atnaujinkite pasikeitus."
  ],
  [
    "Elgesys",
    "Vaikas sėdi prisisegęs, netrukdo vairuotojui, nesimuša ir negadina automobilio. Pavojingai besielgiantį vaiką galime sustoti saugioje vietoje ir perduoti jums."
  ],
  [
    "Žala",
    "Už vaiko padarytą žalą automobiliui atsako tėvai (CK 6.275–6.276 str.): realios remonto išlaidos, valymas – 40 €."
  ],
  [
    "Du tėvai",
    "Antrasis tėvas gali būti prijungtas jūsų leidimu. Mes nesprendžiame tėvų ginčų ir vykdome paskutinį patvirtintą tvarkaraštį bei teismo sprendimą, jei jį pateikėte."
  ],
  [
    "Nutraukimas",
    "Abi pusės gali nutraukti sutartį bet kada, įspėjusios prieš 30 d.; sumokėta už neįvykusias keliones grąžinama. Mes galime nutraukti iš karto, jei vaikas elgiasi agresyviai ar pavojingai, padaroma tyčinė žala ir ji neatlyginama, nemokama ilgiau kaip 14 d., tėvų konfliktai trikdo paslaugą, niekas nepasitinka vaiko ar grasinama vairuotojui."
  ],
  [
    "Duomenys",
    "Jūsų ir vaiko duomenis naudojame tik pavežimui ir atsiskaitymui, sveikatos duomenis – tik jūsų sutikimu. Galite juos peržiūrėti, ištaisyti ar ištrinti."
  ],
  [
    "Skundai",
    "Rašykite mums; jei nesusitariame – Valstybinė vartotojų teisių apsaugos tarnyba (vvtat.lrv.lt)."
  ]
];

export type ConsentKey = "terms" | "privacy" | "guardian" | "health" | "alone" | "news";
export const CONSENTS: { key: ConsentKey; label: string; required: boolean }[] = [
  {
    "key": "terms",
    "label": "Susipažinau ir sutinku su Paslaugų teikimo taisyklėmis",
    "required": true
  },
  {
    "key": "privacy",
    "label": "Susipažinau su Privatumo politika",
    "required": true
  },
  {
    "key": "guardian",
    "label": "Patvirtinu, kad esu vaiko tėvas, motina ar teisėtas atstovas ir turiu teisę spręsti dėl jo pavežimo",
    "required": true
  },
  {
    "key": "health",
    "label": "Sutinku, kad būtų tvarkomi vaiko sveikatos duomenys (alergijos, ligos), kad vairuotojas galėtų suteikti pagalbą",
    "required": false
  },
  {
    "key": "alone",
    "label": "Leidžiu paleisti vaiką prie paskirties vietos vieną, be perdavimo asmens",
    "required": false
  },
  {
    "key": "news",
    "label": "Sutinku gauti naujienas el. paštu",
    "required": false
  }
];
