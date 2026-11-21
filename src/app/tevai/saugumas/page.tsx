import Link from "next/link";
import { BackHeader } from "@/components/client-ui";
import { SafetyInfo } from "@/components/info";

export default function Page() {
  return <><BackHeader href="/tevai" title="Saugumas" /><SafetyInfo /><Link href="/tevai/vaikai#slaptas-zodis" className="btn btn-primary btn-lg">Nustatyti slaptą žodį vaikui</Link></>;
}
