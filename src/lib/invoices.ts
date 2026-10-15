// src/lib/invoices.ts
import type { DbResult } from "@/lib/db";
import { GENERIC_ERROR, type FormState } from "@/lib/form-state";
import { computeTotals } from "@/lib/invoice-totals";
import type { DiscountType, DueKind, PaymentMethod } from "@/lib/invoice-types";
import { MAX_TOTAL } from "@/lib/money";
import type { Currency } from "@/lib/site";
import { parseInvoice, parseMarkPaid } from "@/lib/validation";

export type DraftPayload = {
  client_id: string | null;
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
};

export type LinePayload = { position: number; description: string; quantity: number; unit_price: number; line_total: number };

export interface InvoicesRepo {
  saveDraft(id: string | null, data: DraftPayload, lines: LinePayload[]): Promise<DbResult & { id?: string }>;
  copyLogo(invoiceId: string): Promise<string | null>;
  issue(id: string, logoPath: string | null): Promise<DbResult & { number?: string }>;
  markPaid(id: string, paidAt: string, method: PaymentMethod): Promise<DbResult>;
  unmarkPaid(id: string): Promise<DbResult>;
  cancel(id: string): Promise<DbResult>;
  deleteDraft(id: string): Promise<DbResult & { found: boolean }>;
}

export const INVOICE_FLASH: Record<string, string> = {
  brouillon: "Brouillon enregistré ✓",
  emise: "Facture {numero} émise ✓",
  payee: "Facture marquée comme payée ✓",
  impayee: "Paiement annulé.",
  annulee: "Facture annulée.",
  supprime: "Brouillon supprimé.",
};

const NOT_POSSIBLE = "Cette action n’est plus possible sur cette facture.";

export const INVOICE_ERRORS: Record<string, string> = {
  not_found: "Facture introuvable.",
  not_draft: "Cette facture a déjà été émise.",
  not_editable: "Cette facture a déjà été émise.",
  no_client: "Choisissez un client avant d’émettre la facture.",
  client_not_found: "Ce client n’existe plus. Choisissez-en un autre.",
  client_archived: "Ce client a été archivé. Choisissez-en un autre.",
  no_lines: "Ajoutez au moins une ligne.",
  due_date_past: "L’échéance ne peut pas être dans le passé.",
  not_issued: NOT_POSSIBLE,
  not_paid: NOT_POSSIBLE,
};

const PAID_AT_ERROR = "La date de paiement doit être entre la date d’émission et aujourd’hui.";

function known(error: { message: string }): string | undefined {
  return INVOICE_ERRORS[error.message];
}

function dbFail(where: string, error: { message: string }): FormState {
  console.error(`[factures] ${where} :`, error.message);
  return { ok: false, message: GENERIC_ERROR };
}

const detail = (id: string) => `/app/factures/${id}`;

export async function saveInvoice(
  repo: InvoicesRepo,
  id: string | null,
  raw: Record<string, unknown>,
  opts: { issue: boolean; today: string },
): Promise<FormState> {
  const parsed = parseInvoice(raw, opts.today);
  if (!parsed.success) return { ok: false, fieldErrors: parsed.fieldErrors };
  const input = parsed.data;
  if (opts.issue && !input.client_id) return { ok: false, fieldErrors: { clientId: INVOICE_ERRORS.no_client } };

  const totals = computeTotals(
    input.lines.map((l) => ({ quantity: l.quantity, unitPrice: l.unit_price })),
    input.discount,
    input.vat_rate,
  );
  if (input.discount?.type === "amount" && input.discount.value > totals.subtotal) {
    return { ok: false, fieldErrors: { discountValue: "La remise ne peut pas dépasser le total HT." } };
  }
  if (totals.total > MAX_TOTAL) return { ok: false, fieldErrors: { lines: "Montant total trop élevé." } };

  const data: DraftPayload = {
    client_id: input.client_id,
    due_kind: input.due_kind,
    due_date: input.due_date,
    currency: input.currency,
    vat_rate: input.vat_rate,
    discount_type: input.discount?.type ?? null,
    discount_value: input.discount?.value ?? null,
    note: input.note,
    subtotal: totals.subtotal,
    discount_amount: totals.discountAmount,
    vat_amount: totals.vatAmount,
    total: totals.total,
  };
  const lines: LinePayload[] = input.lines.map((l, position) => ({ position, ...l, line_total: totals.lineTotals[position] }));

  const saved = await repo.saveDraft(id, data, lines);
  if (saved.error) {
    const message = known(saved.error);
    if (!message) return dbFail("enregistrement", saved.error);
    if (saved.error.message === "client_not_found") return { ok: false, fieldErrors: { clientId: message } };
    return { ok: false, message, redirectTo: id ? detail(id) : undefined };
  }
  const invoiceId = saved.id ?? id;
  if (!invoiceId) return dbFail("enregistrement", { message: "identifiant manquant" });
  if (!opts.issue) return { ok: true, redirectTo: `${detail(invoiceId)}?ok=brouillon` };

  const logoPath = await repo.copyLogo(invoiceId);
  const issued = await repo.issue(invoiceId, logoPath);
  if (issued.error) {
    const message = known(issued.error);
    if (!message) {
      console.error("[factures] émission :", issued.error.message);
      return { ok: false, message: GENERIC_ERROR, redirectTo: `${detail(invoiceId)}?erreur=technique` };
    }
    return { ok: false, message, redirectTo: `${detail(invoiceId)}?erreur=${issued.error.message}` };
  }
  return { ok: true, redirectTo: `${detail(invoiceId)}?ok=emise` };
}

async function transition(result: Promise<DbResult>, id: string, flash: string, where: string): Promise<FormState> {
  const { error } = await result;
  if (error) {
    const message = known(error);
    if (!message) return dbFail(where, error);
    return { ok: false, message, redirectTo: detail(id) };
  }
  return { ok: true, redirectTo: `${detail(id)}?ok=${flash}` };
}

export async function markInvoicePaid(repo: InvoicesRepo, id: string, raw: Record<string, unknown>, today: string): Promise<FormState> {
  const parsed = parseMarkPaid(raw, today);
  if (!parsed.success) return { ok: false, fieldErrors: parsed.fieldErrors };
  const { error } = await repo.markPaid(id, parsed.data.paid_at, parsed.data.payment_method);
  if (error?.message === "paid_at_invalid") return { ok: false, fieldErrors: { paidAt: PAID_AT_ERROR } };
  if (error) return transition(Promise.resolve({ error }), id, "payee", "paiement");
  return { ok: true, redirectTo: `${detail(id)}?ok=payee` };
}

export function unmarkInvoicePaid(repo: InvoicesRepo, id: string): Promise<FormState> {
  return transition(repo.unmarkPaid(id), id, "impayee", "annulation du paiement");
}

export function cancelInvoice(repo: InvoicesRepo, id: string): Promise<FormState> {
  return transition(repo.cancel(id), id, "annulee", "annulation");
}

export async function deleteDraft(repo: InvoicesRepo, id: string): Promise<FormState> {
  const { error, found } = await repo.deleteDraft(id);
  if (error) return dbFail("suppression", error);
  if (!found) return { ok: false, message: NOT_POSSIBLE, redirectTo: detail(id) };
  return { ok: true, redirectTo: "/app/factures?ok=supprime" };
}
