import { cn } from "@/lib/cn";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-light disabled:cursor-not-allowed disabled:opacity-60";

const variants = {
  dark: "bg-foreground text-background hover:opacity-90",
  primary: "bg-primary text-white hover:opacity-90",
  light: "bg-white text-hero hover:bg-white/90",
  ghost: "border border-white/20 text-white hover:bg-white/10",
  outline: "border border-border text-foreground hover:bg-foreground/5",
} as const;

const sizes = {
  sm: "h-10 px-4 text-sm",
  md: "h-12 px-6 text-base",
} as const;

export function buttonClass(
  variant: keyof typeof variants = "primary",
  size: keyof typeof sizes = "md",
  extra?: string,
): string {
  return cn(base, variants[variant], sizes[size], extra);
}
