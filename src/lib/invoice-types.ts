// src/lib/invoice-types.ts
import type { CountryCode, Currency } from "@/lib/site";

export type InvoiceStatus = "draft" | "issued" | "paid" | "cancelled";
export type DueKind = "0" | "15" | "30" | "date";
export type PaymentMethod = "wave" | "orange_money" | "cash" | "transfer" | "other";
export type DiscountType = "percent" | "amount";

export const PAYMENT_METHODS: PaymentMethod[] = ["wave", "orange_money", "cash", "transfer", "other"];
export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  wave: "Wave",
  orange_money: "Orange Money",
  cash: "Espèces",
  transfer: "Virement",
  other: "Autre",
};

export const DUE_KINDS: DueKind[] = ["0", "15", "30", "date"];
export const DUE_KIND_LABELS: Record<DueKind, string> = {
  "0": "À réception",
  "15": "15 jours",
  "30": "30 jours",
  date: "Date précise",
};

export type SellerSnapshot = {
  company_name: string | null;
  address: string | null;
  city: string | null;
  country: CountryCode | null;
  phone: string | null;
  business_email: string | null;
  rccm: string | null;
  nif: string | null;
  logo_path: string | null;
  wave_number: string | null;
  orange_money_number: string | null;
  iban: string | null;
  payment_note: string | null;
};

export type BuyerSnapshot = {
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  country: CountryCode | null;
  tax_id: string | null;
};

export type InvoiceLine = {
  position: number;
  description: string;
  quantity: number;
  unit_price: number;
  line_total: number;
};

// Ligne de la table invoices telle que lue par l'application (bigint/numeric convertis en number).
export type InvoiceRecord = {
  id: string;
  client_id: string | null;
  status: InvoiceStatus;
  number: string | null;
  issue_date: string | null;
  due_kind: DueKind;
  due_date: string | null;
  currency: Currency;
  vat_rate: number;
  discount_type: DiscountType | null;
  discount_value: number | null;
  note: string | null;
  subtotal: number;
  discount_amount: number;
  vat_amount: number;
  total: number;
  seller: SellerSnapshot | null;
  buyer: BuyerSnapshot | null;
  public_token: string;
  paid_at: string | null;
  payment_method: PaymentMethod | null;
  updated_at: string;
};
