import type { DbResult } from "@/lib/db";
import { GENERIC_ERROR, type FormState } from "@/lib/form-state";
import { prepareLogo } from "@/lib/logo";
import type { Profile } from "@/lib/profile";
import { COUNTRY_DEFAULTS, type CountryCode } from "@/lib/site";
import {
  parseBilling,
  parseCompany,
  parseOnboarding,
  type BillingField,
  type BillingInput,
  type CompanyField,
  type CompanyInput,
  type OnboardingField,
} from "@/lib/validation";

export type ProfilePatch = Partial<CompanyInput & BillingInput & { logo_path: string | null; onboarded_at: string }>;

export interface ProfileRepo {
  update(patch: ProfilePatch): Promise<DbResult>;
  uploadLogo(data: Buffer): Promise<DbResult & { path?: string }>;
  removeLogo(path: string): Promise<DbResult>;
}

type Raw = Record<string, unknown>;
const SAVED = "Enregistré ✓";
const DB_DEFAULT_VAT = 18;

function dbFail(where: string, error: { message: string }): FormState {
  console.error(`[profil] ${where} :`, error.message);
  return { ok: false, message: GENERIC_ERROR };
}

const countryDefaults = (country: CountryCode) => ({
  currency: COUNTRY_DEFAULTS[country].currency,
  vat_rate: COUNTRY_DEFAULTS[country].vatRate,
});

export async function finishOnboarding(repo: ProfileRepo, raw: Raw, logo: unknown): Promise<FormState<OnboardingField>> {
  const parsed = parseOnboarding(raw);
  if (!parsed.success) return { ok: false, fieldErrors: parsed.fieldErrors };
  const prepared = await prepareLogo(logo);
  if (prepared.status === "invalid") return { ok: false, fieldErrors: { logo: prepared.message } };

  const patch: ProfilePatch = { ...parsed.data, onboarded_at: new Date().toISOString() };
  if (parsed.data.country) Object.assign(patch, countryDefaults(parsed.data.country));

  if (prepared.status === "ready") {
    const uploaded = await repo.uploadLogo(prepared.data);
    if (uploaded.error) return dbFail("logo (onboarding)", uploaded.error);
    patch.logo_path = uploaded.path ?? null;
  }

  const { error } = await repo.update(patch);
  if (error) return dbFail("onboarding", error);
  return { ok: true, redirectTo: "/app" };
}

export async function saveCompany(
  repo: ProfileRepo,
  current: Pick<Profile, "country" | "currency" | "vat_rate">,
  raw: Raw,
): Promise<FormState<CompanyField>> {
  const parsed = parseCompany(raw);
  if (!parsed.success) return { ok: false, fieldErrors: parsed.fieldErrors };

  const patch: ProfilePatch = { ...parsed.data };
  const next = parsed.data.country;
  let adjusted = false;
  // Pays et TVA sont dans deux formulaires : on ne réaligne la TVA que si elle n’a jamais été personnalisée.
  if (next && next !== current.country) {
    const previousDefault = current.country ? COUNTRY_DEFAULTS[current.country].vatRate : DB_DEFAULT_VAT;
    if (Number(current.vat_rate) === previousDefault) {
      Object.assign(patch, countryDefaults(next));
      adjusted = true;
    }
  }

  const { error } = await repo.update(patch);
  if (error) return dbFail("entreprise", error);
  return { ok: true, message: adjusted ? `${SAVED} Devise et TVA ajustées pour ce pays.` : SAVED };
}

export async function saveBilling(repo: ProfileRepo, raw: Raw): Promise<FormState<BillingField>> {
  const parsed = parseBilling(raw);
  if (!parsed.success) return { ok: false, fieldErrors: parsed.fieldErrors };
  const { error } = await repo.update(parsed.data);
  if (error) return dbFail("facturation", error);
  return { ok: true, message: SAVED };
}

export async function saveLogo(repo: ProfileRepo, currentPath: string | null, file: unknown): Promise<FormState> {
  const prepared = await prepareLogo(file);
  if (prepared.status === "none") return { ok: false, message: "Choisissez une image." };
  if (prepared.status === "invalid") return { ok: false, message: prepared.message };

  const uploaded = await repo.uploadLogo(prepared.data);
  if (uploaded.error || !uploaded.path) return dbFail("logo", uploaded.error ?? { message: "chemin manquant" });
  const { error } = await repo.update({ logo_path: uploaded.path });
  if (error) return dbFail("logo", error);
  if (currentPath) await repo.removeLogo(currentPath);
  return { ok: true, message: "Logo mis à jour ✓" };
}

export async function deleteLogo(repo: ProfileRepo, currentPath: string | null): Promise<FormState> {
  const { error } = await repo.update({ logo_path: null });
  if (error) return dbFail("retrait du logo", error);
  if (currentPath) await repo.removeLogo(currentPath);
  return { ok: true, message: "Logo retiré." };
}
