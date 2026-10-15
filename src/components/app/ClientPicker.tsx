// src/components/app/ClientPicker.tsx
"use client";

import { Plus } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { quickCreateClientAction } from "@/app/app/(main)/clients/actions";
import { Field, inputClass } from "@/components/forms/Field";
import { PhoneFields } from "@/components/forms/PhoneFields";
import { buttonClass } from "@/components/ui/button";

type Option = { id: string; name: string; phone: string | null };

type Props = {
  value: string;
  onChange: (id: string) => void;
  clients: Option[];
  error?: string;
  defaultDial: string;
};

export function ClientPicker({ value, onChange, clients, error, defaultDial }: Props) {
  const [options, setOptions] = useState(clients);
  const dialog = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState({ name: "", countryCode: defaultDial, phone: "" });
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [pending, start] = useTransition();

  const create = () =>
    start(async () => {
      const fd = new FormData();
      Object.entries(draft).forEach(([k, v]) => fd.set(k, v));
      const result = await quickCreateClientAction(fd);
      if (!result.ok) {
        setErrors({ ...(result.fieldErrors ?? {}), form: result.message });
        return;
      }
      setOptions((list) => [...list, { ...result.client, phone: null }].sort((a, b) => a.name.localeCompare(b.name, "fr")));
      onChange(result.client.id);
      setDraft({ name: "", countryCode: defaultDial, phone: "" });
      setErrors({});
      dialog.current?.close();
    });

  return (
    <div>
      <Field id="clientId" label="Client" error={error}>
        <div className="flex gap-2">
          <select
            id="clientId"
            name="clientId"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            aria-invalid={Boolean(error)}
            aria-describedby="clientId-msg"
            className={inputClass}
          >
            <option value="">Choisir un client…</option>
            {options.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button type="button" onClick={() => dialog.current?.showModal()} className={buttonClass("outline", "md", "shrink-0 px-4")} aria-label="Nouveau client">
            <Plus className="h-5 w-5" aria-hidden="true" />
            <span className="hidden sm:inline">Nouveau</span>
          </button>
        </div>
      </Field>

      <dialog ref={dialog} className="w-[min(28rem,calc(100vw-2rem))] rounded-2xl p-0 backdrop:bg-black/40">
        <div className="grid gap-4 p-5">
          <h2 className="text-lg font-bold">Nouveau client</h2>
          {errors.form && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{errors.form}</p>}
          <Field id="quickName" label="Nom ou raison sociale" error={errors.name}>
            <input id="quickName" aria-describedby="quickName-msg" className={inputClass} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </Field>
          <PhoneFields
            id="quickPhone"
            optional
            code={{ name: "countryCode", value: draft.countryCode, onChange: (e) => setDraft({ ...draft, countryCode: e.target.value }) }}
            phone={{ name: "phone", value: draft.phone, onChange: (e) => setDraft({ ...draft, phone: e.target.value }) }}
            codeError={errors.countryCode}
            phoneError={errors.phone}
          />
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => dialog.current?.close()} className={buttonClass("outline", "md")}>Annuler</button>
            <button type="button" onClick={create} disabled={pending} className={buttonClass("brand", "md")}>
              {pending ? "Création…" : "Ajouter"}
            </button>
          </div>
        </div>
      </dialog>
    </div>
  );
}
