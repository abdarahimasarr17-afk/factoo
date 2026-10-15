// src/lib/invoice-form.test.ts
import { describe, expect, it } from "vitest";
import { invoiceToFormValues, publicInvoiceUrl } from "@/lib/invoice-form";

describe("invoiceToFormValues", () => {
  it("prépare un brouillon pour l’édition", () => {
    const v = invoiceToFormValues(
      { client_id: "c1", due_kind: "date", due_date: "2026-12-01", currency: "EUR", vat_rate: 19.25, discount_type: "amount", discount_value: 500, note: null },
      [{ position: 0, description: "Logo", quantity: 1.5, unit_price: 125050, line_total: 187575 }],
    );
    expect(v).toMatchObject({ clientId: "c1", dueKind: "date", dueDate: "2026-12-01", currency: "EUR", vatRate: "19,25", discountType: "amount", discountValue: "5", note: "" });
    expect(v.lines[0]).toMatchObject({ description: "Logo", quantity: "1,5", unitPrice: "1250,50" });
  });
});

describe("publicInvoiceUrl", () => {
  it("utilise l’URL du site", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://factoo-wine.vercel.app/";
    expect(publicInvoiceUrl("abc")).toBe("https://factoo-wine.vercel.app/f/abc");
  });
});
