// src/components/app/InvoiceView.tsx
import { amountInWords } from "@/lib/amount-words";
import { displayStatus, formatDateFr } from "@/lib/invoice-status";
import { PAYMENT_METHOD_LABELS } from "@/lib/invoice-types";
import type { InvoiceView as View } from "@/lib/invoice-view";
import { formatMoney } from "@/lib/money";
import { formatPhone } from "@/lib/phone";
import { logoUrl } from "@/lib/profile";
import { COUNTRIES } from "@/lib/site";

const countryName = (code: string | null) => COUNTRIES.find((c) => c.code === code && c.code !== "OTHER")?.name ?? "";
const join = (...parts: (string | null | undefined)[]) => parts.filter(Boolean).join(", ");

export function InvoiceView({ view, today }: { view: View; today: string }) {
  const s = view.seller;
  const b = view.buyer;
  const status = displayStatus({ status: view.status, due_date: view.dueDate }, today);
  const logo = logoUrl(s.logo_path);
  const money = (n: number) => formatMoney(n, view.currency);
  const payment = [
    s.wave_number && `Wave : ${formatPhone(s.wave_number)}`,
    s.orange_money_number && `Orange Money : ${formatPhone(s.orange_money_number)}`,
    s.iban && `IBAN : ${s.iban}`,
    s.payment_note,
  ].filter(Boolean) as string[];

  return (
    <article className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 text-sm sm:p-8">
      {status === "paid" && <p className="mb-4 rounded-xl bg-green-50 px-4 py-3 font-semibold text-green-800">Payée le {formatDateFr(view.paidAt as string)}{view.paymentMethod ? ` par ${PAYMENT_METHOD_LABELS[view.paymentMethod]}` : ""}</p>}
      {status === "cancelled" && <p className="mb-4 rounded-xl bg-slate-100 px-4 py-3 font-semibold text-slate-600">Facture annulée</p>}
      {status === "overdue" && <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 font-semibold text-red-700">En retard depuis le {formatDateFr(view.dueDate as string)}</p>}

      <header className="flex flex-col gap-6 sm:flex-row sm:justify-between">
        <div className="space-y-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {logo && <img src={logo} alt="" className="mb-3 h-14 w-auto max-w-[10rem] object-contain" />}
          <p className="text-base font-extrabold">{s.company_name ?? "—"}</p>
          <p className="text-slate-600">{join(s.address, s.city, countryName(s.country))}</p>
          <p className="text-slate-600">{join(formatPhone(s.phone), s.business_email)}</p>
          <p className="text-slate-500">{join(s.rccm && `RCCM : ${s.rccm}`, s.nif && `NIF/NINEA : ${s.nif}`)}</p>
        </div>
        <div className="sm:text-right">
          <p className="text-2xl font-extrabold tracking-wide text-[#0F766E]">FACTURE</p>
          <p className="font-bold">{view.number ?? "Brouillon"}</p>
          {view.issueDate && <p className="text-slate-600">Émise le {formatDateFr(view.issueDate)}</p>}
          <p className="text-slate-600">
            Échéance : {view.dueKind === "0" ? "À réception" : view.dueDate ? formatDateFr(view.dueDate) : `${view.dueKind} jours`}
          </p>
        </div>
      </header>

      <section className="mt-6 rounded-xl bg-slate-50 p-4">
        <p className="text-xs font-bold uppercase text-slate-500">Facturé à</p>
        {b ? (
          <>
            <p className="font-bold">{b.name}</p>
            <p className="text-slate-600">{join(b.address, b.city, countryName(b.country))}</p>
            <p className="text-slate-600">{join(formatPhone(b.phone), b.email)}</p>
            {b.tax_id && <p className="text-slate-500">Identifiant fiscal : {b.tax_id}</p>}
          </>
        ) : (
          <p className="text-slate-500">Aucun client choisi</p>
        )}
      </section>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[30rem] text-left">
          <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
            <tr><th className="py-2 font-semibold">Désignation</th><th className="py-2 text-right font-semibold">Qté</th><th className="py-2 text-right font-semibold">Prix unitaire HT</th><th className="py-2 text-right font-semibold">Total HT</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {view.lines.map((l) => (
              <tr key={l.position}>
                <td className="py-2 pr-3">{l.description}</td>
                <td className="py-2 text-right">{String(l.quantity).replace(".", ",")}</td>
                <td className="py-2 text-right whitespace-nowrap">{money(l.unit_price)}</td>
                <td className="py-2 text-right whitespace-nowrap">{money(l.line_total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <dl className="ml-auto mt-4 grid max-w-sm gap-1">
        <div className="flex justify-between"><dt className="text-slate-500">Total HT</dt><dd>{money(view.subtotal)}</dd></div>
        {view.discountAmount > 0 && (
          <>
            <div className="flex justify-between"><dt className="text-slate-500">Remise{view.discountType === "percent" ? ` (${String(view.discountValue).replace(".", ",")} %)` : ""}</dt><dd>-{money(view.discountAmount)}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Total HT après remise</dt><dd>{money(view.subtotal - view.discountAmount)}</dd></div>
          </>
        )}
        {view.vatRate === 0 ? (
          <div className="flex justify-between"><dt className="text-slate-500">TVA non applicable</dt><dd>—</dd></div>
        ) : (
          <div className="flex justify-between"><dt className="text-slate-500">TVA ({String(view.vatRate).replace(".", ",")} %)</dt><dd>{money(view.vatAmount)}</dd></div>
        )}
        <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-extrabold"><dt>Total TTC</dt><dd>{money(view.total)}</dd></div>
      </dl>

      <p className="mt-6 italic text-slate-600">Arrêtée la présente facture à la somme de {amountInWords(view.total, view.currency)}.</p>
      {view.note && <p className="mt-4 text-slate-700">{view.note}</p>}
      {payment.length > 0 && (
        <section className="mt-6 border-t border-slate-100 pt-4">
          <p className="text-xs font-bold uppercase text-slate-500">Paiement</p>
          <ul className="mt-1 space-y-0.5 text-slate-700">{payment.map((p) => <li key={p}>{p}</li>)}</ul>
        </section>
      )}
    </article>
  );
}
