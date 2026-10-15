// src/pdf/InvoiceDocument.tsx
import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { amountInWords } from "@/lib/amount-words";
import { formatDateFr } from "@/lib/invoice-status";
import { PAYMENT_METHOD_LABELS } from "@/lib/invoice-types";
import type { InvoiceView } from "@/lib/invoice-view";
import { formatMoney } from "@/lib/money";
import { formatPhone } from "@/lib/phone";
import { COUNTRIES } from "@/lib/site";

const TEAL = "#0F766E";
const s = StyleSheet.create({
  page: { padding: 40, paddingBottom: 60, fontSize: 9.5, fontFamily: "Helvetica", color: "#0f172a" },
  row: { flexDirection: "row" },
  between: { flexDirection: "row", justifyContent: "space-between" },
  muted: { color: "#475569" },
  bold: { fontFamily: "Helvetica-Bold" },
  title: { fontSize: 22, fontFamily: "Helvetica-Bold", color: TEAL, textAlign: "right" },
  box: { marginTop: 18, padding: 10, backgroundColor: "#f1f5f9", borderRadius: 4 },
  label: { fontSize: 7.5, color: "#64748b", fontFamily: "Helvetica-Bold", textTransform: "uppercase", marginBottom: 3 },
  th: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: TEAL, paddingVertical: 5, marginTop: 18, fontFamily: "Helvetica-Bold", color: TEAL, fontSize: 8 },
  tr: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#e2e8f0", paddingVertical: 5 },
  cDesc: { flex: 1, paddingRight: 8 },
  cQty: { width: 40, textAlign: "right" },
  cPrice: { width: 85, textAlign: "right" },
  cTotal: { width: 85, textAlign: "right" },
  totals: { marginTop: 10, marginLeft: "auto", width: 230 },
  totalLine: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
  grand: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: "#0f172a", marginTop: 4, paddingTop: 5, fontFamily: "Helvetica-Bold", fontSize: 11 },
  footer: { position: "absolute", bottom: 25, left: 40, right: 40, flexDirection: "row", justifyContent: "space-between", fontSize: 7.5, color: "#94a3b8" },
  stamp: { position: "absolute", top: 300, left: 120, fontSize: 64, fontFamily: "Helvetica-Bold", opacity: 0.15, transform: "rotate(-30deg)" },
});

const countryName = (code: string | null) => COUNTRIES.find((c) => c.code === code && c.code !== "OTHER")?.name ?? "";
const join = (...parts: (string | null | undefined)[]) => parts.filter(Boolean).join(", ");
const dec = (n: number) => String(n).replace(".", ",");

export function InvoiceDocument({ view, logo, draft }: { view: InvoiceView; logo: Buffer | null; draft: boolean }) {
  const money = (n: number) => formatMoney(n, view.currency);
  const sel = view.seller;
  const b = view.buyer;
  const payment = [
    sel.wave_number && `Wave : ${formatPhone(sel.wave_number)}`,
    sel.orange_money_number && `Orange Money : ${formatPhone(sel.orange_money_number)}`,
    sel.iban && `IBAN : ${sel.iban}`,
    sel.payment_note,
  ].filter(Boolean) as string[];
  const stamp = draft ? { text: "BROUILLON", color: "#64748b" } : view.status === "paid" ? { text: "PAYÉE", color: "#15803d" } : view.status === "cancelled" ? { text: "ANNULÉE", color: "#b91c1c" } : null;

  return (
    <Document title={view.number ?? "Brouillon"} author={sel.company_name ?? "Factoo"} creator="Factoo" producer="Factoo">
      <Page size="A4" style={s.page}>
        {stamp && <Text fixed style={[s.stamp, { color: stamp.color }]}>{stamp.text}</Text>}

        <View style={s.between}>
          <View style={{ maxWidth: 270 }}>
            {/* Image @react-pdf : pas d’attribut alt dans un PDF. */}
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            {logo && <Image src={logo} style={{ height: 50, maxWidth: 160, objectFit: "contain", marginBottom: 8 }} />}
            <Text style={[s.bold, { fontSize: 12 }]}>{sel.company_name ?? ""}</Text>
            <Text style={s.muted}>{join(sel.address, sel.city, countryName(sel.country))}</Text>
            <Text style={s.muted}>{join(formatPhone(sel.phone), sel.business_email)}</Text>
            <Text style={s.muted}>{join(sel.rccm && `RCCM : ${sel.rccm}`, sel.nif && `NIF/NINEA : ${sel.nif}`)}</Text>
          </View>
          <View>
            <Text style={s.title}>FACTURE</Text>
            <Text style={[s.bold, { textAlign: "right", fontSize: 11 }]}>{view.number ?? "Brouillon"}</Text>
            {view.issueDate && <Text style={[s.muted, { textAlign: "right" }]}>Date : {formatDateFr(view.issueDate)}</Text>}
            <Text style={[s.muted, { textAlign: "right" }]}>
              Échéance : {view.dueKind === "0" ? "À réception" : view.dueDate ? formatDateFr(view.dueDate) : `${view.dueKind} jours`}
            </Text>
          </View>
        </View>

        <View style={s.box}>
          <Text style={s.label}>Facturé à</Text>
          {b ? (
            <>
              <Text style={s.bold}>{b.name}</Text>
              {join(b.address, b.city, countryName(b.country)) !== "" && <Text style={s.muted}>{join(b.address, b.city, countryName(b.country))}</Text>}
              {join(formatPhone(b.phone), b.email) !== "" && <Text style={s.muted}>{join(formatPhone(b.phone), b.email)}</Text>}
              {b.tax_id && <Text style={s.muted}>Identifiant fiscal : {b.tax_id}</Text>}
            </>
          ) : (
            <Text style={s.muted}>Aucun client choisi</Text>
          )}
        </View>

        <View style={s.th} fixed>
          <Text style={s.cDesc}>DÉSIGNATION</Text><Text style={s.cQty}>QTÉ</Text><Text style={s.cPrice}>PRIX UNIT. HT</Text><Text style={s.cTotal}>TOTAL HT</Text>
        </View>
        {view.lines.map((l) => (
          <View key={l.position} style={s.tr} wrap={false}>
            <Text style={s.cDesc}>{l.description}</Text>
            <Text style={s.cQty}>{dec(l.quantity)}</Text>
            <Text style={s.cPrice}>{money(l.unit_price)}</Text>
            <Text style={s.cTotal}>{money(l.line_total)}</Text>
          </View>
        ))}

        <View style={s.totals} wrap={false}>
          <View style={s.totalLine}><Text style={s.muted}>Total HT</Text><Text>{money(view.subtotal)}</Text></View>
          {view.discountAmount > 0 && (
            <>
              <View style={s.totalLine}><Text style={s.muted}>Remise{view.discountType === "percent" ? ` (${dec(view.discountValue ?? 0)} %)` : ""}</Text><Text>-{money(view.discountAmount)}</Text></View>
              <View style={s.totalLine}><Text style={s.muted}>Total HT après remise</Text><Text>{money(view.subtotal - view.discountAmount)}</Text></View>
            </>
          )}
          {view.vatRate === 0 ? (
            <View style={s.totalLine}><Text style={s.muted}>TVA non applicable</Text><Text>—</Text></View>
          ) : (
            <View style={s.totalLine}><Text style={s.muted}>TVA ({dec(view.vatRate)} %)</Text><Text>{money(view.vatAmount)}</Text></View>
          )}
          <View style={s.grand}><Text>Total TTC</Text><Text>{money(view.total)}</Text></View>
        </View>

        <View wrap={false} style={{ marginTop: 16 }}>
          <Text style={{ fontFamily: "Helvetica-Oblique" }}>Arrêtée la présente facture à la somme de {amountInWords(view.total, view.currency)}.</Text>
          {view.note && <Text style={{ marginTop: 8 }}>{view.note}</Text>}
          {view.status === "paid" && view.paidAt && (
            <Text style={{ marginTop: 8, color: "#15803d" }}>Payée le {formatDateFr(view.paidAt)}{view.paymentMethod ? ` par ${PAYMENT_METHOD_LABELS[view.paymentMethod]}` : ""}.</Text>
          )}
        </View>

        {payment.length > 0 && (
          <View wrap={false} style={[s.box, { backgroundColor: "#f0fdfa" }]}>
            <Text style={[s.label, { color: TEAL }]}>Paiement</Text>
            {payment.map((p) => <Text key={p}>{p}</Text>)}
          </View>
        )}

        <View style={s.footer} fixed>
          <Text>Facture créée avec Factoo</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber}/${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
