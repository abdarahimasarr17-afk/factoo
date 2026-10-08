"use client";

import { FileText, LayoutDashboard, Settings, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const ITEMS = [
  { href: "/app", label: "Tableau de bord", short: "Accueil", icon: LayoutDashboard, exact: true },
  { href: null, label: "Factures", short: "Factures", icon: FileText, exact: false },
  { href: "/app/clients", label: "Clients", short: "Clients", icon: Users, exact: false },
  { href: "/app/parametres", label: "Paramètres", short: "Réglages", icon: Settings, exact: false },
];

export function NavLinks({ variant }: { variant: "side" | "bottom" }) {
  const pathname = usePathname();
  const side = variant === "side";

  return (
    <ul className={side ? "mt-8 grid gap-1" : "grid grid-cols-4"}>
      {ITEMS.map(({ href, label, short, icon: Icon, exact }) => {
        const active = href !== null && (exact ? pathname === href : pathname.startsWith(href));
        const content = (
          <>
            <Icon className="h-5 w-5" aria-hidden="true" />
            <span className={side ? "" : "text-[11px]"}>{side ? label : short}</span>
            {href === null && (
              <span className={cn("rounded-full bg-white/10 px-1.5 text-[10px] font-bold uppercase", !side && "sr-only")}>
                Bientôt
              </span>
            )}
          </>
        );
        const base = side
          ? "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold"
          : "flex flex-col items-center gap-1 py-2 font-semibold";
        return (
          <li key={label}>
            {href === null ? (
              <span aria-disabled="true" className={cn(base, "cursor-not-allowed text-white/35")}>
                {content}
              </span>
            ) : (
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(base, active ? "bg-white/10 text-[#00C853]" : "text-white/75 hover:bg-white/5 hover:text-white")}
              >
                {content}
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}
