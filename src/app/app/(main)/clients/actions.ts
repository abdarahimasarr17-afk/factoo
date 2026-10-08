"use server";

import { redirect } from "next/navigation";
import { archiveClient, saveClient } from "@/lib/clients";
import type { FormState } from "@/lib/form-state";
import { clientsRepo } from "@/lib/repos";
import { requireUser } from "@/lib/supabase/server";

export async function saveClientAction(id: string | null, _prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase, user } = await requireUser();
  const result = await saveClient(clientsRepo(supabase, user.id), id, Object.fromEntries(formData));
  if (result.ok && result.redirectTo) redirect(result.redirectTo);
  return result;
}

export async function archiveClientAction(id: string): Promise<FormState> {
  const { supabase, user } = await requireUser();
  const result = await archiveClient(clientsRepo(supabase, user.id), id);
  if (result.ok && result.redirectTo) redirect(result.redirectTo);
  return result;
}
