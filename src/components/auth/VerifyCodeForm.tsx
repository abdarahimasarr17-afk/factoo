"use client";

import { useActionState, useEffect, useState } from "react";
import { resendSignupCodeAction, verifySignupCodeAction } from "@/app/(auth)/actions";
import { Field, FormMessage, inputClass } from "@/components/forms/Field";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { cn } from "@/lib/cn";
import type { FormState } from "@/lib/form-state";
import { useFormValues } from "@/lib/use-form-values";

const COOLDOWN = 60;

export function VerifyCodeForm({ email }: { email: string }) {
  const [state, action] = useActionState(verifySignupCodeAction, {} as FormState);
  const [resendState, resendAction, resending] = useActionState(resendSignupCodeAction, {} as FormState);
  const { bind } = useFormValues({ code: "" });
  const [seconds, setSeconds] = useState(COOLDOWN);

  useEffect(() => {
    if (seconds <= 0) return;
    const timer = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [seconds]);

  useEffect(() => {
    if (resendState.ok) setSeconds(COOLDOWN);
  }, [resendState]);

  return (
    <>
      <form action={action} noValidate className="grid gap-4">
        <FormMessage state={state} />
        <input type="hidden" name="email" value={email} />
        <Field id="code" label="Code à 6 chiffres" error={state.fieldErrors?.code}>
          <input
            id="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={7}
            placeholder="123456"
            aria-invalid={Boolean(state.fieldErrors?.code)}
            aria-describedby="code-msg"
            className={cn(inputClass, "text-center text-2xl font-bold tracking-[0.4em]")}
            {...bind("code")}
          />
        </Field>
        <SubmitButton pendingLabel="Vérification…" className="w-full">
          Valider
        </SubmitButton>
      </form>
      <form action={resendAction} className="mt-5 text-center text-sm">
        <input type="hidden" name="email" value={email} />
        {resendState.message && (
          <p role="status" className={cn("mb-2", resendState.ok ? "text-green-700" : "text-red-600")}>
            {resendState.message}
          </p>
        )}
        <button
          type="submit"
          disabled={seconds > 0 || resending}
          className="font-semibold text-[#007A33] underline disabled:text-slate-400 disabled:no-underline"
        >
          {seconds > 0 ? `Renvoyer le code dans ${seconds} s` : "Renvoyer le code"}
        </button>
      </form>
    </>
  );
}
