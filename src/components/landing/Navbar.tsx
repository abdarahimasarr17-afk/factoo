"use client";

import { Menu, X } from "lucide-react";
import { useState } from "react";
import { buttonClass } from "@/components/ui/button";
import { Logo } from "@/components/ui/Logo";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

const LINKS = [
  { href: "#fonctionnalites", label: "Fonctionnalités" },
  { href: "#comment", label: "Comment ça marche" },
  { href: "#tarifs", label: "Tarifs" },
  { href: "#faq", label: "FAQ" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-4 pt-3">
      <nav
        aria-label="Navigation principale"
        className="mx-auto max-w-6xl rounded-3xl border border-border bg-card/85 px-4 py-2 shadow-lg backdrop-blur-md"
      >
        <div className="flex items-center justify-between gap-4">
          <a href="#top" aria-label="Factoo — retour en haut">
            <Logo />
          </a>
          <ul className="hidden items-center gap-6 lg:flex">
            {LINKS.map((link) => (
              <li key={link.href}>
                <a href={link.href} className="text-sm font-medium text-muted transition hover:text-foreground">
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <div className="hidden sm:block">
              <a href="#waitlist" className={buttonClass("dark", "sm")}>
                Rejoindre la liste d’attente
              </a>
            </div>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls="menu-mobile"
              aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border text-foreground lg:hidden"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
        {open && (
          <div id="menu-mobile" className="border-t border-border pb-2 pt-3 lg:hidden">
            <ul className="grid gap-1">
              {LINKS.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    onClick={close}
                    className="block rounded-xl px-3 py-2.5 font-medium text-foreground hover:bg-foreground/5"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
            <a href="#waitlist" onClick={close} className={buttonClass("dark", "md", "mt-2 w-full")}>
              Rejoindre la liste d’attente
            </a>
          </div>
        )}
      </nav>
    </header>
  );
}
