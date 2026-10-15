// src/app/app/(main)/factures/nouvelle/page.tsx
import { InvoiceForm } from "@/components/app/InvoiceForm";
import { newLine } from "@/lib/invoice-form";
import { todayInDakar } from "@/lib/invoice-status";
import type { DueKind } from "@/lib/invoice-types";
import { listClientOptions } from "@/lib/repos";
import { getSession } from "@/lib/session";
import { COUNTRIES } from "@/lib/site";

export default async function NewInvoicePage({ searchParams }: { searchParams: Promise<{ client?: string }> }) {
  const { client } = await searchParams;
  const { supabase, profile } = await getSession();
  const clients = await listClientOptions(supabase);
  const dial = COUNTRIES.find((c) => c.code === profile.country)?.dial || "221";

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-extrabold sm:text-3xl">Nouvelle facture</h1>
      <InvoiceForm
        invoiceId={null}
        today={todayInDakar()}
        defaultDial={dial}
        clients={clients}
        initial={{
          clientId: clients.some((c) => c.id === client) ? (client as string) : "",
          dueKind: String(profile.default_due_days) as DueKind,
          dueDate: "",
          currency: profile.currency,
          vatRate: String(profile.vat_rate).replace(".", ","),
          discountType: "",
          discountValue: "",
          note: "",
          lines: [newLine()],
        }}
      />
    </div>
  );
}
