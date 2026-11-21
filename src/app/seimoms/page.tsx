import Link from "next/link";
import { FamilyInfo, PublicPage } from "@/components/info";

export default function Page() {
  return <PublicPage title="Šeimos sprendimai"><FamilyInfo cta={<Link href="/susipazinti" className="btn btn-primary btn-lg">Susipažinti su vairuotoju</Link>} /></PublicPage>;
}
