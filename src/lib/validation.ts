import { z } from "zod";
import {
  COUNTRY_CODES,
  CURRENCIES,
  PROFILE_VALUES,
  type CountryCode,
  type Currency,
  type ProfileValue,
} from "@/lib/site";

export type FieldErrors<K extends string> = Partial<Record<K, string>>;
export type Parsed<T, K extends string> = { success: true; data: T } | { success: false; fieldErrors: FieldErrors<K> };

export const PHONE_ERROR = "Numéro invalide : 8 à 10 chiffres";
export const DIAL_ERROR = "Indicatif invalide";

const DIAL_RE = /^\d{1,4}$/;
const LOCAL_RE = /^\d{8,10}$/;

const digitsOnly = (v: unknown) => (typeof v === "string" ? v.replace(/[\s.\-+()]/g, "") : "");
const blankToUndefined = (v: unknown) =>
  v === null || (typeof v === "string" && v.trim() === "") ? undefined : v;
const asString = (v: unknown) => (typeof v === "string" ? v : "");

export function toE164(dial: string, local: string): string {
  return `+${dial}${local}`;
}

function parseWith<S extends z.ZodTypeAny, K extends string>(schema: S, raw: unknown): Parsed<z.output<S>, K> {
  const result = schema.safeParse(raw);
  if (result.success) return { success: true, data: result.data };
  const fieldErrors: FieldErrors<K> = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0] as K | undefined;
    if (field && !fieldErrors[field]) fieldErrors[field] = issue.message;
  }
  return { success: false, fieldErrors };
}

const email = z.preprocess(asString, z.string().trim().toLowerCase().email("Email invalide"));
const optionalEmail = z.preprocess(blankToUndefined, z.string().trim().toLowerCase().email("Email invalide").optional());
const optionalText = (max: number) =>
  z.preprocess(blankToUndefined, z.string().trim().max(max, `${max} caractères maximum`).optional());
const countrySchema = z.enum(COUNTRY_CODES, { errorMap: () => ({ message: "Choisissez un pays" }) });
const optionalCountry = z.preprocess(blankToUndefined, countrySchema.optional());

// Téléphone facultatif : vide → null ; rempli → indicatif et numéro validés.
const phonePair = {
  countryCode: z.preprocess(digitsOnly, z.string()),
  phone: z.preprocess(digitsOnly, z.string()),
};
function checkPhonePair(v: { countryCode: string; phone: string }, ctx: z.RefinementCtx) {
  if (v.phone === "") return;
  if (!LOCAL_RE.test(v.phone)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["phone"], message: PHONE_ERROR });
  if (!DIAL_RE.test(v.countryCode)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["countryCode"], message: DIAL_ERROR });
}
const phoneOrNull = (v: { countryCode: string; phone: string }) => (v.phone ? toE164(v.countryCode, v.phone) : null);

/* ---------- Liste d’attente (comportement inchangé) ---------- */

export type WaitlistField = "countryCode" | "phone" | "country" | "profile" | "email";
export type WaitlistRow = { phone: string; email: string | null; country: CountryCode; profile: ProfileValue };
export type ParseResult = Parsed<WaitlistRow, WaitlistField>;

const waitlistSchema = z
  .object({
    countryCode: z.preprocess(digitsOnly, z.string().regex(DIAL_RE, DIAL_ERROR)),
    phone: z.preprocess(digitsOnly, z.string().regex(LOCAL_RE, PHONE_ERROR)),
    country: countrySchema,
    profile: z.enum(PROFILE_VALUES, { errorMap: () => ({ message: "Choisissez un profil" }) }),
    email: optionalEmail,
  })
  .transform(
    (v): WaitlistRow => ({ phone: toE164(v.countryCode, v.phone), email: v.email ?? null, country: v.country, profile: v.profile }),
  );

export function parseWaitlist(raw: Record<string, unknown>): ParseResult {
  return parseWith<typeof waitlistSchema, WaitlistField>(waitlistSchema, raw);
}

/* ---------- Clients ---------- */

export type ClientField = "name" | "countryCode" | "phone" | "email" | "address" | "city" | "country" | "taxId";
export type ClientInput = {
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  country: CountryCode | null;
  tax_id: string | null;
};

const clientSchema = z
  .object({
    name: z.preprocess(
      (v) => asString(v).trim(),
      z.string().min(1, "Le nom est obligatoire").max(120, "120 caractères maximum"),
    ),
    ...phonePair,
    email: optionalEmail,
    address: optionalText(200),
    city: optionalText(200),
    country: optionalCountry,
    taxId: optionalText(50),
  })
  .superRefine(checkPhonePair)
  .transform(
    (v): ClientInput => ({
      name: v.name,
      phone: phoneOrNull(v),
      email: v.email ?? null,
      address: v.address ?? null,
      city: v.city ?? null,
      country: v.country ?? null,
      tax_id: v.taxId ?? null,
    }),
  );

export function parseClient(raw: Record<string, unknown>): Parsed<ClientInput, ClientField> {
  return parseWith<typeof clientSchema, ClientField>(clientSchema, raw);
}

/* ---------- Profil entreprise ---------- */

export type CompanyField =
  | "companyName"
  | "address"
  | "city"
  | "country"
  | "countryCode"
  | "phone"
  | "businessEmail"
  | "rccm"
  | "nif";
export type CompanyInput = {
  company_name: string | null;
  address: string | null;
  city: string | null;
  country: CountryCode | null;
  phone: string | null;
  business_email: string | null;
  rccm: string | null;
  nif: string | null;
};

const companySchema = z
  .object({
    companyName: optionalText(120),
    address: optionalText(200),
    city: optionalText(200),
    country: optionalCountry,
    ...phonePair,
    businessEmail: optionalEmail,
    rccm: optionalText(50),
    nif: optionalText(50),
  })
  .superRefine(checkPhonePair)
  .transform(
    (v): CompanyInput => ({
      company_name: v.companyName ?? null,
      address: v.address ?? null,
      city: v.city ?? null,
      country: v.country ?? null,
      phone: phoneOrNull(v),
      business_email: v.businessEmail ?? null,
      rccm: v.rccm ?? null,
      nif: v.nif ?? null,
    }),
  );

export function parseCompany(raw: Record<string, unknown>): Parsed<CompanyInput, CompanyField> {
  return parseWith<typeof companySchema, CompanyField>(companySchema, raw);
}

/* ---------- Facturation ---------- */

export type BillingField = "currency" | "vatRate";
export type BillingInput = { currency: Currency; vat_rate: number };

const billingSchema = z
  .object({
    currency: z.enum(CURRENCIES, { errorMap: () => ({ message: "Choisissez une devise" }) }),
    vatRate: z.preprocess(
      (v) => (typeof v === "number" ? String(v) : asString(v).trim()),
      z
        .string()
        .regex(/^\d{1,3}([.,]\d{1,2})?$/, "Taux invalide (ex. 18 ou 19,25)")
        .transform((s) => Number(s.replace(",", ".")))
        .refine((n) => n <= 100, "100 % maximum"),
    ),
  })
  .transform((v): BillingInput => ({ currency: v.currency, vat_rate: v.vatRate }));

export function parseBilling(raw: Record<string, unknown>): Parsed<BillingInput, BillingField> {
  return parseWith<typeof billingSchema, BillingField>(billingSchema, raw);
}

/* ---------- Onboarding ---------- */

export type OnboardingField = "companyName" | "country" | "logo";
export type OnboardingInput = { company_name: string | null; country: CountryCode | null };

const onboardingSchema = z
  .object({ companyName: optionalText(120), country: optionalCountry })
  .transform((v): OnboardingInput => ({ company_name: v.companyName ?? null, country: v.country ?? null }));

export function parseOnboarding(raw: Record<string, unknown>): Parsed<OnboardingInput, OnboardingField> {
  return parseWith<typeof onboardingSchema, OnboardingField>(onboardingSchema, raw);
}

/* ---------- Authentification ---------- */

export type AuthField = "email" | "password" | "code" | "terms";

const password = z.preprocess(asString, z.string().min(8, "8 caractères minimum").max(72, "72 caractères maximum"));
const otpCode = z.preprocess(
  (v) => asString(v).replace(/\s/g, ""),
  z.string().regex(/^\d{6}$/, "Le code contient 6 chiffres"),
);

const signUpSchema = z.object({
  email,
  password,
  terms: z.preprocess(
    (v) => v === "on" || v === true || v === "true",
    z.literal(true, { errorMap: () => ({ message: "Acceptez les CGU pour continuer" }) }),
  ),
});
const signInSchema = z.object({ email, password: z.preprocess(asString, z.string().min(1, "Mot de passe requis")) });
const emailOnlySchema = z.object({ email });
const otpSchema = z.object({ email, code: otpCode });
const resetSchema = z.object({ email, code: otpCode, password });
const newPasswordSchema = z.object({ password });

export const parseSignUp = (raw: Record<string, unknown>) => parseWith<typeof signUpSchema, AuthField>(signUpSchema, raw);
export const parseSignIn = (raw: Record<string, unknown>) => parseWith<typeof signInSchema, AuthField>(signInSchema, raw);
export const parseEmailOnly = (raw: Record<string, unknown>) =>
  parseWith<typeof emailOnlySchema, AuthField>(emailOnlySchema, raw);
export const parseOtp = (raw: Record<string, unknown>) => parseWith<typeof otpSchema, AuthField>(otpSchema, raw);
export const parseReset = (raw: Record<string, unknown>) => parseWith<typeof resetSchema, AuthField>(resetSchema, raw);
export const parseNewPassword = (raw: Record<string, unknown>) =>
  parseWith<typeof newPasswordSchema, AuthField>(newPasswordSchema, raw);
