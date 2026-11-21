import Link from "next/link";
import { loadSettings } from "@/lib/auth";
import { eur } from "@/lib/time";
import { PublicPage, SubscriptionInfo } from "@/components/info";

export default async function Page() {
  const s = await loadSettings();
  return <PublicPage title="Lankstus abonementas"><SubscriptionInfo fee={eur(s.platform_fee)} cta={<Link href="/skaiciuokle" className="btn btn-primary btn-lg">Apskaičiuoti mano kainą</Link>} /></PublicPage>;
}
