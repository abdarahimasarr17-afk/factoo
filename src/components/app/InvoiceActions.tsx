// src/components/app/InvoiceActions.tsx
"use client";

import { Copy, Download, MessageCircle } from "lucide-react";
import { useActionState, useState } from "react";
import { MarkPaidDialog } from "@/components/app/MarkPaidDialog";
import { FormMessage } from "@/components/forms/Field";
import { buttonClass } from "@/components/ui/button";
import type { FormState } from "@/lib/form-state";
import type { InvoiceStatus } from "@/lib/invoice-types";

type Props = {
  status: InvoiceStatus;
  pdfUrl: string;
  publicUrl: string;
  whatsappUrl: string;
  today: string;
  issueDate: string;
  markPaid: (prev: FormState, formData: FormData) => Promise<FormState>;
  unmarkPaid: () => Promise<FormState>;
  cancel: () => Promise<FormState>;
};

function ConfirmButton({ action, label, confirm, danger }: { action: () => Promise<FormState>; label: string; confirm: string; danger?: boolean }) {
  const [state, formAction, pending] = useActionState(action, {} as FormState);
  return (
    <form action={formAction} onSubmit={(e) => { if (!window.confirm(confirm)) e.preventDefault(); }} className="grid gap-2">
      <FormMessage state={state} />
      <button type="submit" disabled={pending} className={danger ? "justify-self-start rounded-full px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60" : buttonClass("outline", "md")}>
        {pending ? "…" : label}
      </button>
    </form>
  );
}

export function InvoiceActions(p: Props) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(p.publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const live = p.status === "issued" || p.status === "paid";

  return (
    <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap gap-3">
        {live && (
          <a href={p.whatsappUrl} target="_blank" rel="noopener noreferrer" className={buttonClass("brand", "md")}>
            <MessageCircle className="h-4 w-4" aria-hidden="true" /> Envoyer par WhatsApp
          </a>
        )}
        <a href={p.pdfUrl} target="_blank" rel="noopener noreferrer" className={buttonClass("outline", "md")}>
          <Download className="h-4 w-4" aria-hidden="true" /> Télécharger le PDF
        </a>
        {live && (
          <button type="button" onClick={copy} className={buttonClass("outline", "md")}>
            <Copy className="h-4 w-4" aria-hidden="true" /> {copied ? "Lien copié ✓" : "Copier le lien"}
          </button>
        )}
      </div>
      {p.status === "issued" && (
        <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
          <MarkPaidDialog action={p.markPaid} today={p.today} minDate={p.issueDate} />
          <ConfirmButton action={p.cancel} danger label="Annuler la facture" confirm="Le numéro restera utilisé. Cette action est définitive. Annuler la facture ?" />
        </div>
      )}
      {p.status === "paid" && (
        <div className="border-t border-slate-100 pt-4">
          <ConfirmButton action={p.unmarkPaid} label="Annuler le paiement" confirm="La facture repassera « En attente ». Continuer ?" />
        </div>
      )}
    </div>
  );
}
