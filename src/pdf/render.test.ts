// src/pdf/render.test.ts
import { describe, expect, it } from "vitest";
import type { InvoiceView } from "@/lib/invoice-view";
import { renderInvoicePdf } from "@/pdf/render";

const view: InvoiceView = {
  id: "inv1", status: "issued", number: "FAC-2026-0001", issueDate: "2026-10-15", dueKind: "30", dueDate: "2026-11-14",
  currency: "XOF", vatRate: 18, discountType: null, discountValue: null, note: "Merci pour votre confiance",
  subtotal: 150000, discountAmount: 0, vatAmount: 27000, total: 177000,
  lines: Array.from({ length: 40 }, (_, i) => ({ position: i, description: `Prestation n° ${i + 1} — conception`, quantity: 1, unit_price: 3750, line_total: 3750 })),
  seller: { company_name: "COSENDIGITAL", address: "Rue 10", city: "Dakar", country: "SN", phone: "+221771234567", business_email: "contact@cosen.sn", rccm: "SN-DKR-1", nif: "123", logo_path: null, wave_number: "+221770000000", orange_money_number: null, iban: null, payment_note: "Paiement à 30 jours" },
  buyer: { name: "Awa Couture", phone: "+221781112233", email: null, address: null, city: "Thiès", country: "SN", tax_id: null },
  paidAt: null, paymentMethod: null, publicToken: "tok",
};

describe("renderInvoicePdf", () => {
  it("produit un PDF multi-pages", async () => {
    const pdf = await renderInvoicePdf(view, { draft: false });
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pdf.length).toBeGreaterThan(2000);
  }, 20000);
  it("brouillon avec filigrane et facture TVA 0 %", async () => {
    const pdf = await renderInvoicePdf({ ...view, status: "draft", number: null, vatRate: 0, vatAmount: 0, total: 150000 }, { draft: true });
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
  }, 20000);
});
