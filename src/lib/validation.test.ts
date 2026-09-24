import { describe, expect, it } from "vitest";
import { parseWaitlist } from "@/lib/validation";

const valid = { countryCode: "221", phone: "77 123 45 67", country: "SN", profile: "freelance", email: "" };

describe("parseWaitlist", () => {
  it("accepte un numéro sénégalais et le normalise en E.164", () => {
    const r = parseWaitlist(valid);
    expect(r).toEqual({
      success: true,
      data: { phone: "+221771234567", email: null, country: "SN", profile: "freelance" },
    });
  });

  it("garde le 0 initial des numéros ivoiriens à 10 chiffres", () => {
    const r = parseWaitlist({ ...valid, countryCode: "+225", phone: "07-01-02-03-04", country: "CI" });
    expect(r.success && r.data.phone).toBe("+2250701020304");
  });

  it("refuse un numéro trop court", () => {
    const r = parseWaitlist({ ...valid, phone: "12345" });
    expect(r).toEqual({ success: false, fieldErrors: { phone: "Numéro invalide : 8 à 10 chiffres" } });
  });

  it("refuse un numéro avec des lettres", () => {
    const r = parseWaitlist({ ...valid, phone: "77abc4567" });
    expect(r.success).toBe(false);
    expect(!r.success && r.fieldErrors.phone).toBeTruthy();
  });

  it("refuse un numéro absent (null venant de FormData)", () => {
    const r = parseWaitlist({ ...valid, phone: null });
    expect(!r.success && r.fieldErrors.phone).toBe("Numéro invalide : 8 à 10 chiffres");
  });

  it("refuse un indicatif vide", () => {
    const r = parseWaitlist({ ...valid, countryCode: "" });
    expect(!r.success && r.fieldErrors.countryCode).toBe("Indicatif invalide");
  });

  it("garde un email valide en minuscules sans espaces", () => {
    const r = parseWaitlist({ ...valid, email: "  Awa@Exemple.sn " });
    expect(r.success && r.data.email).toBe("awa@exemple.sn");
  });

  it("refuse un email invalide", () => {
    const r = parseWaitlist({ ...valid, email: "pas-un-email" });
    expect(!r.success && r.fieldErrors.email).toBe("Email invalide");
  });

  it("refuse un pays hors liste", () => {
    const r = parseWaitlist({ ...valid, country: "FR" });
    expect(!r.success && r.fieldErrors.country).toBe("Choisissez un pays");
  });

  it("refuse un profil hors liste", () => {
    const r = parseWaitlist({ ...valid, profile: "banque" });
    expect(!r.success && r.fieldErrors.profile).toBe("Choisissez un profil");
  });
});
