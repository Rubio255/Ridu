import Link from "next/link";
import { SavingsCalc } from "@/components/savings-calc";

// Abonemento skaičiuoklė kaip makete: tamsiai mėlyna antraštė, kortelė su parametrais ir rezultatu
export default function Page() {
  return (
    <>
      <header className="navy-head grid grid-cols-[40px_1fr_40px] items-start gap-2 text-center">
        <Link href="/tevai" aria-label="Atgal" className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-lg">←</Link>
        <div className="grid gap-1"><h1 className="text-2xl font-bold">Abonemento skaičiuoklė</h1><p className="text-sm opacity-85">Sužinokite, ar abonementas jums apsimoka!</p></div>
        <span aria-hidden="true" className="grid h-10 w-10 place-items-center rounded-full bg-white/10">📊</span>
      </header>
      <div className="-mt-10"><SavingsCalc /></div>
      <Link href="/tevai/uzsakyti" className="btn btn-lg rounded-full">Užsakyti abonementą be plano</Link>
    </>
  );
}
