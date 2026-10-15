// src/components/app/InvoiceForm.tsx
"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { saveInvoiceAction } from "@/app/app/(main)/factures/actions";
import { ClientPicker } from "@/components/app/ClientPicker";
import { InvoiceLines } from "@/components/app/InvoiceLines";
import { InvoiceTotals } from "@/components/app/InvoiceTotals";
import { Field, FormMessage, inputClass } from "@/components/forms/Field";
import { buttonClass } from "@/components/ui/button";
import type { FormState } from "@/lib/form-state";
import type { InvoiceFormValues } from "@/lib/invoice-form";
import { computeTotals } from "@/lib/invoice-totals";
import { DUE_KIND_LABELS, DUE_KINDS, type DiscountType, type DueKind } from "@/lib/invoice-types";
import { parseAmount } from "@/lib/money";
import { CURRENCIES, CURRENCY_LABELS, type Currency } from "@/lib/site";


type Props = {
  invoiceId: string | null;
  initial: InvoiceFormValues;
  clients: { id: string; name: string; phone: string | null }[];
  today: string;
  defaultDial: string;
};

const num = (s: string) => Number(s.replace(/\s/g, "").replace(",", "."));

export function InvoiceForm({ invoiceId, initial, clients, today, defaultDial }: Props) {
  const [state, action, pending] = useActionState(saveInvoiceAction.bind(null, invoiceId), {} as FormState);
  const [v, setV] = useState(initial);
  const set = <K extends keyof InvoiceFormValues>(key: K, value: InvoiceFormValues[K]) => setV((cur) => ({ ...cur, [key]: value }));
  const errors = (state.fieldErrors ?? {}) as Record<string, string | undefined>;
  const vatRate = Number.isFinite(num(v.vatRate)) ? num(v.vatRate) : 0;

  // Même fonction que le serveur ; les valeurs illisibles comptent pour 0 pendant la saisie.
  const totals = useMemo(() => {
    const lines = v.lines.map((l) => ({
      quantity: Number.isFinite(num(l.quantity)) && num(l.quantity) > 0 ? num(l.quantity) : 0,
      unitPrice: parseAmount(l.unitPrice, v.currency) ?? 0,
    }));
    const discount =
      v.discountType === "percent" && num(v.discountValue) > 0 ? { type: "percent" as const, value: Math.min(num(v.discountValue), 100) }
      : v.discountType === "amount" && (parseAmount(v.discountValue, v.currency) ?? 0) > 0 ? { type: "amount" as const, value: parseAmount(v.discountValue, v.currency) ?? 0 }
      : null;
    return computeTotals(lines, discount, vatRate);
  }, [v, vatRate]);

  const discountLabel = v.discountType === "percent" && v.discountValue ? `${v.discountValue} %` : null;

  return (
    <form action={action} noValidate className="grid gap-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <FormMessage state={state} />
      <ClientPicker value={v.clientId} onChange={(id) => set("clientId", id)} clients={clients} error={errors.clientId} defaultDial={defaultDial} />

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <p className="mb-1.5 text-sm font-semibold text-slate-700">Date d’émission</p>
          <p className="flex h-12 items-center rounded-xl bg-slate-50 px-4 text-slate-600">Aujourd’hui (fixée à l’émission)</p>
        </div>
        <Field id="dueKind" label="Échéance" error={errors.dueKind ?? errors.dueDate}>
          <div className="grid gap-2">
            <select id="dueKind" name="dueKind" value={v.dueKind} onChange={(e) => set("dueKind", e.target.value as DueKind)} aria-describedby="dueKind-msg" className={inputClass}>
              {DUE_KINDS.map((k) => <option key={k} value={k}>{DUE_KIND_LABELS[k]}</option>)}
            </select>
            {v.dueKind === "date" && (
              <input type="date" name="dueDate" min={today} value={v.dueDate} onChange={(e) => set("dueDate", e.target.value)} aria-label="Date d’échéance" aria-invalid={Boolean(errors.dueDate)} className={inputClass} />
            )}
          </div>
        </Field>
      </div>

      <InvoiceLines lines={v.lines} onChange={(lines) => set("lines", lines)} errors={errors} priceLabel={v.currency === "EUR" ? "Prix HT (€)" : "Prix HT (FCFA)"} />

      <details className="rounded-xl border border-slate-200 p-4" open={Boolean(v.discountType)}>
        <summary className="cursor-pointer text-sm font-semibold text-slate-700">Remise (facultative)</summary>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <select name="discountType" value={v.discountType} onChange={(e) => set("discountType", e.target.value as "" | DiscountType)} aria-label="Type de remise" className={inputClass}>
            <option value="">Aucune remise</option>
            <option value="percent">En pourcentage (%)</option>
            <option value="amount">En montant</option>
          </select>
          {v.discountType && (
            <Field id="discountValue" label={v.discountType === "percent" ? "Remise (%)" : "Montant de la remise"} error={errors.discountValue}>
              <input id="discountValue" name="discountValue" inputMode="decimal" value={v.discountValue} onChange={(e) => set("discountValue", e.target.value)} aria-describedby="discountValue-msg" aria-invalid={Boolean(errors.discountValue)} className={inputClass} />
            </Field>
          )}
        </div>
      </details>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="currency" label="Devise" error={errors.currency}>
          <select id="currency" name="currency" value={v.currency} onChange={(e) => set("currency", e.target.value as Currency)} aria-describedby="currency-msg" className={inputClass}>
            {CURRENCIES.map((c) => <option key={c} value={c}>{CURRENCY_LABELS[c]}</option>)}
          </select>
        </Field>
        <Field id="vatRate" label="TVA (%)" hint="0 % = TVA non applicable" error={errors.vatRate}>
          <input id="vatRate" name="vatRate" inputMode="decimal" value={v.vatRate} onChange={(e) => set("vatRate", e.target.value)} aria-describedby="vatRate-msg" aria-invalid={Boolean(errors.vatRate)} className={inputClass} />
        </Field>
      </div>

      <Field id="note" label="Note" optional hint="Ex. « Merci pour votre confiance »." error={errors.note}>
        <textarea id="note" name="note" rows={2} maxLength={500} value={v.note} onChange={(e) => set("note", e.target.value)} aria-describedby="note-msg" className={`${inputClass} h-auto py-3`} />
      </Field>

      <InvoiceTotals totals={totals} currency={v.currency} vatRate={vatRate} discountLabel={discountLabel} />

      <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
        <Link href="/app/factures" className={buttonClass("outline", "md")}>Annuler</Link>
        <button type="submit" name="intent" value="draft" disabled={pending} className={buttonClass("outline", "md")}>
          Enregistrer le brouillon
        </button>
        <button
          type="submit" name="intent" value="issue" disabled={pending} className={buttonClass("brand", "md")}
          onClick={(e) => { if (!window.confirm("Une fois émise, la facture ne pourra plus être modifiée. Émettre maintenant ?")) e.preventDefault(); }}
        >
          {pending ? "Enregistrement…" : "Émettre la facture"}
        </button>
      </div>
    </form>
  );
}
