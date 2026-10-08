import { describe, expect, it } from "vitest";
import { displayName, logoUrl, profileCompletion, type Profile } from "@/lib/profile";

const empty: Profile = {
  id: "u1",
  full_name: null,
  company_name: null,
  address: null,
  city: null,
  country: null,
  phone: null,
  business_email: null,
  rccm: null,
  nif: null,
  logo_path: null,
  currency: "XOF",
  vat_rate: 18,
  onboarded_at: null,
};

describe("profileCompletion", () => {
  it("compte les 7 éléments affichés sur les factures", () => {
    expect(profileCompletion(empty)).toBe(0);
    expect(profileCompletion({ ...empty, company_name: "Studio Awa", country: "SN", phone: "+221771234567" })).toBe(43);
    expect(
      profileCompletion({
        ...empty,
        company_name: "Studio Awa",
        country: "SN",
        address: "Mermoz",
        phone: "+221771234567",
        rccm: "R",
        nif: "N",
        logo_path: "u1/logo.webp",
      }),
    ).toBe(100);
  });

  it("ignore les champs remplis d’espaces", () => {
    expect(profileCompletion({ ...empty, company_name: "   " })).toBe(0);
  });
});

describe("displayName", () => {
  it("préfère le prénom, puis l’entreprise, puis l’email", () => {
    expect(displayName({ ...empty, full_name: "Awa Diop" }, "awa@exemple.sn")).toBe("Awa");
    expect(displayName({ ...empty, company_name: "Studio Awa" }, "awa@exemple.sn")).toBe("Studio Awa");
    expect(displayName(empty, "awa@exemple.sn")).toBe("awa");
  });
});

describe("logoUrl", () => {
  it("construit l’URL publique du logo", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://abc.supabase.co";
    expect(logoUrl("u1/logo-1.webp")).toBe("https://abc.supabase.co/storage/v1/object/public/logos/u1/logo-1.webp");
    expect(logoUrl(null)).toBeNull();
  });
});
