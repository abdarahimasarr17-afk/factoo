"use client";

import { FileText, LayoutDashboard, Settings, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

type Item = { href: string; label: string; short: string; icon: typeof FileText; exact: boolean };

const GROUPS: { title: string; items: Item[] }[] = [
  {
    title: "Général",
    items: [
      { href: "/app", label: "Tableau de bord", short: "Accueil", icon: LayoutDashboard, exact: true },
      { href: "/app/factures", label: "Factures", short: "Factures", icon: FileText, exact: false },
      { href: "/app/clients", label: "Clients", short: "Clients", icon: Users, exact: false },
    ],
  },
  {
    title: "Compte",
    items: [{ href: "/app/parametres", label: "Paramètres", short: "Réglages", icon: Settings, exact: false }],
  },
];

const isActive = (pathname: string, { href, exact }: Item) => (exact ? pathname === href : pathname.startsWith(href));

export function NavLinks({ variant }: { variant: "side" | "bottom" }) {
  const pathname = usePathname();

  if (variant === "bottom") {
    return (
      <ul className="grid grid-cols-4">
        {GROUPS.flatMap((g) => g.items).map((item) => {
          const active = isActive(pathname, item);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-1 py-2 text-[11px] font-semibold",
                  active ? "text-slate-900" : "text-slate-400 hover:text-slate-700",
                )}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                {item.short}
              </Link>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <div className="grid gap-8">
      {GROUPS.map((group) => (
        <div key={group.title}>
          <p className="px-6 text-xs font-medium uppercase tracking-wide text-slate-400">{group.title}</p>
          <ul className="mt-3 grid gap-1">
            {group.items.map((item) => {
              const active = isActive(pathname, item);
              const Icon = item.icon;
              return (
                <li key={item.href} className="relative">
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 px-6 py-2.5 text-[15px]",
                      active ? "font-semibold text-slate-900" : "text-slate-500 hover:text-slate-900",
                    )}
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                    {item.label}
                  </Link>
                  {active && <span aria-hidden="true" className="absolute inset-y-1 right-0 w-0.5 rounded-full bg-slate-900" />}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
