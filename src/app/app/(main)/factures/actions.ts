// src/app/app/(main)/factures/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { FormState } from "@/lib/form-state";
import { todayInDakar } from "@/lib/invoice-status";
import { cancelInvoice, deleteDraft, markInvoicePaid, saveInvoice, unmarkInvoicePaid } from "@/lib/invoices";
import { invoicesRepo } from "@/lib/repos";
import { getSession } from "@/lib/session";

async function repo() {
  const { supabase, user, profile } = await getSession();
  return invoicesRepo(supabase, user.id, profile.logo_path);
}

function finish(result: FormState): FormState {
  revalidatePath("/app", "layout");
  if (result.redirectTo) redirect(result.redirectTo);
  return result;
}

export async function saveInvoiceAction(id: string | null, _prev: FormState, formData: FormData): Promise<FormState> {
  const issue = formData.get("intent") === "issue";
  return finish(await saveInvoice(await repo(), id, Object.fromEntries(formData), { issue, today: todayInDakar() }));
}

export async function deleteDraftAction(id: string): Promise<FormState> {
  return finish(await deleteDraft(await repo(), id));
}

export async function markPaidAction(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  return finish(await markInvoicePaid(await repo(), id, Object.fromEntries(formData), todayInDakar()));
}

export async function unmarkPaidAction(id: string): Promise<FormState> {
  return finish(await unmarkInvoicePaid(await repo(), id));
}

export async function cancelInvoiceAction(id: string): Promise<FormState> {
  return finish(await cancelInvoice(await repo(), id));
}
