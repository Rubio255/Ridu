# Ridu: aprašymas dirbtiniam intelektui (AI context)

Šį failą įklijuokite kitam DI pokalbiui, kad jis suprastų projektą. Kodas: https://github.com/Rubio255/Ridu (privati saugykla).
Atnaujinta 2026-11-21.

## 1. Kas tai

**Ridu** yra pavėžėjimo pagal sutartį paslauga Vilniuje (Lietuva). Joje veikia viena programėlė / svetainė su trimis vaidmenimis:

- **Klientas** (tėvai, suaugę, senjorų artimieji). Užsako **abonementą**: pastovų savaitės grafiką, pvz. iš darželio ar mokyklos į būrelį. Mato tik galutinę mėnesio kainą.
- **Vairuotojas**. Samdomas, dirba pagal individualios veiklos pažymą. Mato jam priskirtas keliones, žymi „paimta“ ir „nuvežta“, priima ar atsisako pakaitinių kelionių.
- **MB savininkas** (operatorius, vaidmuo `owner`). Tvirtina abonementus, skiria juos vairuotojams, valdo kainas, sutartis, sąskaitas, vairuotojų dokumentus ir pažintinius pokalbius.

Keleiviai: vaikai, suaugę ir senjorai. Neveža neįgaliųjų vežimėliuose ir gulinčių (tam reikia leidimų ir įrangos). Suaugusiųjų sveikatos duomenų nerenka.

## 2. Verslo modelis ir taisyklės

- MB yra platforma ir dispečeris. Vairuotojas gauna **70 %** kainos be PVM, MB **30 %**. Procentą galima keisti kiekvienam vairuotojui atskirai.
- **Platformos mokestis 9,90 €/mėn.** šeimai su PVM (planuose ir maršruto vietoje jau įskaičiuotas). Rodomas atskira eilute ir skaičiuojamas proporcingai sutarties dienoms. Jis padalinamas mokantiems tėvams, yra 0 €, jei teikėjas atšaukė visas mėnesio keliones, ir baigiasi su sutartimi. Registracijos mokesčio nėra.
- Kol kas parduodami tik abonementai. Vienkartinės kelionės įjungiamos nustatymuose.
- Klientas **niekada nemato** kainodaros formulės, užimtumo ar MB dalies, tik galutinę kainą.
- **Grafikas:**
  - rytinis maršrutas 07:15–08:30, iki 3 keleivių, visi nuvežti iki 08:00;
  - popietė 13:30–18:30, iki 5 kelionių;
  - vairuotojo darbo diena iki 7,5 val., tarp kelionių 10 min. pertrauka.
- **Perdavimo laikas** pagal keleivio tipą: vaikas 14 min., suaugęs 6 min., senjoras 14 min. Nemokamai laukiama 10 min.
- **Kaina (kainodara v7)** (`src/lib/pricing.ts`, nustatymai `src/lib/settings.ts`):
  - standartinė kelionės vertė = 0,37 €/min × (važiavimas + perdavimas + 10 min. privažiavimas) + 0,43 €/km × (km + 6), su PVM. Pertrauka planuojama, bet neskaičiuojama;
  - keleivio kaina = standartinė vertė × dalis (1 / 0,6 / 0,45 / 0,37) × laiko koeficientas (pikas 07:15–08:30 ir 13:30–16:00 ×1,15, ramus 10:00–13:00 ×0,9) − įsipareigojimo nuolaida (3 mėn. 5 %, 9 mėn. 10 %);
  - nėra vietų: aukcionas, minimumas su koeficientu 1,30;
  - kredito planai Bazinis 219 € / 210 kredito, Šeimos 469 / 505, Premium 749 / 810 (su platformos mokesčiu; savininkas priskiria klientui; nepanaudotas kreditas galioja dar 1 mėn.);
  - vairuotojui visada 70 % standartinės vertės be PVM, saugoma kiekvienai kelionei (`trips.driver_share_eur`).

  Visus parametrus keičia savininkas.
- **Vairuotojo liga ar remontas.** Kelionė siūloma tik laisviems vairuotojams, kurie ją turi priimti. Pasiūlymas galioja 2 val., tada siūloma kitam. Jei niekas nepriima, kelionė atšaukiama „dėl teikėjo“ be mokesčio, o kaina įskaitoma klientui.
- **Vaikus** veža tik vairuotojai, kurių QR kodas darbui su vaikais patvirtintas ir kurie turi vaikiškas kėdutes. Suaugusius gali vežti bet kuris patikrintas vairuotojas.
- **Sąlygos.** Rodomos iš `src/lib/terms.ts` (`TERMS_VERSION`; padidinus versiją, sutikimų klausiama iš naujo).
  - Yra 3 privalomi ir 3 savanoriški sutikimai, visi iš pradžių nepažymėti.
  - Globėjo sutikimo reikia tik tada, kai klientas turi vaikų.
- Nutraukti sutartį galima bet kada, įspėjus prieš 30 d.

## 3. Svarbios formuluotės (privaloma laikytis)

- Visa sąsaja **lietuvių kalba**.
- Klientams **nerašyti** „neteistas“ ar „leidimas dirbti su vaikais“, nes skamba grubiai. Naudoti tik ženklelį **„✓ Patikimas ir patikrintas vairuotojas“**.
- Sakyti „**Abonementas**“, ne „ilgalaikis užsakymas“.
- Prekės ženklas „Ridu“. Logotipas: mažoji „r“, primenanti kelią, su geltonu tašku. Spalvos: žalia `#0f4c45`, geltona `#f2b705`.

## 4. Technologijos

| Dalis | Kas naudojama |
|---|---|
| Svetainė / programa | Next.js 15 (App Router), TypeScript, Tailwind v4 |
| Duomenų bazė ir prisijungimas | Supabase (Postgres, ES regionas eu-west-1). Projektas `cixwloxnbsxpjvigsmsm` |
| Prisijungimas | Tik pakviestiems: 6 skaitmenų kodas el. paštu arba nuoroda. Slaptažodis tik Apple peržiūros demo paskyrai |
| Teisės | Skaitymas per RLS taisykles. Visi rašymai per serverio veiksmus (`src/app/actions.ts`) su service role raktu, patikrinus vaidmenį |
| Talpinimas | Vercel (komanda `aleksandras255`, projektas `ridu`, regionas dub1). Adresas https://ridu-aleksandras255.vercel.app |
| Planuotės (cron) | `/api/cron/trips` kasdien sukuria keliones į priekį. `/api/cron/offers` tvarko pakaitų pasiūlymus (Hobby plane kartą per parą, Pro plane kas 15 min.) |
| Pranešimai | Web Push (VAPID) naršyklėje. Apple APNs iOS programėlėje (`src/lib/apns.ts`). Abu saugomi lentelėje `push_subscriptions` |
| iOS programėlė | Capacitor 8 (`capacitor.config.ts`, aplankas `ios/`). Atidaro gyvą svetainę (`server.url`), todėl svetainės pakeitimai iškart matomi programėlėje. Bundle ID `lt.ridu.app`, App Store Connect Apple ID 6837659784 |
| iOS surinkimas | Codemagic (`codemagic.yaml`). Įkėlus kodą į šaką `ios-release`, programėlė surenkama ir įkeliama į TestFlight |
| Žemėlapiai | Google Routes API, jei yra `GOOGLE_MAPS_API_KEY`. Be rakto atstumas skaičiuojamas apytiksliai |

## 5. Kodo struktūra

```
src/app/
  page.tsx                 vieša pradžia: vairuotojų kortelės, „Jūsų saugumas“, skaičiuoklė „Ar man apsimoka?“, pažintinio pokalbio užklausa
  prisijungti/             prisijungimas (kodas iš laiško / slaptažodis)
  paskyra/                 paskyros puslapis ir ištrynimas (Apple reikalavimas)
  privatumas/              vieša privatumo politika
  tevai/                   KLIENTO dalis: pradžia, kelionės, abonementas, sutartys, keleiviai ir adresai, sąlygos
  vairuotojas/             VAIRUOTOJO dalis: kalendorius, sutartys, uždarbis, duomenys
  savininkas/              MB dalis: kalendorius, abonementai, sutartys, vairuotojai, pakaitos, pokalbiai, klientai, sąskaitos, atsiskaitymai, nustatymai
  actions.ts               visi serverio veiksmai (rašymai į DB)
  api/cron/                kasdieniai darbai
src/lib/                   verslo logika: pricing, fees, drivers, offers, trips, consents, terms, push, apns, settings, welcome
src/components/            bendri komponentai (shell, calendar, trip-steps, welcome, savings-calc ir kt.)
supabase/migrations/       DB schema 0001–0011 (kita bus 0012)
tests/                     testai (npm test)
demo/                      ankstesnės vieno failo HTML demonstracinės versijos
ios/, capacitor.config.ts  iOS programėlė
codemagic.yaml             iOS surinkimas debesyje
```

## 6. Duomenų bazės lentelės

- `profiles`: naudotojai, vaidmuo `owner` / `driver` / `client`.
- `children`: **visi keleiviai**, ne tik vaikai.
  - Tipas `passenger_type`: child / adult / senior.
  - Taip pat `code_word` (slaptas žodis vairuotojui) ir `dropoff`.
- `child_guardians`: kas valdo keleivį (pvz. abu išsiskyrę tėvai).
- `places`: adresai.
- `subscriptions`: abonementai. Būsenos: pending / active / rejected / ended. Turi `driver_id` ir `monthly_eur`.
- `trips`: konkrečios kelionės.
  - Būsenos: scheduled / picked_up / delivered / cancelled / no_show.
  - Laikai `picked_up_at` ir `delivered_at`, įskaitymas `credit_eur`.
- `drivers`, `driver_documents`, `driver_absences`, `trip_offers`: vairuotojai, jų dokumentai, nedarbingumas ir pakaitos.
- `consents` ir vaizdas `current_consents`: sutikimai su versijomis.
- `visit_requests`: pažintinių pokalbių užklausos.
- `push_subscriptions`: pranešimų gavėjai.
- `settings`: viena eilutė su visais kainodaros ir grafiko parametrais (jsonb).

## 7. Kaip paleisti ir diegti

```bash
npm install
cp .env.example .env.local   # įrašyti Supabase URL ir raktus, VAPID, CRON_SECRET ir kt.
npm run dev                  # http://localhost:3000
npx tsc --noEmit && npm run lint && npm test && npm run build   # patikrinimai prieš įkeliant
```

- Įkėlus į `main` šaką, Vercel automatiškai atnaujina svetainę. Ją naudoja ir iOS programėlė, todėl `main` visada turi veikti.
- Nauja iOS versija: `git push origin main:ios-release`. Codemagic programėlę surenka ir įkelia į TestFlight.
- DB pakeitimai: nauja migracija `supabase/migrations/00NN_*.sql`, pritaikoma Supabase projektui.
- Vercel apsauga (Deployment Protection) turi saugoti tik bandomąsias (preview) versijas, kitaip programėlė rodo „Nėra ryšio“.

## 8. Būsena (2026-11-21)

- Svetainė veikia, galima testuoti. iOS programėlė yra TestFlight'e.
- Prieš pirmus tikrus klientus dar reikia:
  - Vercel Pro (komercinis naudojimas, 15 min. cron);
  - LTSA konsultacijos dėl leidimų;
  - vairuotojo sutarties;
  - MB rekvizitų privatumo politikoje (`src/lib/company.ts`);
  - teisininko peržiūros sąlygoms;
  - App Store ekrano nuotraukų ir pateikimo peržiūrai.
- Google Play kol kas nėra.
