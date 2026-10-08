import { LogOut } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { signOutAction } from "@/app/(auth)/actions";
import { NavLinks } from "@/components/app/NavLinks";
import { Logo } from "@/components/ui/Logo";

type Props = { companyName: string | null; logoUrl: string | null; children: React.ReactNode };

export function AppShell({ companyName, logoUrl, children }: Props) {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 lg:flex">
      <aside className="hidden lg:block lg:w-64 lg:shrink-0">
        <div className="sticky top-0 flex h-screen flex-col bg-[#04201D] p-5 text-white">
          <Link href="/app" aria-label="Factoo — tableau de bord">
            <Logo light />
          </Link>
          <nav aria-label="Navigation de l’application">
            <NavLinks variant="side" />
          </nav>
        </div>
      </aside>

      <div className="min-w-0 flex-1 pb-20 lg:pb-0">
        <header className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            {logoUrl ? (
              <Image src={logoUrl} alt="" width={36} height={36} className="h-9 w-9 rounded-lg border border-slate-200 object-contain" />
            ) : (
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#04201D] text-sm font-extrabold text-white">
                {(companyName ?? "F").charAt(0).toUpperCase()}
              </span>
            )}
            <p className="truncate font-bold">{companyName ?? "Mon entreprise"}</p>
          </div>
          <form action={signOutAction}>
            <button
              type="submit"
              className="flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only sm:not-sr-only">Se déconnecter</span>
            </button>
          </form>
        </header>
        <main className="mx-auto max-w-4xl px-4 py-6 lg:px-8 lg:py-10">{children}</main>
      </div>

      <nav
        aria-label="Navigation de l’application"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#04201D] lg:hidden"
      >
        <NavLinks variant="bottom" />
      </nav>
    </div>
  );
}
