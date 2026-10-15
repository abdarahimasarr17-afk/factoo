// src/components/app/InvoiceTotals.tsx
import type { Totals } from "@/lib/invoice-totals";
import { formatMoney } from "@/lib/money";
import type { Currency } from "@/lib/site";

export function InvoiceTotals({ totals, currency, vatRate, discountLabel }: { totals: Totals; currency: Currency; vatRate: number; discountLabel: string | null }) {
  const row = "flex justify-between gap-4 py-1";
  return (
    <dl className="ml-auto grid w-full max-w-sm text-sm">
      <div className={row}><dt className="text-slate-500">Total HT</dt><dd>{formatMoney(totals.subtotal, currency)}</dd></div>
      {totals.discountAmount > 0 && (
        <>
          <div className={row}><dt className="text-slate-500">Remise{discountLabel ? ` (${discountLabel})` : ""}</dt><dd>-{formatMoney(totals.discountAmount, currency)}</dd></div>
          <div className={row}><dt className="text-slate-500">Total HT après remise</dt><dd>{formatMoney(totals.net, currency)}</dd></div>
        </>
      )}
      <div className={row}>
        <dt className="text-slate-500">{vatRate === 0 ? "TVA non applicable" : `TVA (${String(vatRate).replace(".", ",")} %)`}</dt>
        <dd>{vatRate === 0 ? "—" : formatMoney(totals.vatAmount, currency)}</dd>
      </div>
      <div className={`${row} mt-1 border-t border-slate-200 pt-2 text-base font-extrabold`}><dt>Total TTC</dt><dd>{formatMoney(totals.total, currency)}</dd></div>
    </dl>
  );
}
