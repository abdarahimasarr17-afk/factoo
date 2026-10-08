import sharp from "sharp";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GENERIC_ERROR } from "@/lib/form-state";
import { deleteLogo, finishOnboarding, saveBilling, saveCompany, saveLogo, type ProfileRepo } from "@/lib/settings";

function fakeRepo(overrides: Partial<ProfileRepo> = {}): ProfileRepo {
  return {
    update: vi.fn(async () => ({ error: null })),
    uploadLogo: vi.fn(async () => ({ error: null, path: "u1/logo-1.webp" })),
    removeLogo: vi.fn(async () => ({ error: null })),
    ...overrides,
  };
}

async function logoFile() {
  const buffer = await sharp({ create: { width: 300, height: 300, channels: 3, background: "#04201D" } }).png().toBuffer();
  return new File([new Uint8Array(buffer)], "logo.png", { type: "image/png" });
}

const company = { companyName: "Studio Awa", address: "", city: "Dakar", country: "CM", countryCode: "221", phone: "", businessEmail: "", rccm: "", nif: "" };

afterEach(() => vi.restoreAllMocks());

describe("finishOnboarding", () => {
  it("enregistre l’entreprise, les valeurs du pays et marque l’onboarding terminé", async () => {
    const repo = fakeRepo();
    expect(await finishOnboarding(repo, { companyName: "Studio Awa", country: "CM" }, null)).toEqual({ ok: true, redirectTo: "/app" });
    const patch = vi.mocked(repo.update).mock.calls[0][0];
    expect(patch).toMatchObject({ company_name: "Studio Awa", country: "CM", currency: "XAF", vat_rate: 19.25 });
    expect(typeof patch.onboarded_at).toBe("string");
  });

  it("accepte un onboarding entièrement passé", async () => {
    const repo = fakeRepo();
    await finishOnboarding(repo, { companyName: "", country: "" }, null);
    const patch = vi.mocked(repo.update).mock.calls[0][0];
    expect(patch).toMatchObject({ company_name: null, country: null });
    expect(patch).not.toHaveProperty("currency");
  });

  it("téléverse le logo s’il est fourni", async () => {
    const repo = fakeRepo();
    await finishOnboarding(repo, { companyName: "", country: "SN" }, await logoFile());
    expect(repo.uploadLogo).toHaveBeenCalled();
    expect(vi.mocked(repo.update).mock.calls[0][0]).toMatchObject({ logo_path: "u1/logo-1.webp" });
  });

  it("refuse un logo invalide sans rien enregistrer", async () => {
    const repo = fakeRepo();
    const pdf = new File([new Uint8Array([1])], "x.pdf", { type: "application/pdf" });
    expect(await finishOnboarding(repo, { companyName: "", country: "" }, pdf)).toEqual({
      ok: false,
      fieldErrors: { logo: "Format accepté : PNG, JPG ou WebP" },
    });
    expect(repo.update).not.toHaveBeenCalled();
  });
});

describe("saveCompany", () => {
  it("réaligne devise et TVA si la TVA était celle de l’ancien pays", async () => {
    const repo = fakeRepo();
    const state = await saveCompany(repo, { country: "SN", currency: "XOF", vat_rate: 18 }, company);
    expect(state.ok).toBe(true);
    expect(state.message).toBe("Enregistré ✓ Devise et TVA ajustées pour ce pays.");
    expect(vi.mocked(repo.update).mock.calls[0][0]).toMatchObject({ country: "CM", currency: "XAF", vat_rate: 19.25 });
  });

  it("ne touche pas une TVA personnalisée", async () => {
    const repo = fakeRepo();
    const state = await saveCompany(repo, { country: "SN", currency: "XOF", vat_rate: 0 }, company);
    expect(state.message).toBe("Enregistré ✓");
    expect(vi.mocked(repo.update).mock.calls[0][0]).not.toHaveProperty("vat_rate");
  });

  it("applique les valeurs du pays quand aucun pays n’était défini", async () => {
    const repo = fakeRepo();
    await saveCompany(repo, { country: null, currency: "XOF", vat_rate: 18 }, company);
    expect(vi.mocked(repo.update).mock.calls[0][0]).toMatchObject({ vat_rate: 19.25 });
  });

  it("renvoie les erreurs de champ", async () => {
    const repo = fakeRepo();
    const state = await saveCompany(repo, { country: null, currency: "XOF", vat_rate: 18 }, { ...company, phone: "12" });
    expect(state.fieldErrors?.phone).toBe("Numéro invalide : 8 à 10 chiffres");
    expect(repo.update).not.toHaveBeenCalled();
  });

  it("journalise une erreur de base", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const repo = fakeRepo({ update: vi.fn(async () => ({ error: { message: "boom" } })) });
    expect(await saveCompany(repo, { country: "SN", currency: "XOF", vat_rate: 18 }, company)).toEqual({ ok: false, message: GENERIC_ERROR });
    expect(log).toHaveBeenCalled();
  });
});

describe("saveBilling", () => {
  it("enregistre la devise et le taux", async () => {
    const repo = fakeRepo();
    expect(await saveBilling(repo, { currency: "EUR", vatRate: "20" })).toEqual({ ok: true, message: "Enregistré ✓" });
    expect(repo.update).toHaveBeenCalledWith({ currency: "EUR", vat_rate: 20 });
  });
});

describe("saveLogo / deleteLogo", () => {
  it("remplace le logo et supprime l’ancien fichier", async () => {
    const repo = fakeRepo();
    expect(await saveLogo(repo, "u1/ancien.webp", await logoFile())).toEqual({ ok: true, message: "Logo mis à jour ✓" });
    expect(repo.update).toHaveBeenCalledWith({ logo_path: "u1/logo-1.webp" });
    expect(repo.removeLogo).toHaveBeenCalledWith("u1/ancien.webp");
  });

  it("demande de choisir une image", async () => {
    expect(await saveLogo(fakeRepo(), null, null)).toEqual({ ok: false, message: "Choisissez une image." });
  });

  it("retire le logo", async () => {
    const repo = fakeRepo();
    expect(await deleteLogo(repo, "u1/logo.webp")).toEqual({ ok: true, message: "Logo retiré." });
    expect(repo.update).toHaveBeenCalledWith({ logo_path: null });
    expect(repo.removeLogo).toHaveBeenCalledWith("u1/logo.webp");
  });
});
