// src/app/f/[token]/pdf/route.ts
import { buildInvoiceView } from "@/lib/invoice-view";
import { getPublicInvoice } from "@/lib/repos";
import { pdfResponse, renderInvoicePdf } from "@/pdf/render";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const data = await getPublicInvoice(token);
  if (!data) return new Response("Facture introuvable", { status: 404 });
  try {
    const pdf = await renderInvoicePdf(buildInvoiceView(data.record, data.lines, null), { draft: false });
    return pdfResponse(pdf, `${data.record.number}.pdf`);
  } catch (error) {
    console.error("[pdf] public :", error instanceof Error ? error.message : error);
    return new Response("Le PDF n’a pas pu être généré, réessayez.", { status: 500, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }
}
