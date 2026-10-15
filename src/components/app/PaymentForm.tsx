// src/components/app/PaymentForm.tsx
"use client";

import { useActionState } from "react";
import { savePaymentAction } from "@/app/app/(main)/parametres/actions";
import { Field, FormMessage, inputClass } from "@/components/forms/Field";
import { PhoneFields } from "@/components/forms/PhoneFields";
import { SubmitButton } from "@/components/forms/SubmitButton";
import type { FormState } from "@/lib/form-state";
import { useFormValues } from "@/lib/use-form-values";

type Values = {
  waveCountryCode: string;
  wavePhone: string;
  omCountryCode: string;
  omPhone: string;
  iban: string;
  paymentNote: string;
};

export function PaymentForm({ initial }: { initial: Values }) {
  const [state, action] = useActionState(savePaymentAction, {} as FormState);
  const { bind } = useFormValues(initial);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={action} noValidate className="grid gap-5">
      <FormMessage state={state} />
      <PhoneFields id="wavePhone" label="Numéro Wave" optional code={bind("waveCountryCode")} phone={bind("wavePhone")} codeError={errors.waveCountryCode} phoneError={errors.wavePhone} />
      <PhoneFields id="omPhone" label="Numéro Orange Money" optional code={bind("omCountryCode")} phone={bind("omPhone")} codeError={errors.omCountryCode} phoneError={errors.omPhone} />
      <Field id="iban" label="IBAN" optional error={errors.iban}>
        <input id="iban" autoComplete="off" aria-invalid={Boolean(errors.iban)} aria-describedby="iban-msg" className={inputClass} {...bind("iban")} />
      </Field>
      <Field id="paymentNote" label="Autres instructions" optional hint="Ex. « Paiement à 30 jours par virement »." error={errors.paymentNote}>
        <textarea id="paymentNote" rows={3} maxLength={300} aria-describedby="paymentNote-msg" className={`${inputClass} h-auto py-3`} {...bind("paymentNote")} />
      </Field>
      <SubmitButton className="sm:justify-self-end">Enregistrer</SubmitButton>
    </form>
  );
}
