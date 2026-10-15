// src/lib/invoice-view.ts
import type {
  BuyerSnapshot, DiscountType, DueKind, InvoiceLine, InvoiceRecord, InvoiceStatus, PaymentMethod, SellerSnapshot,
} from "@/lib/invoice-types";
import type { Profile } from "@/lib/profile";
import type { Currency } from "@/lib/site";

export type InvoiceView = {
  id: string;
  status: InvoiceStatus;
  number: string | null;
  issueDate: string | null;
  dueKind: DueKind;
  dueDate: string | null;
  currency: Currency;
  vatRate: number;
  discountType: DiscountType | null;
  discountValue: number | null;
  note: string | null;
  subtotal: number;
  discountAmount: number;
  vatAmount: number;
  total: number;
  lines: InvoiceLine[];
  seller: SellerSnapshot;
  buyer: BuyerSnapshot | null;
  paidAt: string | null;
  paymentMethod: PaymentMethod | null;
  publicToken: string;
};

// Même liste de champs que l'instantané construit par issue_invoice() (005_invoices.sql).
export function sellerFromProfile(p: Profile): SellerSnapshot {
  return {
    company_name: p.company_name, address: p.address, city: p.city, country: p.country, phone: p.phone,
    business_email: p.business_email, rccm: p.rccm, nif: p.nif, logo_path: p.logo_path, wave_number: p.wave_number,
    orange_money_number: p.orange_money_number, iban: p.iban, payment_note: p.payment_note,
  };
}

export function buildInvoiceView(
  inv: InvoiceRecord,
  lines: InvoiceLine[],
  live: { profile: Profile; client: BuyerSnapshot | null } | null,
): InvoiceView {
  const frozen = inv.status !== "draft" && inv.seller !== null;
  const seller = frozen ? (inv.seller as SellerSnapshot) : live ? sellerFromProfile(live.profile) : (inv.seller as SellerSnapshot);
  const buyer = frozen ? inv.buyer : (live?.client ?? null);
  return {
    id: inv.id, status: inv.status, number: inv.number, issueDate: inv.issue_date, dueKind: inv.due_kind, dueDate: inv.due_date,
    currency: inv.currency, vatRate: inv.vat_rate, discountType: inv.discount_type, discountValue: inv.discount_value,
    note: inv.note, subtotal: inv.subtotal, discountAmount: inv.discount_amount, vatAmount: inv.vat_amount, total: inv.total,
    lines: [...lines].sort((a, b) => a.position - b.position), seller, buyer, paidAt: inv.paid_at,
    paymentMethod: inv.payment_method, publicToken: inv.public_token,
  };
}
