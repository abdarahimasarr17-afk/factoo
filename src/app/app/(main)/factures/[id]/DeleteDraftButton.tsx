// src/app/app/(main)/factures/[id]/DeleteDraftButton.tsx
"use client";

import { Trash2 } from "lucide-react";
import { useActionState } from "react";
import { FormMessage } from "@/components/forms/Field";
import type { FormState } from "@/lib/form-state";

export function DeleteDraftButton({ action }: { action: (prev: FormState) => Promise<FormState> }) {
  const [state, formAction, pending] = useActionState(action, {} as FormState);
  return (
    <form action={formAction} onSubmit={(e) => { if (!window.confirm("Supprimer ce brouillon ? Cette action est définitive.")) e.preventDefault(); }} className="grid gap-3">
      <FormMessage state={state} />
      <button type="submit" disabled={pending} className="flex items-center gap-2 justify-self-start rounded-full px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60">
        <Trash2 className="h-4 w-4" aria-hidden="true" /> {pending ? "Suppression…" : "Supprimer le brouillon"}
      </button>
    </form>
  );
}
