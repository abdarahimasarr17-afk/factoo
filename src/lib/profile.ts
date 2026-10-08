import type { CountryCode, Currency } from "@/lib/site";

export type Profile = {
  id: string;
  full_name: string | null;
  company_name: string | null;
  address: string | null;
  city: string | null;
  country: CountryCode | null;
  phone: string | null;
  business_email: string | null;
  rccm: string | null;
  nif: string | null;
  logo_path: string | null;
  currency: Currency;
  vat_rate: number;
  onboarded_at: string | null;
};

const COMPLETION_FIELDS = ["company_name", "country", "address", "phone", "rccm", "nif", "logo_path"] as const;

export function profileCompletion(profile: Pick<Profile, (typeof COMPLETION_FIELDS)[number]>): number {
  const filled = COMPLETION_FIELDS.filter((field) => (profile[field] ?? "").trim() !== "").length;
  return Math.round((filled / COMPLETION_FIELDS.length) * 100);
}

export function displayName(profile: Pick<Profile, "full_name" | "company_name">, email: string | undefined): string {
  const firstName = profile.full_name?.trim().split(/\s+/)[0];
  return firstName || profile.company_name?.trim() || email?.split("@")[0] || "";
}

export function logoUrl(path: string | null): string | null {
  return path ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/logos/${path}` : null;
}
