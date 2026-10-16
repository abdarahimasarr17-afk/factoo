"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const SECTIONS: Record<string, string> = { factures: "Factures", clients: "Clients", parametres: "Paramètres" };
const PAGES: Record<string, string> = { nouvelle: "Nouvelle facture", nouveau: "Nouveau client" };

// « Accueil / Factures / Nouvelle facture » d'après l'URL.
function crumbs(pathname: string): { label: string; href?: string }[] {
  const [, , section, page] = pathname.split("/");
  if (!section) return [{ label: "Accueil", href: "/app" }, { label: "Tableau de bord" }];
  const list: { label: string; href?: string }[] = [{ label: "Accueil", href: "/app" }];
  const sectionLabel = SECTIONS[section] ?? section;
  if (!page) return [...list, { label: sectionLabel }];
  list.push({ label: sectionLabel, href: `/app/${section}` });
  list.push({ label: PAGES[page] ?? (section === "factures" ? "Facture" : "Fiche client") });
  return list;
}

export function Breadcrumb() {
  const items = crumbs(usePathname());
  return (
    <nav aria-label="Fil d’Ariane" className="min-w-0">
      <ol className="flex items-center gap-1.5 truncate text-sm">
        {items.map((item, i) => (
          <li key={item.label} className="flex items-center gap-1.5 truncate">
            {i > 0 && <span className="text-slate-300">/</span>}
            {item.href ? (
              <Link href={item.href} className="text-slate-400 hover:text-slate-700">
                {item.label}
              </Link>
            ) : (
              <span aria-current="page" className="truncate text-slate-700">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
