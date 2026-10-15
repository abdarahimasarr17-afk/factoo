// src/app/f/[token]/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { InvoiceView } from "@/components/app/InvoiceView";
import { buttonClass } from "@/components/ui/button";
import { Logo } from "@/components/ui/Logo";
import { formatDateFr, todayInDakar, displayStatus } from "@/lib/invoice-status";
import { buildInvoiceView } from "@/lib/invoice-view";
import { formatMoney } from "@/lib/money";
import { getPublicInvoice } from "@/lib/repos";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Facture", robots: { index: false, follow: false } };

export default async function PublicInvoicePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const data = await getPublicInvoice(token);
  if (!data) notFound();
  const view = buildInvoiceView(data.record, data.lines, null);
  const today = todayInDakar();
  const status = displayStatus({ status: view.status, due_date: view.dueDate }, today);

  return (
    <div className="min-h-screen bg-[#F8FAFC] px-4 py-8 text-slate-900">
      <main className="mx-auto grid max-w-3xl gap-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">{view.seller.company_name} vous a envoyé une facture</p>
          <p className="mt-1 text-2xl font-extrabold">{formatMoney(view.total, view.currency)}</p>
          <p className="mt-1 text-sm font-semibold text-slate-600">
            {status === "pending" && (view.dueKind === "0" ? "À régler à réception" : `À régler avant le ${formatDateFr(view.dueDate as string)}`)}
            {status === "overdue" && <span className="text-red-700">En retard depuis le {formatDateFr(view.dueDate as string)}</span>}
            {status === "paid" && <span className="text-green-700">Payée le {formatDateFr(view.paidAt as string)}</span>}
            {status === "cancelled" && "Facture annulée"}
          </p>
          <a href={`/f/${token}/pdf`} className={buttonClass("brand", "md", "mt-4 w-full sm:w-auto")}>Télécharger le PDF</a>
        </div>
        <InvoiceView view={view} today={today} />
        <Link href="/" className="mx-auto flex items-center gap-2 text-xs text-slate-400">
          Facture créée avec <Logo className="text-sm text-slate-500 [&_svg]:h-5 [&_svg]:w-5" />
        </Link>
      </main>
    </div>
  );
}
