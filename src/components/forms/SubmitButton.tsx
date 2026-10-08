"use client";

import { useFormStatus } from "react-dom";
import { buttonClass } from "@/components/ui/button";

type Props = {
  children: React.ReactNode;
  pendingLabel?: string;
  variant?: "brand" | "outline";
  className?: string;
};

export function SubmitButton({ children, pendingLabel = "Enregistrement…", variant = "brand", className }: Props) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={buttonClass(variant, "md", className)}>
      {pending ? pendingLabel : children}
    </button>
  );
}
