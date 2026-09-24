import { cn } from "@/lib/cn";

export function Logo({ light = false, className }: { light?: boolean; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 text-xl font-extrabold tracking-tight",
        light ? "text-white" : "text-foreground",
        className,
      )}
    >
      <svg viewBox="0 0 32 32" className="h-8 w-8" aria-hidden="true">
        <rect width="32" height="32" rx="9" fill="#0F766E" />
        <path d="M11 7h7l5 5v13H11z" fill="#FFFFFF" />
        <path d="M18 7v5h5" fill="#CCFBF1" />
        <path
          d="M14 18.5l2.5 2.5 4.5-4.5"
          fill="none"
          stroke="#0F766E"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      Factoo
    </span>
  );
}
