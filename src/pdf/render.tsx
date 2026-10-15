// src/pdf/render.tsx
import "server-only";
import { renderToBuffer } from "@react-pdf/renderer";
import sharp from "sharp";
import type { InvoiceView } from "@/lib/invoice-view";
import { logoUrl } from "@/lib/profile";
import { InvoiceDocument } from "@/pdf/InvoiceDocument";

// @react-pdf ne lit pas le WebP : on convertit le logo en PNG. Un logo illisible n'empêche pas le PDF.
async function loadLogo(path: string | null): Promise<Buffer | null> {
  const url = logoUrl(path);
  if (!url) return null;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    return await sharp(Buffer.from(await res.arrayBuffer())).png().toBuffer();
  } catch (error) {
    console.error("[pdf] logo :", error instanceof Error ? error.message : error);
    return null;
  }
}

export async function renderInvoicePdf(view: InvoiceView, opts: { draft: boolean }): Promise<Buffer> {
  const logo = await loadLogo(view.seller.logo_path);
  return renderToBuffer(<InvoiceDocument view={view} logo={logo} draft={opts.draft} />);
}

export function pdfResponse(buffer: Buffer, filename: string): Response {
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
