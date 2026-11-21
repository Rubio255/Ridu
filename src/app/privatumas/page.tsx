import Link from "next/link";
import { Logo } from "@/components/logo";
import { COMPANY, PRIVACY_VERSION } from "@/lib/company";

export const metadata = { title: "Privatumo politika – Ridu" };

// Vieša privatumo politika (reikalinga App Store). PROJEKTAS: prieš išleidžiant turi peržiūrėti teisininkas.
const SECTIONS: [string, string[]][] = [
  ["Kas tvarko duomenis", [
    `Duomenų valdytojas yra ${COMPANY.name}${COMPANY.code ? `, įmonės kodas ${COMPANY.code}` : ""}, ${COMPANY.address}. Kelionę vykdantis vairuotojas mato tik tuos duomenis, kurių reikia kelionei atlikti.`,
  ]],
  ["Kokius duomenis renkame", [
    "Klientų: vardą, el. paštą, telefoną, adresus (paėmimo ir nuvežimo vietas), abonementus, keliones, sąskaitas ir sutikimus.",
    "Keleivių: vardą, gimimo metus ir, vaikams, kėdutės poreikį. Suaugusiųjų sveikatos ar judumo duomenų nerenkame. Vaiko sveikatos pastabas renkame tik gavę jūsų atskirą sutikimą.",
    "Vairuotojų: vardą, kontaktus, individualios veiklos pažymos numerį, automobilio duomenis, dokumentų galiojimo datas ir trumpą prisistatymą.",
    "Pažintinio pokalbio užklausoje: vardą, telefoną ir pageidaujamą laiką.",
    "Techninius duomenis: prisijungimo sesiją ir, jei leidžiate, pranešimų gavimo raktą telefone.",
  ]],
  ["Kam naudojame", [
    "Kad suplanuotume ir atliktume keliones, praneštume apie jų eigą, išrašytume sąskaitas ir vykdytume sutartį (BDAR 6 str. 1 d. b p.).",
    "Buhalterinei apskaitai ir teisės aktų reikalavimams (BDAR 6 str. 1 d. c p.).",
    "Naujienoms ir sveikatos pastaboms – tik jūsų sutikimu, kurį galite bet kada atšaukti.",
  ]],
  ["Kam perduodame", [
    "Duomenis saugome Supabase (ES, Airija) ir svetainę teikiame per Vercel. Atstumams skaičiuoti adresai gali būti perduoti Google Maps. Pranešimus siunčiame per Apple ir Google pranešimų paslaugas.",
    "Duomenų neparduodame ir nenaudojame reklamai.",
  ]],
  ["Kiek laiko saugome", [
    "Kol galioja sutartis. Ištrynus paskyrą, asmens duomenis ištriname arba nuasmeniname iškart, o sąskaitas ir kelionių įrašus be asmens duomenų saugome tiek, kiek reikalauja buhalterinės apskaitos teisės aktai (iki 10 metų).",
  ]],
  ["Jūsų teisės", [
    "Galite susipažinti su savo duomenimis, juos ištaisyti, ištrinti, apriboti jų tvarkymą, gauti juos ir nesutikti su tvarkymu.",
    "Paskyrą galite ištrinti patys: programėlėje ar svetainėje atidarykite „Paskyra“ → „Ištrinti paskyrą“.",
    "Skundą galite pateikti Valstybinei duomenų apsaugos inspekcijai (vdai.lrv.lt).",
  ]],
];

export default function Page() {
  return (
    <main className="mx-auto grid max-w-2xl gap-4 px-4 py-6">
      <div className="flex items-center gap-3"><Logo /><h1 className="text-2xl font-bold">Privatumo politika</h1></div>
      {SECTIONS.map(([h, ps]) => (
        <section key={h} className="card">
          <h2 className="text-lg font-bold">{h}</h2>
          {ps.map((t) => <p key={t} className="text-sm">{t}</p>)}
        </section>
      ))}
      <section className="card" id="pagalba">
        <h2 className="text-lg font-bold">Kontaktai ir pagalba</h2>
        <p className="text-sm">{COMPANY.name}{COMPANY.email ? <>, el. paštas <a className="underline" href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a></> : null}{COMPANY.phone ? `, tel. ${COMPANY.phone}` : ""}.</p>
      </section>
      <p className="text-xs muted">Versija {PRIVACY_VERSION}. <Link className="underline" href="/">Grįžti į pradžią</Link></p>
    </main>
  );
}
