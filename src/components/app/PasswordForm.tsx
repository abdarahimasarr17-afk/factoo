"use client";

import { useActionState } from "react";
import { changePasswordAction } from "@/app/app/(main)/parametres/actions";
import { Field, FormMessage } from "@/components/forms/Field";
import { PasswordInput } from "@/components/forms/PasswordInput";
import { SubmitButton } from "@/components/forms/SubmitButton";
import type { FormState } from "@/lib/form-state";
import { useFormValues } from "@/lib/use-form-values";

export function PasswordForm() {
  const [state, action] = useActionState(changePasswordAction, {} as FormState);
  const { bind } = useFormValues({ password: "" });
  return (
    <form action={action} noValidate className="grid gap-4">
      <FormMessage state={state} />
      <Field id="password" label="Nouveau mot de passe" error={state.fieldErrors?.password} hint="8 caractères minimum">
        <PasswordInput id="password" autoComplete="new-password" aria-invalid={Boolean(state.fieldErrors?.password)} {...bind("password")} />
      </Field>
      <SubmitButton variant="outline" className="sm:justify-self-start">
        Changer le mot de passe
      </SubmitButton>
    </form>
  );
}
