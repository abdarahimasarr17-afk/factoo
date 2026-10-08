import { afterEach, describe, expect, it, vi } from "vitest";
import { archiveClient, clientToFormValues, saveClient, type ClientsRepo } from "@/lib/clients";
import { GENERIC_ERROR } from "@/lib/form-state";

function fakeRepo(overrides: Partial<ClientsRepo> = {}): ClientsRepo {
  return {
    create: vi.fn(async () => ({ error: null })),
    update: vi.fn(async () => ({ error: null, found: true })),
    archive: vi.fn(async () => ({ error: null, found: true })),
    ...overrides,
  };
}

const form = { name: "Agence Teranga", countryCode: "221", phone: "77 123 45 67", email: "", address: "", city: "Dakar", country: "SN", taxId: "" };

afterEach(() => vi.restoreAllMocks());

describe("saveClient", () => {
  it("crée un client et revient à la liste", async () => {
    const repo = fakeRepo();
    expect(await saveClient(repo, null, form)).toEqual({ ok: true, redirectTo: "/app/clients?ok=ajoute" });
    expect(repo.create).toHaveBeenCalledWith({
      name: "Agence Teranga",
      phone: "+221771234567",
      email: null,
      address: null,
      city: "Dakar",
      country: "SN",
      tax_id: null,
    });
  });

  it("modifie un client existant", async () => {
    const repo = fakeRepo();
    expect(await saveClient(repo, "c1", form)).toEqual({ ok: true, redirectTo: "/app/clients?ok=modifie" });
    expect(repo.update).toHaveBeenCalledWith("c1", expect.objectContaining({ name: "Agence Teranga" }));
  });

  it("signale un client introuvable (archivé ou d’un autre compte)", async () => {
    const repo = fakeRepo({ update: vi.fn(async () => ({ error: null, found: false })) });
    expect(await saveClient(repo, "c1", form)).toEqual({ ok: false, message: "Client introuvable." });
  });

  it("renvoie les erreurs de champ sans écrire", async () => {
    const repo = fakeRepo();
    const state = await saveClient(repo, null, { ...form, name: "" });
    expect(state.fieldErrors?.name).toBe("Le nom est obligatoire");
    expect(repo.create).not.toHaveBeenCalled();
  });

  it("journalise une erreur de base", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const repo = fakeRepo({ create: vi.fn(async () => ({ error: { message: "boom" } })) });
    expect(await saveClient(repo, null, form)).toEqual({ ok: false, message: GENERIC_ERROR });
    expect(log).toHaveBeenCalled();
  });
});

describe("archiveClient", () => {
  it("archive et revient à la liste", async () => {
    expect(await archiveClient(fakeRepo(), "c1")).toEqual({ ok: true, redirectTo: "/app/clients?ok=archive" });
  });

  it("signale un client introuvable", async () => {
    const repo = fakeRepo({ archive: vi.fn(async () => ({ error: null, found: false })) });
    expect(await archiveClient(repo, "c1")).toEqual({ ok: false, message: "Client introuvable." });
  });
});

describe("clientToFormValues", () => {
  it("prépare les champs du formulaire", () => {
    expect(
      clientToFormValues(
        { id: "c1", name: "Teranga", phone: "+2250701020304", email: null, address: null, city: "Abidjan", country: "CI", tax_id: null },
        "221",
      ),
    ).toEqual({ name: "Teranga", countryCode: "225", phone: "0701020304", email: "", address: "", city: "Abidjan", country: "CI", taxId: "" });
    expect(clientToFormValues(null, "226")).toMatchObject({ name: "", countryCode: "226", phone: "" });
  });
});
