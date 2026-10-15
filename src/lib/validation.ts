import { z } from "zod";
import type { Discount } from "@/lib/invoice-totals";
import { PAYMENT_METHODS, type DueKind, type PaymentMethod } from "@/lib/invoice-types";
import { parseAmount } from "@/lib/money";
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

export type BillingField = "currency" | "vatRate" | "dueDays";
export type BillingInput = { currency: Currency; vat_rate: number; default_due_days?: 0 | 15 | 30 };

const vatRateSchema = z.preprocess(
  (v) => (typeof v === "number" ? String(v) : asString(v).trim()),
  z
    .string()
    .regex(/^\d{1,3}([.,]\d{1,2})?$/, "Taux invalide (ex. 18 ou 19,25)")
    .transform((s) => Number(s.replace(",", ".")))
    .refine((n) => n <= 100, "100 % maximum"),
);

const billingSchema = z
  .object({
    currency: z.enum(CURRENCIES, { errorMap: () => ({ message: "Choisissez une devise" }) }),
    vatRate: vatRateSchema,
    dueDays: z.preprocess(
      blankToUndefined,
      z.enum(["0", "15", "30"], { errorMap: () => ({ message: "Choisissez une échéance" }) }).optional(),
    ),
  })
  .transform((v): BillingInput => {
    const out: BillingInput = { currency: v.currency, vat_rate: v.vatRate };
    if (v.dueDays !== undefined) out.default_due_days = Number(v.dueDays) as 0 | 15 | 30;
    return out;
  });

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
  z.string().regex(/^\d{6,8}$/, "Le code contient 6 à 8 chiffres"),
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

/* ---------- Factures ---------- */

export type InvoiceLineInput = { description: string; quantity: number; unit_price: number };
export type InvoiceInput = {
  client_id: string | null;
  due_kind: DueKind;
  due_date: string | null;
  currency: Currency;
  vat_rate: number;
  discount: Discount;
  note: string | null;
  lines: InvoiceLineInput[];
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const QTY_RE = /^\d{1,6}([.,]\d{1,3})?$/;
const PCT_RE = /^\d{1,3}([.,]\d{1,2})?$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_LINES = 50;
const MAX_UNIT_PRICE = 1e12;

// Les champs de ligne arrivent à plat (« lines.3.quantity ») : on les regroupe par index, dans l'ordre.
function collectLines(raw: Record<string, unknown>) {
  const byIndex = new Map<number, Record<string, string>>();
  for (const [key, value] of Object.entries(raw)) {
    const m = /^lines\.(\d+)\.(description|quantity|unitPrice)$/.exec(key);
    if (!m) continue;
    const index = Number(m[1]);
    byIndex.set(index, { ...(byIndex.get(index) ?? {}), [m[2]]: asString(value) });
  }
  return [...byIndex.entries()]
    .sort(([a], [b]) => a - b)
    .map(([index, l]) => ({ index, description: (l.description ?? "").trim(), quantity: (l.quantity ?? "").trim(), unitPrice: (l.unitPrice ?? "").trim() }))
    .filter((l) => l.description || l.quantity || l.unitPrice);
}

export function parseInvoice(raw: Record<string, unknown>, today: string): Parsed<InvoiceInput, string> {
  const errors: FieldErrors<string> = {};
  const fail = (field: string, message: string) => {
    if (!errors[field]) errors[field] = message;
  };

  const clientId = asString(raw.clientId).trim();
  if (clientId && !UUID_RE.test(clientId)) fail("clientId", "Choisissez un client");

  const dueKind = asString(raw.dueKind) as DueKind;
  if (!["0", "15", "30", "date"].includes(dueKind)) fail("dueKind", "Choisissez une échéance");
  const dueDateRaw = asString(raw.dueDate).trim();
  let dueDate: string | null = null;
  if (dueKind === "date") {
    if (!DATE_RE.test(dueDateRaw)) fail("dueDate", "Choisissez une date");
    else if (dueDateRaw < today) fail("dueDate", "L’échéance ne peut pas être dans le passé.");
    else dueDate = dueDateRaw;
  }

  const currency = asString(raw.currency) as Currency;
  if (!(CURRENCIES as readonly string[]).includes(currency)) fail("currency", "Choisissez une devise");

  const vat = vatRateSchema.safeParse(raw.vatRate);
  if (!vat.success) fail("vatRate", vat.error.issues[0].message);

  let discount: Discount = null;
  const discountType = asString(raw.discountType);
  const discountValue = asString(raw.discountValue).trim();
  if (discountType === "percent" || discountType === "amount") {
    if (discountType === "percent") {
      const n = Number(discountValue.replace(",", "."));
      if (!PCT_RE.test(discountValue) || n > 100) fail("discountValue", "Remise invalide");
      else if (n > 0) discount = { type: "percent", value: n };
    } else {
      const minor = parseAmount(discountValue, currency);
      if (minor === null) fail("discountValue", "Remise invalide");
      else if (minor > 0) discount = { type: "amount", value: minor };
    }
  }

  const note = asString(raw.note).trim();
  if (note.length > 500) fail("note", "500 caractères maximum");

  const collected = collectLines(raw);
  if (collected.length === 0) fail("lines", "Ajoutez au moins une ligne.");
  if (collected.length > MAX_LINES) fail("lines", `${MAX_LINES} lignes maximum.`);
  const lines: InvoiceLineInput[] = collected.map((l) => {
    const key = (field: string) => `lines.${l.index}.${field}`;
    if (!l.description) fail(key("description"), "Désignation obligatoire");
    else if (l.description.length > 300) fail(key("description"), "300 caractères maximum");
    const quantity = Number(l.quantity.replace(",", "."));
    if (!QTY_RE.test(l.quantity) || quantity <= 0 || quantity > 100000) fail(key("quantity"), "Quantité invalide");
    const unitPrice = parseAmount(l.unitPrice, currency);
    if (unitPrice === null || unitPrice > MAX_UNIT_PRICE) fail(key("unitPrice"), "Prix invalide");
    return { description: l.description, quantity, unit_price: unitPrice ?? 0 };
  });

  if (Object.keys(errors).length > 0) return { success: false, fieldErrors: errors };
  return {
    success: true,
    data: {
      client_id: clientId || null,
      due_kind: dueKind,
      due_date: dueDate,
      currency,
      vat_rate: vat.success ? vat.data : 0,
      discount,
      note: note || null,
      lines,
    },
  };
}

/* ---------- Paiement d'une facture ---------- */

export function parseMarkPaid(
  raw: Record<string, unknown>,
  today: string,
): Parsed<{ paid_at: string; payment_method: PaymentMethod }, "paidAt" | "method"> {
  const errors: FieldErrors<"paidAt" | "method"> = {};
  const paidAt = asString(raw.paidAt).trim();
  if (!DATE_RE.test(paidAt)) errors.paidAt = "Choisissez une date";
  else if (paidAt > today) errors.paidAt = "La date ne peut pas être dans le futur.";
  const method = asString(raw.method) as PaymentMethod;
  if (!PAYMENT_METHODS.includes(method)) errors.method = "Choisissez un moyen de paiement";
  if (errors.paidAt || errors.method) return { success: false, fieldErrors: errors };
  return { success: true, data: { paid_at: paidAt, payment_method: method } };
}

/* ---------- Coordonnées de paiement (Paramètres) ---------- */

export type PaymentField = "waveCountryCode" | "wavePhone" | "omCountryCode" | "omPhone" | "iban" | "paymentNote";
export type PaymentInput = {
  wave_number: string | null;
  orange_money_number: string | null;
  iban: string | null;
  payment_note: string | null;
};

const paymentSchema = z
  .object({
    waveCountryCode: z.preprocess(digitsOnly, z.string()),
    wavePhone: z.preprocess(digitsOnly, z.string()),
    omCountryCode: z.preprocess(digitsOnly, z.string()),
    omPhone: z.preprocess(digitsOnly, z.string()),
    iban: z.preprocess(
      (v) => asString(v).replace(/\s/g, "").toUpperCase(),
      z.string().regex(/^[A-Z0-9]{0,34}$/, "IBAN invalide"),
    ),
    paymentNote: optionalText(300),
  })
  .superRefine((v, ctx) => {
    const pairs = [
      { code: v.waveCountryCode, phone: v.wavePhone, codeField: "waveCountryCode", phoneField: "wavePhone" },
      { code: v.omCountryCode, phone: v.omPhone, codeField: "omCountryCode", phoneField: "omPhone" },
    ];
    for (const p of pairs) {
      if (p.phone === "") continue;
      if (!LOCAL_RE.test(p.phone)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: [p.phoneField], message: PHONE_ERROR });
      if (!DIAL_RE.test(p.code)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: [p.codeField], message: DIAL_ERROR });
    }
  })
  .transform(
    (v): PaymentInput => ({
      wave_number: phoneOrNull({ countryCode: v.waveCountryCode, phone: v.wavePhone }),
      orange_money_number: phoneOrNull({ countryCode: v.omCountryCode, phone: v.omPhone }),
      iban: v.iban || null,
      payment_note: v.paymentNote ?? null,
    }),
  );

export function parsePayment(raw: Record<string, unknown>): Parsed<PaymentInput, PaymentField> {
  return parseWith<typeof paymentSchema, PaymentField>(paymentSchema, raw);
}
