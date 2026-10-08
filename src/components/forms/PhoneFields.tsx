import { Field, inputClass } from "@/components/forms/Field";
import { cn } from "@/lib/cn";

type Bound = { name: string; value: string; onChange: React.ChangeEventHandler<HTMLInputElement> };

type Props = {
  id: string;
  label?: string;
  code: Bound;
  phone: Bound;
  codeError?: string;
  phoneError?: string;
  optional?: boolean;
};

export function PhoneFields({ id, label = "Téléphone", code, phone, codeError, phoneError, optional }: Props) {
  return (
    <Field id={id} label={label} optional={optional} error={phoneError ?? codeError} hint="Numéro WhatsApp de préférence">
      <div className="flex gap-2">
        <div className="relative w-24 shrink-0">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">+</span>
          <input
            aria-label="Indicatif pays"
            inputMode="numeric"
            aria-invalid={Boolean(codeError)}
            className={cn(inputClass, "pl-6")}
            {...code}
          />
        </div>
        <input
          id={id}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          placeholder="77 123 45 67"
          aria-invalid={Boolean(phoneError)}
          aria-describedby={`${id}-msg`}
          className={inputClass}
          {...phone}
        />
      </div>
    </Field>
  );
}
