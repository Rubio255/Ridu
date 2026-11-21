import Link from "next/link";
import { BackHeader } from "@/components/client-ui";
import { SavingsCalc } from "@/components/savings-calc";

export default function Page() {
  return (
    <>
      <BackHeader href="/tevai" title="Abonemento skaičiuoklė" />
      <p className="muted">Sužinokite, ar abonementas jums apsimoka.</p>
      <SavingsCalc />
      <Link href="/tevai/uzsakyti" className="btn btn-lg">Užsakyti abonementą be plano</Link>
    </>
  );
}
