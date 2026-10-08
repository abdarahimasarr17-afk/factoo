"use client";

import { ImageIcon } from "lucide-react";
import Image from "next/image";
import { useActionState, useState } from "react";
import { deleteLogoAction, saveLogoAction } from "@/app/app/(main)/parametres/actions";
import { FormMessage } from "@/components/forms/Field";
import { SubmitButton } from "@/components/forms/SubmitButton";
import type { FormState } from "@/lib/form-state";

export function LogoForm({ logoUrl }: { logoUrl: string | null }) {
  const [saveState, saveAction] = useActionState(saveLogoAction, {} as FormState);
  const [deleteState, deleteAction, deleting] = useActionState(deleteLogoAction, {} as FormState);
  const [preview, setPreview] = useState<string | null>(null);
  const shown = preview ?? logoUrl;

  return (
    <div className="grid gap-4">
      <FormMessage state={deleteState.message ? deleteState : saveState} />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
          {shown ? (
            <Image src={shown} alt="Logo de l’entreprise" width={96} height={96} unoptimized className="h-full w-full object-contain" />
          ) : (
            <ImageIcon className="h-8 w-8 text-slate-400" aria-hidden="true" />
          )}
        </div>
        <form action={saveAction} className="grid flex-1 gap-3">
          <label htmlFor="logo" className="text-sm font-semibold text-slate-700">
            {logoUrl ? "Remplacer le logo" : "Ajouter un logo"}{" "}
            <span className="font-normal text-slate-400">(PNG, JPG ou WebP, 5 Mo max.)</span>
          </label>
          <input
            id="logo"
            name="logo"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(e) => {
              const file = e.target.files?.[0];
              setPreview(file ? URL.createObjectURL(file) : null);
            }}
            className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-full file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:font-semibold"
          />
          <SubmitButton pendingLabel="Envoi…" className="sm:justify-self-start">
            Enregistrer le logo
          </SubmitButton>
        </form>
      </div>
      {logoUrl && (
        <form action={deleteAction}>
          <button type="submit" disabled={deleting} className="text-sm font-semibold text-red-700 underline disabled:opacity-60">
            {deleting ? "Retrait…" : "Retirer le logo"}
          </button>
        </form>
      )}
    </div>
  );
}
