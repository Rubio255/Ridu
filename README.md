# Ridu · vaikų pavėžėjimas

Ilgalaikių vaikų pavėžėjimo užsakymų aplikacija Vilniuje (Next.js + Supabase + Vercel).

- **Tėvai** (tik pakviesti klientai su sutartimi) užsako ilgalaikius užsakymus ir mato tik galutinę kainą.
- **Savininkas** tvirtina užsakymus, mato kalendorių, sąskaitas ir keičia visas kainas bei grafiko taisykles.

## Paleidimas
1. Supabase projekte paleiskite `supabase/migrations/0001_init.sql`.
2. Nukopijuokite `.env.example` į `.env.local` ir užpildykite.
3. Savininką pakvieskite per Supabase Auth, tada: `update profiles set role = 'owner' where email = '…';`
4. `npm install && npm run dev`

Kainodara: `src/lib/pricing.ts`, numatytosios reikšmės: `src/lib/settings.ts` (pagal kainodaros skaičiavimą).
Testai: `npm test`.

## Rolės

- `owner` – MB administratorius (`/savininkas`): paskirsto užsakymus vairuotojams, valdo vairuotojus ir jų dokumentus, mato visas keliones, sutartis, klientus ir atsiskaitymus.
- `driver` – samdomas vairuotojas pagal individualios veiklos pažymą (`/vairuotojas`): mato tik jam priskirtas keliones ir sutartis, savo uždarbį, dokumentus ir darbo dienas.
- `client` – tėvai (`/tevai`).

Vairuotojui išmokama `driver_pct` % (numatyta 75 %) kelionių kainos be PVM; kiekvienam vairuotojui galima nustatyti savo procentą. Nauji užsakymai siūlomi laisviausiam aktyviam vairuotojui su galiojančiais dokumentais, dirbančiam tomis dienomis.
