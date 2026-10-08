"use server";

import { redirect } from "next/navigation";
import type { FormState } from "@/lib/form-state";
import { profileRepo } from "@/lib/repos";
import { finishOnboarding } from "@/lib/settings";
import { requireUser } from "@/lib/supabase/server";

export async function finishOnboardingAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase, user } = await requireUser();
  const logo = formData.get("skipLogo") ? null : formData.get("logo");
  const result = await finishOnboarding(profileRepo(supabase, user.id), Object.fromEntries(formData), logo);
  if (result.ok && result.redirectTo) redirect(result.redirectTo);
  return result;
}
