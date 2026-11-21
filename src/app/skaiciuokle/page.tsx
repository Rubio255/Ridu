import Link from "next/link";
import { PublicPage } from "@/components/info";
import { SavingsCalc } from "@/components/savings-calc";

export default function Page() {
  return (
    <PublicPage title="Ar man apsimoka?">
      <p className="muted">Vežiodami patys mokate ne tik už kurą, bet ir savo laiku. Pakeiskite parametrus ir palyginkite.</p>
      <SavingsCalc />
      <Link href="/abonementas" className="btn btn-lg">Kaip veikia abonementas</Link>
    </PublicPage>
  );
}
