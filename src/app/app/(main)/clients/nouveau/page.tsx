import { ClientForm } from "@/components/app/ClientForm";
import { clientToFormValues } from "@/lib/clients";
import { getSession } from "@/lib/session";
import { COUNTRIES } from "@/lib/site";
import { saveClientAction } from "../actions";

export default async function NewClientPage() {
  const { profile } = await getSession();
  const dial = COUNTRIES.find((c) => c.code === profile.country)?.dial || "221";
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-extrabold sm:text-3xl">Nouveau client</h1>
      <ClientForm action={saveClientAction.bind(null, null)} initial={clientToFormValues(null, dial)} />
    </div>
  );
}
