// src/components/app/MarkPaidDialog.tsx
"use client";

import { useActionState, useRef } from "react";
import { Field, FormMessage, inputClass } from "@/components/forms/Field";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { buttonClass } from "@/components/ui/button";
import type { FormState } from "@/lib/form-state";
import { PAYMENT_METHOD_LABELS, PAYMENT_METHODS } from "@/lib/invoice-types";

type Props = { action: (prev: FormState, formData: FormData) => Promise<FormState>; today: string; minDate: string };

export function MarkPaidDialog({ action, today, minDate }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [state, formAction] = useActionState(action, {} as FormState);
  const errors = state.fieldErrors ?? {};
  return (
    <>
      <button type="button" onClick={() => dialog.current?.showModal()} className={buttonClass("brand", "md")}>Marquer comme payée</button>
      <dialog ref={dialog} className="w-[min(26rem,calc(100vw-2rem))] rounded-2xl p-0 backdrop:bg-black/40">
        <form action={formAction} noValidate className="grid gap-4 p-5">
          <h2 className="text-lg font-bold">Paiement reçu</h2>
          <FormMessage state={state} />
          <Field id="paidAt" label="Date du paiement" error={errors.paidAt}>
            <input id="paidAt" name="paidAt" type="date" defaultValue={today} min={minDate} max={today} aria-describedby="paidAt-msg" className={inputClass} />
          </Field>
          <Field id="method" label="Moyen de paiement" error={errors.method}>
            <select id="method" name="method" defaultValue="wave" aria-describedby="method-msg" className={inputClass}>
              {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{PAYMENT_METHOD_LABELS[m]}</option>)}
            </select>
          </Field>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => dialog.current?.close()} className={buttonClass("outline", "md")}>Annuler</button>
            <SubmitButton>Confirmer</SubmitButton>
          </div>
        </form>
      </dialog>
    </>
  );
}
