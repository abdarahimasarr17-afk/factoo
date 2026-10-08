"use client";

import { Archive } from "lucide-react";
import { useActionState } from "react";
import { FormMessage } from "@/components/forms/Field";
import type { FormState } from "@/lib/form-state";

export function ArchiveClientButton({ action }: { action: (prev: FormState) => Promise<FormState> }) {
  const [state, formAction, pending] = useActionState(action, {} as FormState);
  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!window.confirm("Archiver ce client ? Ses futures factures resteront consultables.")) e.preventDefault();
      }}
      className="grid gap-3"
    >
      <FormMessage state={state} />
      <button
        type="submit"
        disabled={pending}
        className="flex items-center gap-2 justify-self-start rounded-full px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
      >
        <Archive className="h-4 w-4" aria-hidden="true" /> {pending ? "Archivage…" : "Archiver ce client"}
      </button>
    </form>
  );
}
