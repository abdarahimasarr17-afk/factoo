// src/app/app/(main)/factures/[id]/pdf/route.ts
import { buildInvoiceView } from "@/lib/invoice-view";
import { getInvoice } from "@/lib/repos";
import { getSession } from "@/lib/session";
import { pdfResponse, renderInvoicePdf } from "@/pdf/render";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, profile } = await getSession();
  const data = await getInvoice(supabase, id);
  if (!data) return new Response("Facture introuvable", { status: 404 });
  try {
    const view = buildInvoiceView(data.record, data.lines, { profile, client: data.client });
    const draft = data.record.status === "draft";
    const pdf = await renderInvoicePdf(view, { draft });
    return pdfResponse(pdf, draft ? "brouillon.pdf" : `${data.record.number}.pdf`);
  } catch (error) {
    console.error("[pdf] génération :", error instanceof Error ? error.message : error);
    return new Response("Le PDF n’a pas pu être généré, réessayez.", { status: 500, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }
}
