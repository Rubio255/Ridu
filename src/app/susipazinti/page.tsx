import { PublicPage } from "@/components/info";
import { VisitForm } from "@/components/visit-form";
import { addDays, vilniusToday } from "@/lib/time";

export default function Page() {
  return (
    <PublicPage title="Susipažinti su vairuotoju">
      <p className="muted">Prieš pirmą kelionę susipažinsite su vairuotoju asmeniškai: jis atvyks pas jus, susitiksite įstaigoje arba pasikalbėsite telefonu.</p>
      <VisitForm guest drivers={[]} minDate={addDays(vilniusToday(), 1)} />
    </PublicPage>
  );
}
