import Link from "next/link";
import { BackHeader } from "@/components/client-ui";
import { SavingsCalc } from "@/components/savings-calc";

export default function Page() {
  return (
    <>
      <BackHeader href="/tevai" title="Abonemento skaičiuoklė" />
      <p className="muted">Pakeiskite parametrus ir pažiūrėkite, ar abonementas jums apsimoka.</p>
      <SavingsCalc />
      <Link href="/tevai/uzsakyti" className="btn btn-primary btn-lg">Užsakyti abonementą</Link>
    </>
  );
}
