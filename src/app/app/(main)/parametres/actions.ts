"use server";

import { revalidatePath } from "next/cache";
import { changePassword } from "@/lib/auth";
import type { FormState } from "@/lib/form-state";
import { profileRepo } from "@/lib/repos";
import { getSession } from "@/lib/session";
import { deleteLogo, saveBilling, saveCompany, saveLogo } from "@/lib/settings";
import { authApi } from "@/lib/supabase/server";

const entries = (formData: FormData) => Object.fromEntries(formData);

type Session = Awaited<ReturnType<typeof getSession>>;

async function withProfile(fn: (session: Session) => Promise<FormState>): Promise<FormState> {
  const result = await fn(await getSession());
  if (result.ok) revalidatePath("/app", "layout");
  return result;
}

export async function saveCompanyAction(_prev: FormState, formData: FormData) {
  return withProfile(({ supabase, user, profile }) => saveCompany(profileRepo(supabase, user.id), profile, entries(formData)));
}

export async function saveBillingAction(_prev: FormState, formData: FormData) {
  return withProfile(({ supabase, user }) => saveBilling(profileRepo(supabase, user.id), entries(formData)));
}

export async function saveLogoAction(_prev: FormState, formData: FormData) {
  return withProfile(({ supabase, user, profile }) =>
    saveLogo(profileRepo(supabase, user.id), profile.logo_path, formData.get("logo")),
  );
}

export async function deleteLogoAction() {
  return withProfile(({ supabase, user, profile }) => deleteLogo(profileRepo(supabase, user.id), profile.logo_path));
}

export async function changePasswordAction(_prev: FormState, formData: FormData) {
  const { supabase } = await getSession();
  return changePassword(authApi(supabase), entries(formData));
}
