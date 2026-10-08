import { useState, type ChangeEvent } from "react";

type Element = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

// Champs contrôlés : React 19 réinitialise les champs non contrôlés après une action de formulaire.
export function useFormValues<T extends Record<string, string>>(initial: T) {
  const [values, setValues] = useState<T>(initial);
  const bind = (name: keyof T & string) => ({
    name,
    value: values[name],
    onChange: (event: ChangeEvent<Element>) => setValues((current) => ({ ...current, [name]: event.target.value })),
  });
  return { values, setValues, bind };
}
