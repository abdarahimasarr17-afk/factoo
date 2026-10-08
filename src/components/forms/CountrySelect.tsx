import type { SelectHTMLAttributes } from "react";
import { inputClass } from "@/components/forms/Field";
import { COUNTRIES } from "@/lib/site";

type Props = SelectHTMLAttributes<HTMLSelectElement> & { id: string; invalid?: boolean; placeholder?: string };

export function CountrySelect({ id, invalid, placeholder = "Choisissez un pays", ...props }: Props) {
  return (
    <select id={id} aria-invalid={invalid} aria-describedby={`${id}-msg`} className={inputClass} {...props}>
      <option value="">{placeholder}</option>
      {COUNTRIES.map((country) => (
        <option key={country.code} value={country.code}>
          {country.name}
        </option>
      ))}
    </select>
  );
}
