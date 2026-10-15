// src/components/app/InvoiceLines.tsx
"use client";

import { Plus, Trash2 } from "lucide-react";
import { inputClass } from "@/components/forms/Field";
import { cn } from "@/lib/cn";
import { newLine, type LineValues } from "@/lib/invoice-form";


type Props = {
  lines: LineValues[];
  onChange: (lines: LineValues[]) => void;
  errors: Record<string, string | undefined>;
  priceLabel: string;
};

export function InvoiceLines({ lines, onChange, errors, priceLabel }: Props) {
  const update = (index: number, patch: Partial<LineValues>) =>
    onChange(lines.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  const remove = (index: number) => onChange(lines.length === 1 ? [newLine()] : lines.filter((_, i) => i !== index));

  return (
    <fieldset className="grid gap-3">
      <legend className="mb-1.5 text-sm font-semibold text-slate-700">Lignes</legend>
      <div className="hidden grid-cols-[1fr_6rem_9rem_2.5rem] gap-2 px-1 text-xs font-semibold uppercase text-slate-500 md:grid">
        <span>Désignation</span><span>Qté</span><span>{priceLabel}</span><span />
      </div>
      {lines.map((line, i) => {
        const err = (f: string) => errors[`lines.${i}.${f}`];
        return (
          <div key={line.key} className="grid gap-2 rounded-xl border border-slate-200 p-3 md:grid-cols-[1fr_6rem_9rem_2.5rem] md:border-0 md:p-0">
            <div>
              <label className="text-xs font-semibold text-slate-500 md:sr-only" htmlFor={`d-${line.key}`}>Désignation</label>
              <input id={`d-${line.key}`} name={`lines.${i}.description`} value={line.description} maxLength={300}
                onChange={(e) => update(i, { description: e.target.value })} aria-invalid={Boolean(err("description"))}
                className={inputClass} placeholder="Ex. Création de logo" />
              {err("description") && <p className="mt-1 text-sm text-red-600">{err("description")}</p>}
            </div>
            <div className="grid grid-cols-[1fr_1fr_auto] gap-2 md:contents">
              <div>
                <label className="text-xs font-semibold text-slate-500 md:sr-only" htmlFor={`q-${line.key}`}>Quantité</label>
                <input id={`q-${line.key}`} name={`lines.${i}.quantity`} inputMode="decimal" value={line.quantity}
                  onChange={(e) => update(i, { quantity: e.target.value })} aria-invalid={Boolean(err("quantity"))} className={inputClass} />
                {err("quantity") && <p className="mt-1 text-sm text-red-600">{err("quantity")}</p>}
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 md:sr-only" htmlFor={`p-${line.key}`}>{priceLabel}</label>
                <input id={`p-${line.key}`} name={`lines.${i}.unitPrice`} inputMode="decimal" value={line.unitPrice}
                  onChange={(e) => update(i, { unitPrice: e.target.value })} aria-invalid={Boolean(err("unitPrice"))} className={inputClass} />
                {err("unitPrice") && <p className="mt-1 text-sm text-red-600">{err("unitPrice")}</p>}
              </div>
              <button type="button" onClick={() => remove(i)} aria-label={`Supprimer la ligne ${i + 1}`}
                className={cn("mt-5 flex h-12 w-10 items-center justify-center rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-600 md:mt-0")}>
                <Trash2 className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          </div>
        );
      })}
      {errors.lines && <p className="text-sm text-red-600">{errors.lines}</p>}
      {lines.length < 50 && (
        <button type="button" onClick={() => onChange([...lines, newLine()])} className="flex items-center gap-2 justify-self-start rounded-full px-3 py-2 text-sm font-semibold text-[#0F766E] hover:bg-teal-50">
          <Plus className="h-4 w-4" aria-hidden="true" /> Ajouter une ligne
        </button>
      )}
    </fieldset>
  );
}
