"use client";

import { useActionState, useEffect, useState } from "react";
import { requestPasswordResetAction, resetPasswordAction } from "@/app/(auth)/actions";
import { Field, FormMessage, inputClass } from "@/components/forms/Field";
import { PasswordInput } from "@/components/forms/PasswordInput";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { cn } from "@/lib/cn";
import type { FormState } from "@/lib/form-state";
import { useFormValues } from "@/lib/use-form-values";

export function ResetPasswordFlow() {
  const [requestState, requestAction] = useActionState(requestPasswordResetAction, {} as FormState);
  const [resetState, resetAction] = useActionState(resetPasswordAction, {} as FormState);
  const { values, bind } = useFormValues({ email: "", code: "", password: "" });
  const [step, setStep] = useState<1 | 2>(1);

  useEffect(() => {
    if (requestState.ok) setStep(2);
  }, [requestState]);

  if (step === 1) {
    return (
      <form action={requestAction} noValidate className="grid gap-4">
        <FormMessage state={requestState} />
        <Field id="email" label="Email de votre compte" error={requestState.fieldErrors?.email}>
          <input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            aria-invalid={Boolean(requestState.fieldErrors?.email)}
            aria-describedby="email-msg"
            className={inputClass}
            {...bind("email")}
          />
        </Field>
        <SubmitButton pendingLabel="Envoi…" className="w-full">
          Recevoir un code
        </SubmitButton>
      </form>
    );
  }

  const errors = resetState.fieldErrors ?? {};
  return (
    <form action={resetAction} noValidate className="grid gap-4">
      <FormMessage state={resetState.message ? resetState : requestState} />
      <input type="hidden" name="email" value={values.email} />
      <Field id="code" label="Code à 6 chiffres" error={errors.code}>
        <input
          id="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={7}
          placeholder="123456"
          aria-invalid={Boolean(errors.code)}
          aria-describedby="code-msg"
          className={cn(inputClass, "text-center text-2xl font-bold tracking-[0.4em]")}
          {...bind("code")}
        />
      </Field>
      <Field id="password" label="Nouveau mot de passe" error={errors.password} hint="8 caractères minimum">
        <PasswordInput id="password" autoComplete="new-password" aria-invalid={Boolean(errors.password)} {...bind("password")} />
      </Field>
      <SubmitButton pendingLabel="Enregistrement…" className="w-full">
        Changer mon mot de passe
      </SubmitButton>
      <button type="button" onClick={() => setStep(1)} className="text-sm font-semibold text-[#007A33] underline">
        Changer d’email ou renvoyer un code
      </button>
    </form>
  );
}
