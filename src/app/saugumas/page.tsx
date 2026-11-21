import Link from "next/link";
import { PublicPage, SafetyInfo } from "@/components/info";

export default function Page() {
  return <PublicPage title="Saugios kelionės"><SafetyInfo /><Link href="/susipazinti" className="btn btn-primary btn-lg">Susipažinti su vairuotoju</Link></PublicPage>;
}
