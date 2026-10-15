// src/lib/invoices.test.ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { GENERIC_ERROR } from "@/lib/form-state";
import { cancelInvoice, deleteDraft, markInvoicePaid, saveInvoice, unmarkInvoicePaid, type InvoicesRepo } from "@/lib/invoices";

function fakeRepo(over: Partial<InvoicesRepo> = {}): InvoicesRepo {
  return {
    saveDraft: vi.fn(async () => ({ error: null, id: "inv1" })),
    copyLogo: vi.fn(async () => "u1/factures/inv1.webp"),
    issue: vi.fn(async () => ({ error: null, number: "FAC-2026-0001" })),
    markPaid: vi.fn(async () => ({ error: null })),
    unmarkPaid: vi.fn(async () => ({ error: null })),
    cancel: vi.fn(async () => ({ error: null })),
    deleteDraft: vi.fn(async () => ({ error: null, found: true })),
    ...over,
  };
}

const today = "2026-10-15";
const form = {
  clientId: "8f1c2f9e-3b1a-4c6e-9d2a-1a2b3c4d5e6f", dueKind: "30", dueDate: "", currency: "XOF", vatRate: "18",
  discountType: "", discountValue: "", note: "",
  "lines.0.description": "Logo", "lines.0.quantity": "2", "lines.0.unitPrice": "50000",
};

afterEach(() => vi.restoreAllMocks());

describe("saveInvoice", () => {
  it("enregistre un brouillon avec totaux calculés côté serveur", async () => {
    const repo = fakeRepo();
    expect(await saveInvoice(repo, null, form, { issue: false, today })).toEqual({ ok: true, redirectTo: "/app/factures/inv1?ok=brouillon" });
    expect(repo.saveDraft).toHaveBeenCalledWith(
      null,
      {
        client_id: form.clientId, due_kind: "30", due_date: null, currency: "XOF", vat_rate: 18, discount_type: null,
        discount_value: null, note: null, subtotal: 100000, discount_amount: 0, vat_amount: 18000, total: 118000,
      },
      [{ position: 0, description: "Logo", quantity: 2, unit_price: 50000, line_total: 100000 }],
    );
    expect(repo.issue).not.toHaveBeenCalled();
  });

  it("émet : enregistre, copie le logo puis attribue le numéro", async () => {
    const repo = fakeRepo();
    expect(await saveInvoice(repo, "inv1", form, { issue: true, today })).toEqual({ ok: true, redirectTo: "/app/factures/inv1?ok=emise" });
    expect(repo.saveDraft).toHaveBeenCalledWith("inv1", expect.anything(), expect.anything());
    expect(repo.issue).toHaveBeenCalledWith("inv1", "u1/factures/inv1.webp");
  });

  it("refuse l’émission sans client, sans rien écrire", async () => {
    const repo = fakeRepo();
    const state = await saveInvoice(repo, null, { ...form, clientId: "" }, { issue: true, today });
    expect(state.fieldErrors?.clientId).toBe("Choisissez un client avant d’émettre la facture.");
    expect(repo.saveDraft).not.toHaveBeenCalled();
  });

  it("refuse une remise supérieure au total HT", async () => {
    const state = await saveInvoice(fakeRepo(), null, { ...form, discountType: "amount", discountValue: "200000" }, { issue: false, today });
    expect(state.fieldErrors?.discountValue).toBe("La remise ne peut pas dépasser le total HT.");
  });

  it("traduit un refus d’émission et ramène sur le brouillon créé", async () => {
    const repo = fakeRepo({ issue: vi.fn(async () => ({ error: { message: "client_archived" } })) });
    expect(await saveInvoice(repo, null, form, { issue: true, today })).toEqual({
      ok: false, message: "Ce client a été archivé. Choisissez-en un autre.", redirectTo: "/app/factures/inv1?erreur=client_archived",
    });
  });

  it("brouillon devenu non modifiable", async () => {
    const repo = fakeRepo({ saveDraft: vi.fn(async () => ({ error: { message: "not_editable" } })) });
    expect(await saveInvoice(repo, "inv1", form, { issue: false, today })).toEqual({ ok: false, message: "Cette facture a déjà été émise.", redirectTo: "/app/factures/inv1" });
  });

  it("erreur inattendue journalisée", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const repo = fakeRepo({ saveDraft: vi.fn(async () => ({ error: { message: "boom" } })) });
    expect(await saveInvoice(repo, null, form, { issue: false, today })).toEqual({ ok: false, message: GENERIC_ERROR });
    expect(log).toHaveBeenCalled();
  });
});

describe("transitions", () => {
  it("marque payée", async () => {
    const repo = fakeRepo();
    expect(await markInvoicePaid(repo, "inv1", { paidAt: today, method: "wave" }, today)).toEqual({ ok: true, redirectTo: "/app/factures/inv1?ok=payee" });
    expect(repo.markPaid).toHaveBeenCalledWith("inv1", today, "wave");
  });
  it("date de paiement refusée par la base", async () => {
    const repo = fakeRepo({ markPaid: vi.fn(async () => ({ error: { message: "paid_at_invalid" } })) });
    expect(await markInvoicePaid(repo, "inv1", { paidAt: today, method: "cash" }, today)).toEqual({
      ok: false, fieldErrors: { paidAt: "La date de paiement doit être entre la date d’émission et aujourd’hui." },
    });
  });
  it("annule le paiement, annule la facture, supprime le brouillon", async () => {
    expect(await unmarkInvoicePaid(fakeRepo(), "inv1")).toEqual({ ok: true, redirectTo: "/app/factures/inv1?ok=impayee" });
    expect(await cancelInvoice(fakeRepo(), "inv1")).toEqual({ ok: true, redirectTo: "/app/factures/inv1?ok=annulee" });
    expect(await deleteDraft(fakeRepo(), "inv1")).toEqual({ ok: true, redirectTo: "/app/factures?ok=supprime" });
  });
  it("action devenue impossible", async () => {
    const repo = fakeRepo({ cancel: vi.fn(async () => ({ error: { message: "not_issued" } })) });
    expect(await cancelInvoice(repo, "inv1")).toEqual({ ok: false, message: "Cette action n’est plus possible sur cette facture.", redirectTo: "/app/factures/inv1" });
  });
});
