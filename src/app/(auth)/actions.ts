"use server";

import { redirect } from "next/navigation";
import * as auth from "@/lib/auth";
import type { FormState } from "@/lib/form-state";
import { authApi, createClient } from "@/lib/supabase/server";

type Raw = Record<string, unknown>;
const entries = (formData: FormData): Raw => Object.fromEntries(formData);

async function run(fn: (api: auth.AuthApi) => Promise<FormState>): Promise<FormState> {
  const supabase = await createClient();
  const result = await fn(authApi(supabase));
  if (result.ok && result.redirectTo) redirect(result.redirectTo);
  return result;
}

export async function signUpAction(_prev: FormState, formData: FormData) {
  return run((api) => auth.signUpWithPassword(api, entries(formData)));
}

export async function verifySignupCodeAction(_prev: FormState, formData: FormData) {
  return run((api) => auth.verifySignupCode(api, entries(formData)));
}

export async function resendSignupCodeAction(_prev: FormState, formData: FormData) {
  return run((api) => auth.resendSignupCode(api, entries(formData)));
}

export async function signInAction(_prev: FormState, formData: FormData) {
  return run((api) => auth.signIn(api, entries(formData)));
}

export async function requestPasswordResetAction(_prev: FormState, formData: FormData) {
  return run((api) => auth.requestPasswordReset(api, entries(formData)));
}

export async function resetPasswordAction(_prev: FormState, formData: FormData) {
  return run((api) => auth.resetPassword(api, entries(formData)));
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/connexion");
}
