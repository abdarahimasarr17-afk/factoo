"use client";

import { Menu, X } from "lucide-react";
import { useState } from "react";
import { buttonClass } from "@/components/ui/button";
import { Logo } from "@/components/ui/Logo";

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
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/5 bg-[#04201D]">
      <nav aria-label="Navigation principale" className="mx-auto max-w-6xl px-4 py-3 sm:px-6">
        <div className="flex items-center justify-between gap-4">
          <a href="#top" aria-label="Factoo — retour en haut">
            <Logo light />
          </a>
          <ul className="hidden items-center gap-8 lg:flex">
            {LINKS.map((link) => (
              <li key={link.href}>
                <a href={link.href} className="text-sm font-medium text-white/60 transition hover:text-white">
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-2">
            <a href="#waitlist" className={buttonClass("light", "xs")}>
              <span>
                Commencer<span className="max-[374px]:hidden"> gratuitement</span>
              </span>
            </a>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls="menu-mobile"
              aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-white lg:hidden"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
        {open && (
          <div id="menu-mobile" className="border-t border-white/10 pb-2 pt-3 lg:hidden">
            <ul className="grid gap-1">
              {LINKS.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    onClick={close}
                    className="block rounded-xl px-3 py-2.5 font-medium text-white/80 hover:bg-white/5 hover:text-white"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </nav>
    </header>
  );
}
