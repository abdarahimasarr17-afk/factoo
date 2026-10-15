import type { DiscountType, DueKind, InvoiceLine, InvoiceRecord } from "@/lib/invoice-types";
import { minorToInput } from "@/lib/money";
import type { Currency } from "@/lib/site";

// Valeurs du formulaire de facture : module neutre, utilisable côté serveur et côté client.
export type LineValues = { key: string; description: string; quantity: string; unitPrice: string };

export type InvoiceFormValues = {
  clientId: string;
  dueKind: DueKind;
  dueDate: string;
  currency: Currency;
  vatRate: string;
  discountType: "" | DiscountType;
  discountValue: string;
  note: string;
  lines: LineValues[];
};

export function newLine(): LineValues {
  return { key: crypto.randomUUID(), description: "", quantity: "1", unitPrice: "" };
}

const decimal = (n: number) => String(n).replace(".", ",");

export function invoiceToFormValues(
  r: Pick<InvoiceRecord, "client_id" | "due_kind" | "due_date" | "currency" | "vat_rate" | "discount_type" | "discount_value" | "note">,
  lines: InvoiceLine[],
): InvoiceFormValues {
  return {
    clientId: r.client_id ?? "",
    dueKind: r.due_kind,
    dueDate: r.due_date ?? "",
    currency: r.currency,
    vatRate: decimal(r.vat_rate),
    discountType: r.discount_type ?? "",
    discountValue:
      r.discount_value === null ? "" : r.discount_type === "amount" ? minorToInput(r.discount_value, r.currency) : decimal(r.discount_value),
    note: r.note ?? "",
    lines: lines.length
      ? lines.map((l) => ({
          key: crypto.randomUUID(),
          description: l.description,
          quantity: decimal(l.quantity),
          unitPrice: minorToInput(l.unit_price, r.currency),
        }))
      : [newLine()],
  };
}

// L'URL du site configurée prime ; à défaut, l'origine de la requête en cours (jamais un lien relatif).
export function publicInvoiceUrl(token: string, requestOrigin: string): string {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || requestOrigin).replace(/\/$/, "");
  return `${base}/f/${token}`;
}
