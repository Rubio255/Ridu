import { requireDriver } from "@/lib/auth";
import { Calendar } from "@/components/calendar";

export default async function Page() {
  const me = await requireDriver();
  return <Calendar driverId={me.id} />;
}
