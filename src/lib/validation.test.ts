import { describe, expect, it } from "vitest";
import {
  parseBilling,
  parseClient,
  parseCompany,
  parseInvoice,
  parseMarkPaid,
  parseOnboarding,
  parseOtp,
  parsePayment,
  parseReset,
  parseSignIn,
  parseSignUp,
  parseWaitlist,
} from "@/lib/validation";

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

describe("parseClient", () => {
  const base = { name: "  Agence Teranga ", countryCode: "221", phone: "", email: "", address: "", city: "", country: "", taxId: "" };

  it("accepte un client avec seulement un nom", () => {
    expect(parseClient(base)).toEqual({
      success: true,
      data: { name: "Agence Teranga", phone: null, email: null, address: null, city: null, country: null, tax_id: null },
    });
  });

  it("normalise le téléphone et garde les champs facultatifs remplis", () => {
    const r = parseClient({ ...base, phone: "77 123 45 67", email: "Contact@Teranga.SN", city: "Dakar", country: "SN", taxId: "SN2024" });
    expect(r.success && r.data).toEqual({
      name: "Agence Teranga",
      phone: "+221771234567",
      email: "contact@teranga.sn",
      address: null,
      city: "Dakar",
      country: "SN",
      tax_id: "SN2024",
    });
  });

  it("exige un nom", () => {
    expect(parseClient({ ...base, name: "   " })).toEqual({ success: false, fieldErrors: { name: "Le nom est obligatoire" } });
  });

  it("refuse un téléphone invalide et un indicatif vide", () => {
    const r = parseClient({ ...base, phone: "123", countryCode: "" });
    expect(!r.success && r.fieldErrors).toEqual({ phone: "Numéro invalide : 8 à 10 chiffres", countryCode: "Indicatif invalide" });
  });

  it("refuse un email invalide", () => {
    const r = parseClient({ ...base, email: "pas-un-email" });
    expect(!r.success && r.fieldErrors.email).toBe("Email invalide");
  });
});

describe("parseCompany", () => {
  it("normalise les champs de l’entreprise", () => {
    const r = parseCompany({ companyName: "Studio Awa", address: "", city: "Dakar", country: "SN", countryCode: "221", phone: "771234567", businessEmail: "", rccm: "SN-DKR-2024-A-1", nif: "" });
    expect(r.success && r.data).toEqual({
      company_name: "Studio Awa",
      address: null,
      city: "Dakar",
      country: "SN",
      phone: "+221771234567",
      business_email: null,
      rccm: "SN-DKR-2024-A-1",
      nif: null,
    });
  });
});

describe("parseBilling", () => {
  it("accepte la virgule française", () => {
    expect(parseBilling({ currency: "XAF", vatRate: "19,25" })).toEqual({ success: true, data: { currency: "XAF", vat_rate: 19.25 } });
    expect(parseBilling({ currency: "XOF", vatRate: " 0 " })).toEqual({ success: true, data: { currency: "XOF", vat_rate: 0 } });
  });

  it("refuse un taux non numérique, trop précis ou supérieur à 100", () => {
    expect(!parseBilling({ currency: "XOF", vatRate: "abc" }).success).toBe(true);
    expect(!parseBilling({ currency: "XOF", vatRate: "18,125" }).success).toBe(true);
    const r = parseBilling({ currency: "XOF", vatRate: "150" });
    expect(!r.success && r.fieldErrors.vatRate).toBe("100 % maximum");
  });

  it("refuse une devise inconnue", () => {
    const r = parseBilling({ currency: "USD", vatRate: "18" });
    expect(!r.success && r.fieldErrors.currency).toBe("Choisissez une devise");
  });
});

describe("parseOnboarding", () => {
  it("accepte des étapes passées", () => {
    expect(parseOnboarding({ companyName: "", country: "" })).toEqual({ success: true, data: { company_name: null, country: null } });
    expect(parseOnboarding({ companyName: "Studio Awa", country: "CM" })).toEqual({ success: true, data: { company_name: "Studio Awa", country: "CM" } });
  });
});

describe("schémas d’authentification", () => {
  it("inscription : email, mot de passe de 8 caractères et CGU", () => {
    expect(parseSignUp({ email: "Awa@Exemple.SN", password: "motdepasse", terms: "on" })).toEqual({
      success: true,
      data: { email: "awa@exemple.sn", password: "motdepasse", terms: true },
    });
    const r = parseSignUp({ email: "awa@exemple.sn", password: "court" });
    expect(!r.success && r.fieldErrors).toEqual({ password: "8 caractères minimum", terms: "Acceptez les CGU pour continuer" });
  });

  it("connexion : mot de passe requis", () => {
    const r = parseSignIn({ email: "awa@exemple.sn", password: "" });
    expect(!r.success && r.fieldErrors.password).toBe("Mot de passe requis");
  });

  it("code : 6 à 8 chiffres, espaces ignorés", () => {
    expect(parseOtp({ email: "awa@exemple.sn", code: "482 913" })).toEqual({ success: true, data: { email: "awa@exemple.sn", code: "482913" } });
    expect(parseOtp({ email: "awa@exemple.sn", code: "4164 5843" })).toEqual({ success: true, data: { email: "awa@exemple.sn", code: "41645843" } });
    const r = parseOtp({ email: "awa@exemple.sn", code: "48291" });
    expect(!r.success && r.fieldErrors.code).toBe("Le code contient 6 à 8 chiffres");
    const long = parseOtp({ email: "awa@exemple.sn", code: "123456789" });
    expect(!long.success && long.fieldErrors.code).toBe("Le code contient 6 à 8 chiffres");
  });

  it("réinitialisation : code et nouveau mot de passe", () => {
    const r = parseReset({ email: "awa@exemple.sn", code: "123456", password: "abc" });
    expect(!r.success && r.fieldErrors.password).toBe("8 caractères minimum");
  });
});

describe("parseInvoice", () => {
  const today = "2026-10-15";
  const base = {
    clientId: "8f1c2f9e-3b1a-4c6e-9d2a-1a2b3c4d5e6f", dueKind: "30", dueDate: "", currency: "XOF", vatRate: "18",
    discountType: "", discountValue: "", note: "",
    "lines.0.description": "Logo", "lines.0.quantity": "1", "lines.0.unitPrice": "150 000",
    "lines.1.description": "Cartes de visite", "lines.1.quantity": "2,5", "lines.1.unitPrice": "10000",
  };

  it("reconstruit les lignes et convertit les montants", () => {
    const r = parseInvoice(base, today);
    expect(r).toEqual({
      success: true,
      data: {
        client_id: base.clientId, due_kind: "30", due_date: null, currency: "XOF", vat_rate: 18, discount: null, note: null,
        lines: [
          { description: "Logo", quantity: 1, unit_price: 150000 },
          { description: "Cartes de visite", quantity: 2.5, unit_price: 10000 },
        ],
      },
    });
  });

  it("ignore les lignes entièrement vides", () => {
    const r = parseInvoice({ ...base, "lines.2.description": "", "lines.2.quantity": "", "lines.2.unitPrice": "" }, today);
    expect(r.success && r.data.lines).toHaveLength(2);
  });

  it("indexe les erreurs de ligne", () => {
    const r = parseInvoice({ ...base, "lines.1.quantity": "0", "lines.0.description": " " }, today);
    expect(!r.success && r.fieldErrors["lines.1.quantity"]).toBe("Quantité invalide");
    expect(!r.success && r.fieldErrors["lines.0.description"]).toBe("Désignation obligatoire");
  });

  it("exige au moins une ligne", () => {
    const r = parseInvoice({ ...base, "lines.0.description": "", "lines.0.quantity": "", "lines.0.unitPrice": "", "lines.1.description": "", "lines.1.quantity": "", "lines.1.unitPrice": "" }, today);
    expect(!r.success && r.fieldErrors.lines).toBe("Ajoutez au moins une ligne.");
  });

  it("prix en euros avec centimes ; décimales refusées en FCFA", () => {
    const eur = parseInvoice({ ...base, currency: "EUR", "lines.0.unitPrice": "99,90" }, today);
    expect(eur.success && eur.data.lines[0].unit_price).toBe(9990);
    const xof = parseInvoice({ ...base, "lines.0.unitPrice": "99,90" }, today);
    expect(!xof.success && xof.fieldErrors["lines.0.unitPrice"]).toBe("Prix invalide");
  });

  it("client facultatif pour un brouillon", () => {
    const r = parseInvoice({ ...base, clientId: "" }, today);
    expect(r.success && r.data.client_id).toBeNull();
  });

  it("date précise obligatoire et non passée", () => {
    expect(parseInvoice({ ...base, dueKind: "date", dueDate: "" }, today)).toMatchObject({ success: false, fieldErrors: { dueDate: "Choisissez une date" } });
    expect(parseInvoice({ ...base, dueKind: "date", dueDate: "2026-10-14" }, today)).toMatchObject({ success: false, fieldErrors: { dueDate: "L’échéance ne peut pas être dans le passé." } });
    const ok = parseInvoice({ ...base, dueKind: "date", dueDate: "2026-12-01" }, today);
    expect(ok.success && ok.data.due_date).toBe("2026-12-01");
  });

  it("remise en % ou en montant", () => {
    const pct = parseInvoice({ ...base, discountType: "percent", discountValue: "12,5" }, today);
    expect(pct.success && pct.data.discount).toEqual({ type: "percent", value: 12.5 });
    const amt = parseInvoice({ ...base, discountType: "amount", discountValue: "5 000" }, today);
    expect(amt.success && amt.data.discount).toEqual({ type: "amount", value: 5000 });
    const bad = parseInvoice({ ...base, discountType: "percent", discountValue: "120" }, today);
    expect(!bad.success && bad.fieldErrors.discountValue).toBe("Remise invalide");
  });

  it("TVA avec virgule", () => {
    const r = parseInvoice({ ...base, vatRate: "19,25" }, today);
    expect(r.success && r.data.vat_rate).toBe(19.25);
  });
});

describe("parseMarkPaid", () => {
  it("date ≤ aujourd’hui et moyen connu", () => {
    expect(parseMarkPaid({ paidAt: "2026-10-15", method: "wave" }, "2026-10-15")).toEqual({ success: true, data: { paid_at: "2026-10-15", payment_method: "wave" } });
    expect(parseMarkPaid({ paidAt: "2026-10-16", method: "wave" }, "2026-10-15")).toMatchObject({ success: false, fieldErrors: { paidAt: "La date ne peut pas être dans le futur." } });
    expect(parseMarkPaid({ paidAt: "2026-10-15", method: "bitcoin" }, "2026-10-15")).toMatchObject({ success: false, fieldErrors: { method: "Choisissez un moyen de paiement" } });
  });
});

describe("parsePayment", () => {
  it("numéros normalisés, IBAN compacté, champs vides → null", () => {
    expect(parsePayment({ waveCountryCode: "221", wavePhone: "77 123 45 67", omCountryCode: "221", omPhone: "", iban: "sn08 sn01 0015 2000", paymentNote: "" })).toEqual({
      success: true,
      data: { wave_number: "+221771234567", orange_money_number: null, iban: "SN08SN0100152000", payment_note: null },
    });
  });
  it("refuse un numéro invalide", () => {
    expect(parsePayment({ waveCountryCode: "221", wavePhone: "123", omCountryCode: "221", omPhone: "", iban: "", paymentNote: "" })).toMatchObject({ success: false, fieldErrors: { wavePhone: "Numéro invalide : 8 à 10 chiffres" } });
  });
});

describe("parseBilling — échéance par défaut", () => {
  it("facultative ; 0, 15 ou 30", () => {
    expect(parseBilling({ currency: "XOF", vatRate: "18", dueDays: "15" })).toEqual({ success: true, data: { currency: "XOF", vat_rate: 18, default_due_days: 15 } });
    expect(parseBilling({ currency: "XOF", vatRate: "18" })).toEqual({ success: true, data: { currency: "XOF", vat_rate: 18 } });
    expect(parseBilling({ currency: "XOF", vatRate: "18", dueDays: "45" })).toMatchObject({ success: false, fieldErrors: { dueDays: "Choisissez une échéance" } });
  });
});
