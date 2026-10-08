import { notFound } from "next/navigation";
import { ArchiveClientButton } from "@/components/app/ArchiveClientButton";
import { ClientForm } from "@/components/app/ClientForm";
import { clientToFormValues } from "@/lib/clients";
import { getClient } from "@/lib/repos";
import { getSession } from "@/lib/session";
import { archiveClientAction, saveClientAction } from "../actions";

export default async function EditClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await getSession();
  const client = await getClient(supabase, id);
  if (!client) notFound();

  return (
    <div className="space-y-5">
      <h1 className="truncate text-2xl font-extrabold sm:text-3xl">{client.name}</h1>
      <ClientForm action={saveClientAction.bind(null, id)} initial={clientToFormValues(client, "221")} />
      <ArchiveClientButton action={archiveClientAction.bind(null, id)} />
    </div>
  );
}
