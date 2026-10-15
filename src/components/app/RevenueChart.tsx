"use client";

import { useState } from "react";
import type { MonthBar } from "@/lib/dashboard";
import { formatMoney } from "@/lib/money";
import type { Currency } from "@/lib/site";

const W = 600;
const H = 160;
const GAP = 24;
const RADIUS = 4;

// Barre arrondie en haut uniquement, posée sur la ligne de base.
function barPath(x: number, w: number, h: number): string {
  const r = Math.min(RADIUS, h, w / 2);
  const top = H - h;
  return `M${x},${H}V${top + r}Q${x},${top} ${x + r},${top}H${x + w - r}Q${x + w},${top} ${x + w},${top + r}V${H}Z`;
}

export function RevenueChart({ months, currency }: { months: MonthBar[]; currency: Currency }) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(...months.map((m) => m.amount), 1);
  const barW = (W - GAP * (months.length - 1)) / months.length;
  const shown = active ?? months.length - 1;

  return (
    <figure className="rounded-2xl border border-slate-200 bg-white p-5">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="font-bold">Encaissé sur 6 mois</span>
        <span className="text-sm text-slate-500" aria-live="polite">
          {months[shown].label} : <span className="font-bold text-slate-900">{formatMoney(months[shown].amount, currency)}</span>
        </span>
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H + 28}`} className="mt-4 w-full" aria-hidden="true" onMouseLeave={() => setActive(null)}>
        <line x1={0} x2={W} y1={H} y2={H} stroke="#e2e8f0" strokeWidth={1} />
        {months.map((m, i) => {
          const x = i * (barW + GAP);
          const h = m.amount === 0 ? 0 : Math.max((m.amount / max) * (H - 8), 3);
          const on = shown === i;
          return (
            <g key={m.month} onMouseEnter={() => setActive(i)} onClick={() => setActive(i)} className="cursor-pointer">
              {/* Zone de survol plus large que la barre. */}
              <rect x={x - GAP / 2} y={0} width={barW + GAP} height={H + 28} fill="transparent" />
              {h > 0 && <path d={barPath(x, barW, h)} fill="#0F766E" opacity={on ? 1 : 0.45} />}
              <text x={x + barW / 2} y={H + 20} textAnchor="middle" fontSize={14} fill={on ? "#0f172a" : "#64748b"} fontWeight={on ? 700 : 400}>
                {m.label}
              </text>
            </g>
          );
        })}
      </svg>
      <table className="sr-only">
        <caption>Montant encaissé par mois</caption>
        <tbody>
          {months.map((m) => (
            <tr key={m.month}>
              <th scope="row">{m.label}</th>
              <td>{formatMoney(m.amount, currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
