import { cn } from "@/lib/cn";

type Props = {
  eyebrow: string;
  title: string;
  subtitle?: string;
  align?: "center" | "left";
  light?: boolean;
};

export function SectionHeading({ eyebrow, title, subtitle, align = "center", light = false }: Props) {
  return (
    <div className={cn("max-w-2xl", align === "center" && "mx-auto text-center")}>
      <p className={cn("text-sm font-bold uppercase tracking-widest", light ? "text-primary-light" : "text-primary")}>
        {eyebrow}
      </p>
      <h2
        className={cn(
          "mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl",
          light ? "text-white" : "text-foreground",
        )}
      >
        {title}
      </h2>
      {subtitle && <p className={cn("mt-4 text-lg", light ? "text-white/70" : "text-muted")}>{subtitle}</p>}
    </div>
  );
}
