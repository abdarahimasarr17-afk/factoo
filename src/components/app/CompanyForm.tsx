"use client";

import { useActionState } from "react";
import { saveCompanyAction } from "@/app/app/(main)/parametres/actions";
import { CountrySelect } from "@/components/forms/CountrySelect";
import { Field, FormMessage, inputClass } from "@/components/forms/Field";
import { PhoneFields } from "@/components/forms/PhoneFields";
import { SubmitButton } from "@/components/forms/SubmitButton";
import type { FormState } from "@/lib/form-state";
import { COUNTRIES } from "@/lib/site";
import { useFormValues } from "@/lib/use-form-values";

type Values = {
  companyName: string;
  address: string;
  city: string;
  country: string;
  countryCode: string;
  phone: string;
  businessEmail: string;
  rccm: string;
  nif: string;
};

export function CompanyForm({ initial }: { initial: Values }) {
  const [state, action] = useActionState(saveCompanyAction, {} as FormState);
  const { bind, setValues } = useFormValues(initial);
  const errors = state.fieldErrors ?? {};

  // Changer de pays règle l’indicatif du téléphone, comme dans le formulaire de liste d’attente.
  const onCountryChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const dial = COUNTRIES.find((c) => c.code === event.target.value)?.dial;
    setValues((v) => ({ ...v, country: event.target.value, countryCode: dial || v.countryCode }));
  };

  return (
    <form action={action} noValidate className="grid gap-5">
      <FormMessage state={state} />
      <Field id="companyName" label="Nom de l’entreprise" error={errors.companyName}>
        <input id="companyName" autoComplete="organization" aria-describedby="companyName-msg" className={inputClass} {...bind("companyName")} />
      </Field>
      <Field id="address" label="Adresse" error={errors.address}>
        <input id="address" autoComplete="street-address" aria-describedby="address-msg" className={inputClass} {...bind("address")} />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="city" label="Ville" error={errors.city}>
          <input id="city" aria-describedby="city-msg" className={inputClass} {...bind("city")} />
        </Field>
        <Field id="country" label="Pays" error={errors.country}>
          <CountrySelect id="country" {...bind("country")} onChange={onCountryChange} />
        </Field>
      </div>
      <PhoneFields id="phone" code={bind("countryCode")} phone={bind("phone")} codeError={errors.countryCode} phoneError={errors.phone} />
      <Field id="businessEmail" label="Email professionnel" optional error={errors.businessEmail}>
        <input
          id="businessEmail"
          type="email"
          inputMode="email"
          aria-describedby="businessEmail-msg"
          className={inputClass}
          {...bind("businessEmail")}
        />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="rccm" label="RCCM" optional error={errors.rccm}>
          <input id="rccm" aria-describedby="rccm-msg" className={inputClass} {...bind("rccm")} />
        </Field>
        <Field id="nif" label="NIF / NINEA" optional error={errors.nif}>
          <input id="nif" aria-describedby="nif-msg" className={inputClass} {...bind("nif")} />
        </Field>
      </div>
      <SubmitButton className="sm:justify-self-end">Enregistrer</SubmitButton>
    </form>
  );
}
