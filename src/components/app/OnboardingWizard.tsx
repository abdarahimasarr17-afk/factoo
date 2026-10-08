"use client";

import Image from "next/image";
import { useActionState, useState } from "react";
import { finishOnboardingAction } from "@/app/app/bienvenue/actions";
import { CountrySelect } from "@/components/forms/CountrySelect";
import { Field, FormMessage, inputClass } from "@/components/forms/Field";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { buttonClass } from "@/components/ui/button";
import type { FormState } from "@/lib/form-state";
import { COUNTRY_DEFAULTS, CURRENCY_LABELS, type CountryCode } from "@/lib/site";
import { useFormValues } from "@/lib/use-form-values";

const STEPS = ["Votre entreprise", "Votre pays", "Votre logo"];

export function OnboardingWizard({ initial }: { initial: { companyName: string; country: string } }) {
  const [state, action] = useActionState(finishOnboardingAction, {} as FormState);
  const { values, bind } = useFormValues(initial);
  const [step, setStep] = useState(0);
  const [preview, setPreview] = useState<string | null>(null);
  const defaults = values.country ? COUNTRY_DEFAULTS[values.country as CountryCode] : null;
  const next = () => setStep((s) => Math.min(s + 1, 2));

  return (
    <form action={action} noValidate className="grid gap-6">
      <div>
        <p className="text-sm font-semibold text-slate-500">
          Étape {step + 1} sur 3 · {STEPS[step]}
        </p>
        <div className="mt-2 h-1.5 rounded-full bg-slate-100">
          <div className="h-1.5 rounded-full bg-[#00C853] transition-all" style={{ width: `${((step + 1) / 3) * 100}%` }} />
        </div>
      </div>
      <FormMessage state={state} />

      <div hidden={step !== 0} className="grid gap-4">
        <h1 className="text-2xl font-extrabold">Comment s’appelle votre entreprise ?</h1>
        <Field id="companyName" label="Nom de l’entreprise" hint="Il apparaîtra sur vos factures." error={state.fieldErrors?.companyName}>
          <input id="companyName" autoComplete="organization" aria-describedby="companyName-msg" className={inputClass} {...bind("companyName")} />
        </Field>
      </div>

      <div hidden={step !== 1} className="grid gap-4">
        <h1 className="text-2xl font-extrabold">Où êtes-vous basé ?</h1>
        <Field id="country" label="Pays" error={state.fieldErrors?.country}>
          <CountrySelect id="country" {...bind("country")} />
        </Field>
        {defaults && (
          <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Devise : {CURRENCY_LABELS[defaults.currency]} · TVA : {String(defaults.vatRate).replace(".", ",")} % — modifiables dans les
            paramètres.
          </p>
        )}
      </div>

      <div hidden={step !== 2} className="grid gap-4">
        <h1 className="text-2xl font-extrabold">Ajoutez votre logo</h1>
        <Field id="logo" label="Logo" optional hint="PNG, JPG ou WebP, 5 Mo maximum." error={state.fieldErrors?.logo}>
          <input
            id="logo"
            name="logo"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            aria-describedby="logo-msg"
            onChange={(e) => {
              const file = e.target.files?.[0];
              setPreview(file ? URL.createObjectURL(file) : null);
            }}
            className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-full file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:font-semibold"
          />
        </Field>
        {preview && (
          <Image
            src={preview}
            alt="Aperçu du logo"
            width={96}
            height={96}
            unoptimized
            className="h-24 w-24 rounded-2xl border border-slate-200 object-contain"
          />
        )}
      </div>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        {step > 0 ? (
          <button type="button" onClick={() => setStep((s) => s - 1)} className={buttonClass("outline", "md")}>
            Retour
          </button>
        ) : (
          <span />
        )}
        <div className="flex flex-col-reverse gap-3 sm:flex-row">
          {step < 2 ? (
            <>
              <button type="button" onClick={next} className={buttonClass("outline", "md")}>
                Passer
              </button>
              <button type="button" onClick={next} className={buttonClass("brand", "md")}>
                Continuer
              </button>
            </>
          ) : (
            <>
              <button type="submit" name="skipLogo" value="1" className={buttonClass("outline", "md")}>
                Passer
              </button>
              <SubmitButton pendingLabel="Enregistrement…">Terminer</SubmitButton>
            </>
          )}
        </div>
      </div>
    </form>
  );
}
