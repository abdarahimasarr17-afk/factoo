import Image from "next/image";
import { cn } from "@/lib/cn";
import { PAYMENT_METHODS } from "@/lib/site";

export function PaymentBadges({ className }: { className?: string }) {
  return (
    <ul className={cn("flex flex-wrap gap-2", className)} aria-label="Moyens de paiement acceptés">
      {PAYMENT_METHODS.map((method) => (
        <li
          key={method.name}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm font-semibold text-foreground"
        >
          {method.logo ? (
            <Image src={method.logo} alt="" width={20} height={20} className="h-5 w-5 rounded-md" />
          ) : (
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: method.color }} aria-hidden="true" />
          )}
          {method.name}
        </li>
      ))}
    </ul>
  );
}
