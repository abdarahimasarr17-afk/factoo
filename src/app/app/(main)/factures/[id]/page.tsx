// src/app/app/(main)/factures/[id]/page.tsx
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { InvoiceActions } from "@/components/app/InvoiceActions";
import { InvoiceForm } from "@/components/app/InvoiceForm";
import { InvoiceView } from "@/components/app/InvoiceView";
import { StatusBadge } from "@/components/app/StatusBadge";
import { buttonClass } from "@/components/ui/button";
import { invoiceToFormValues, publicInvoiceUrl } from "@/lib/invoice-form";
import { displayStatus, formatDateFr, todayInDakar } from "@/lib/invoice-status";
import { buildInvoiceView } from "@/lib/invoice-view";
import { INVOICE_ERRORS, INVOICE_FLASH } from "@/lib/invoices";
import { formatMoney } from "@/lib/money";
import { getInvoice, listClientOptions } from "@/lib/repos";
import { getSession } from "@/lib/session";
import { COUNTRIES } from "@/lib/site";
import { invoiceWhatsappLink, invoiceWhatsappMessage } from "@/lib/whatsapp";
import { cancelInvoiceAction, deleteDraftAction, markPaidAction, unmarkPaidAction } from "../actions";
import { DeleteDraftButton } from "./DeleteDraftButton";

export default async function InvoicePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; erreur?: string }> }) {
  const { id } = await params;
  const { ok, erreur } = await searchParams;
  const { supabase, profile } = await getSession();
  const data = await getInvoice(supabase, id);
  if (!data) notFound();
  const { record, lines, client } = data;
  const today = todayInDakar();
  const view = buildInvoiceView(record, lines, { profile, client });
  const flash = ok ? INVOICE_FLASH[ok]?.replace("{numero}", record.number ?? "") : undefined;
  const error = erreur ? (INVOICE_ERRORS[erreur] ?? "Un souci technique, réessayez.") : undefined;
  const banner = (flash || error) && (
    <p role={error ? "alert" : "status"} className={error ? "rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700" : "rounded-xl bg-green-50 px-4 py-3 text-sm font-medium text-green-800"}>
      {error ?? flash}
    </p>
  );

  if (record.status === "draft") {
    const clients = await listClientOptions(supabase);
    const dial = COUNTRIES.find((c) => c.code === profile.country)?.dial || "221";
    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="flex items-center gap-3 text-2xl font-extrabold sm:text-3xl">Brouillon <StatusBadge status="draft" /></h1>
          <a href={`/app/factures/${id}/pdf`} target="_blank" rel="noopener noreferrer" className={buttonClass("outline", "sm")}>Aperçu PDF</a>
        </div>
        {banner}
        <InvoiceForm invoiceId={id} initial={invoiceToFormValues(record, lines)} clients={clients} today={today} defaultDial={dial} />
        <DeleteDraftButton action={deleteDraftAction.bind(null, id)} />
      </div>
    );
  }

  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("x-forwarded-host") ?? h.get("host")}`;
  const url = publicInvoiceUrl(record.public_token, origin);
  const message = invoiceWhatsappMessage({
    clientName: view.buyer?.name ?? "",
    number: record.number as string,
    total: formatMoney(record.total, record.currency),
    dueDate: record.due_kind === "0" || !record.due_date ? null : formatDateFr(record.due_date),
    url,
    companyName: view.seller.company_name ?? "",
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="flex items-center gap-3 text-2xl font-extrabold sm:text-3xl">
          {record.number} <StatusBadge status={displayStatus(record, today)} />
        </h1>
        <Link href="/app/factures" className="text-sm font-semibold text-slate-500 hover:text-slate-800">← Toutes les factures</Link>
      </div>
      {banner}
      <InvoiceActions
        status={record.status}
        pdfUrl={`/app/factures/${id}/pdf`}
        publicUrl={url}
        whatsappUrl={invoiceWhatsappLink(view.buyer?.phone ?? null, message)}
        today={today}
        issueDate={record.issue_date as string}
        markPaid={markPaidAction.bind(null, id)}
        unmarkPaid={unmarkPaidAction.bind(null, id)}
        cancel={cancelInvoiceAction.bind(null, id)}
      />
      <InvoiceView view={view} today={today} />
    </div>
  );
}
