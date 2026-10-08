"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signInAction } from "@/app/(auth)/actions";
import { Field, FormMessage, inputClass } from "@/components/forms/Field";
import { PasswordInput } from "@/components/forms/PasswordInput";
import { SubmitButton } from "@/components/forms/SubmitButton";
import type { FormState } from "@/lib/form-state";
import { useFormValues } from "@/lib/use-form-values";

export function SignInForm({ next }: { next?: string }) {
  const [state, action] = useActionState(signInAction, {} as FormState);
  const { bind } = useFormValues({ email: "", password: "" });
  const errors = state.fieldErrors ?? {};

  return (
    <form action={action} noValidate className="grid gap-4">
      <FormMessage state={state} />
      {next && <input type="hidden" name="next" value={next} />}
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
      <Field id="password" label="Mot de passe" error={errors.password}>
        <PasswordInput id="password" autoComplete="current-password" aria-invalid={Boolean(errors.password)} {...bind("password")} />
      </Field>
      <Link href="/mot-de-passe-oublie" className="-mt-1 justify-self-end text-sm font-semibold text-[#007A33] underline">
        Mot de passe oublié ?
      </Link>
      <SubmitButton pendingLabel="Connexion…" className="w-full">
        Se connecter
      </SubmitButton>
    </form>
  );
}
