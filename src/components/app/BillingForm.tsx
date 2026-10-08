"use client";

import { useActionState } from "react";
import { saveBillingAction } from "@/app/app/(main)/parametres/actions";
import { Field, FormMessage, inputClass } from "@/components/forms/Field";
import { SubmitButton } from "@/components/forms/SubmitButton";
import type { FormState } from "@/lib/form-state";
import { CURRENCIES, CURRENCY_LABELS } from "@/lib/site";
import { useFormValues } from "@/lib/use-form-values";

export function BillingForm({ initial }: { initial: { currency: string; vatRate: string } }) {
  const [state, action] = useActionState(saveBillingAction, {} as FormState);
  const { bind } = useFormValues(initial);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={action} noValidate className="grid gap-5">
      <FormMessage state={state} />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="currency" label="Devise par défaut" error={errors.currency}>
          <select id="currency" aria-describedby="currency-msg" className={inputClass} {...bind("currency")}>
            {CURRENCIES.map((currency) => (
              <option key={currency} value={currency}>
                {CURRENCY_LABELS[currency]}
              </option>
            ))}
          </select>
        </Field>
        <Field id="vatRate" label="Taux de TVA (%)" error={errors.vatRate} hint="Pas assujetti à la TVA ? Mettez 0 %.">
          <input
            id="vatRate"
            inputMode="decimal"
            aria-invalid={Boolean(errors.vatRate)}
            aria-describedby="vatRate-msg"
            className={inputClass}
            {...bind("vatRate")}
          />
        </Field>
      </div>
      <SubmitButton className="sm:justify-self-end">Enregistrer</SubmitButton>
    </form>
  );
}
