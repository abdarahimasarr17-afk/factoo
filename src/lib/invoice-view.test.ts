// src/lib/invoice-view.test.ts
import { describe, expect, it } from "vitest";
import type { InvoiceRecord } from "@/lib/invoice-types";
import { buildInvoiceView, sellerFromProfile } from "@/lib/invoice-view";
import type { Profile } from "@/lib/profile";

const profile: Profile = {
  id: "u1", full_name: null, company_name: "COSENDIGITAL", address: "Rue 10", city: "Dakar", country: "SN", phone: "+221771234567",
  business_email: null, rccm: "SN-DKR-1", nif: "123", logo_path: "u1/logo-1.webp", currency: "XOF", vat_rate: 18,
  onboarded_at: "2026-10-15", wave_number: "+221770000000", orange_money_number: null, iban: null, payment_note: null, default_due_days: 30,
};
const record: InvoiceRecord = {
  id: "inv1", client_id: "c1", status: "draft", number: null, issue_date: null, due_kind: "30", due_date: null, currency: "XOF",
  vat_rate: 18, discount_type: null, discount_value: null, note: null, subtotal: 1000, discount_amount: 0, vat_amount: 180, total: 1180,
  seller: null, buyer: null, public_token: "tok", paid_at: null, payment_method: null, updated_at: "2026-10-15T10:00:00Z",
};
const client = { name: "Awa", phone: null, email: null, address: null, city: null, country: null, tax_id: null };

describe("buildInvoiceView", () => {
  it("brouillon : données vivantes du profil et du client", () => {
    const v = buildInvoiceView(record, [], { profile, client });
    expect(v.seller).toEqual(sellerFromProfile(profile));
    expect(v.seller.wave_number).toBe("+221770000000");
    expect(v.buyer).toEqual(client);
  });
  it("facture émise : uniquement l’instantané", () => {
    const seller = { ...sellerFromProfile(profile), company_name: "Ancien nom" };
    const v = buildInvoiceView({ ...record, status: "issued", number: "FAC-2026-0001", seller, buyer: client }, [], { profile, client: null });
    expect(v.seller.company_name).toBe("Ancien nom");
    expect(v.buyer).toEqual(client);
  });
});
