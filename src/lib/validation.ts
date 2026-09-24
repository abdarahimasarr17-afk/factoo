import { z } from "zod";
import { COUNTRY_CODES, PROFILE_VALUES, type CountryCode, type ProfileValue } from "@/lib/site";

export type WaitlistField = "countryCode" | "phone" | "country" | "profile" | "email";

export type WaitlistRow = {
  phone: string;
  email: string | null;
  country: CountryCode;
  profile: ProfileValue;
};

export type ParseResult =
  | { success: true; data: WaitlistRow }
  | { success: false; fieldErrors: Partial<Record<WaitlistField, string>> };

const digitsOnly = (v: unknown) => (typeof v === "string" ? v.replace(/[\s.\-+()]/g, "") : "");
const blankToUndefined = (v: unknown) =>
  v === null || (typeof v === "string" && v.trim() === "") ? undefined : v;

const waitlistSchema = z.object({
  countryCode: z.preprocess(digitsOnly, z.string().regex(/^\d{1,4}$/, "Indicatif invalide")),
  phone: z.preprocess(digitsOnly, z.string().regex(/^\d{8,10}$/, "Numéro invalide : 8 à 10 chiffres")),
  country: z.enum(COUNTRY_CODES, { errorMap: () => ({ message: "Choisissez un pays" }) }),
  profile: z.enum(PROFILE_VALUES, { errorMap: () => ({ message: "Choisissez un profil" }) }),
  email: z.preprocess(
    blankToUndefined,
    z.string().trim().toLowerCase().email("Email invalide").optional(),
  ),
});

export function parseWaitlist(raw: Record<string, unknown>): ParseResult {
  const result = waitlistSchema.safeParse(raw);
  if (!result.success) {
    const fieldErrors: Partial<Record<WaitlistField, string>> = {};
    for (const issue of result.error.issues) {
      const field = issue.path[0] as WaitlistField | undefined;
      if (field && !fieldErrors[field]) fieldErrors[field] = issue.message;
    }
    return { success: false, fieldErrors };
  }
  const { countryCode, phone, country, profile, email } = result.data;
  return {
    success: true,
    data: { phone: `+${countryCode}${phone}`, email: email ?? null, country, profile },
  };
}
