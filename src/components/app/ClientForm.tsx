"use client";

import Link from "next/link";
import { useActionState } from "react";
import { CountrySelect } from "@/components/forms/CountrySelect";
import { Field, FormMessage, inputClass } from "@/components/forms/Field";
import { PhoneFields } from "@/components/forms/PhoneFields";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { buttonClass } from "@/components/ui/button";
import type { FormState } from "@/lib/form-state";
import { useFormValues } from "@/lib/use-form-values";

type Values = {
  name: string;
  countryCode: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  country: string;
  taxId: string;
};

type Props = {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  initial: Values;
};

export function ClientForm({ action, initial }: Props) {
  const [state, formAction] = useActionState(action, {} as FormState);
  const { bind } = useFormValues(initial);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} noValidate className="grid gap-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <FormMessage state={state} />
      <Field id="name" label="Nom ou raison sociale" error={errors.name}>
        <input
          id="name"
          autoComplete="organization"
          aria-invalid={Boolean(errors.name)}
          aria-describedby="name-msg"
          className={inputClass}
          {...bind("name")}
        />
      </Field>
      <PhoneFields
        id="phone"
        optional
        code={bind("countryCode")}
        phone={bind("phone")}
        codeError={errors.countryCode}
        phoneError={errors.phone}
      />
      <Field id="email" label="Email" optional error={errors.email}>
        <input
          id="email"
          type="email"
          inputMode="email"
          aria-invalid={Boolean(errors.email)}
          aria-describedby="email-msg"
          className={inputClass}
          {...bind("email")}
        />
      </Field>
      <Field id="address" label="Adresse" optional error={errors.address}>
        <input id="address" autoComplete="street-address" aria-describedby="address-msg" className={inputClass} {...bind("address")} />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="city" label="Ville" optional error={errors.city}>
          <input id="city" aria-describedby="city-msg" className={inputClass} {...bind("city")} />
        </Field>
        <Field id="country" label="Pays" optional error={errors.country}>
          <CountrySelect id="country" {...bind("country")} />
        </Field>
      </div>
      <Field id="taxId" label="Identifiant fiscal (NIF, NINEA…)" optional hint="Utile pour les clients entreprises." error={errors.taxId}>
        <input id="taxId" aria-describedby="taxId-msg" className={inputClass} {...bind("taxId")} />
      </Field>
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Link href="/app/clients" className={buttonClass("outline", "md")}>
          Annuler
        </Link>
        <SubmitButton>Enregistrer</SubmitButton>
      </div>
    </form>
  );
}
