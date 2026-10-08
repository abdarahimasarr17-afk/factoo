"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { signUpAction } from "@/app/(auth)/actions";
import { Field, FormMessage, inputClass } from "@/components/forms/Field";
import { PasswordInput } from "@/components/forms/PasswordInput";
import { SubmitButton } from "@/components/forms/SubmitButton";
import type { FormState } from "@/lib/form-state";
import { useFormValues } from "@/lib/use-form-values";

export function SignUpForm() {
  const [state, action] = useActionState(signUpAction, {} as FormState);
  const { bind } = useFormValues({ email: "", password: "" });
  const [terms, setTerms] = useState(false);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={action} noValidate className="grid gap-4">
      <FormMessage state={state} />
      <Field id="email" label="Email" error={errors.email}>
        <input
          id="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          aria-invalid={Boolean(errors.email)}
          aria-describedby="email-msg"
          className={inputClass}
          {...bind("email")}
        />
      </Field>
      <Field id="password" label="Mot de passe" error={errors.password} hint="8 caractères minimum">
        <PasswordInput id="password" autoComplete="new-password" aria-invalid={Boolean(errors.password)} {...bind("password")} />
      </Field>
      <div>
        <label className="flex items-start gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            name="terms"
            checked={terms}
            onChange={(e) => setTerms(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-[#00C853]"
          />
          <span>
            J’accepte les{" "}
            <Link href="/cgu" target="_blank" className="font-semibold text-[#007A33] underline">
              CGU
            </Link>{" "}
            et la{" "}
            <Link href="/confidentialite" target="_blank" className="font-semibold text-[#007A33] underline">
              politique de confidentialité
            </Link>
            .
          </span>
        </label>
        {errors.terms && <p className="mt-1.5 text-sm text-red-600">{errors.terms}</p>}
      </div>
      <SubmitButton pendingLabel="Création du compte…" className="w-full">
        Créer mon compte
      </SubmitButton>
    </form>
  );
}
