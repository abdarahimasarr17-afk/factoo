import { LogOut } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { signOutAction } from "@/app/(auth)/actions";
import { Breadcrumb } from "@/components/app/Breadcrumb";
import { NavLinks } from "@/components/app/NavLinks";
import { Logo } from "@/components/ui/Logo";

type Props = { companyName: string | null; logoUrl: string | null; children: React.ReactNode };

export function AppShell({ companyName, logoUrl, children }: Props) {
  const name = companyName ?? "Mon entreprise";
  const avatar = logoUrl ? (
    <Image src={logoUrl} alt="" width={36} height={36} className="h-9 w-9 rounded-full border border-slate-200 bg-white object-contain" />
  ) : (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
      {name.charAt(0).toUpperCase()}
    </span>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 lg:flex">
      <aside className="hidden lg:block lg:w-64 lg:shrink-0">
        <div className="sticky top-0 flex h-screen flex-col border-r border-slate-200 bg-white">
          <Link href="/app" aria-label="Factoo — tableau de bord" className="flex h-16 items-center border-b border-slate-200 px-6">
            <Logo className="text-slate-900" />
          </Link>
          <nav aria-label="Navigation de l’application" className="flex-1 overflow-y-auto pt-8">
            <NavLinks variant="side" />
          </nav>
          <div className="border-t border-slate-200 px-6 py-5">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Session</p>
            <form action={signOutAction} className="mt-3">
              <button type="submit" className="flex items-center gap-3 text-[15px] text-slate-500 hover:text-slate-900">
                <LogOut className="h-5 w-5" aria-hidden="true" /> Se déconnecter
              </button>
            </form>
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1 pb-20 lg:pb-0">
        <header className="flex h-16 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 lg:px-8">
          <div className="min-w-0">
            <Link href="/app" aria-label="Factoo — tableau de bord" className="lg:hidden">
              <Logo className="text-lg text-slate-900 [&_svg]:h-7 [&_svg]:w-7" />
            </Link>
            <div className="hidden lg:block">
              <Breadcrumb />
            </div>
          </div>
          <div className="flex min-w-0 items-center gap-3">
            <p className="hidden truncate text-sm font-semibold text-slate-700 sm:block">{name}</p>
            {avatar}
            <form action={signOutAction} className="lg:hidden">
              <button type="submit" aria-label="Se déconnecter" className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100">
                <LogOut className="h-4 w-4" aria-hidden="true" />
              </button>
            </form>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6 lg:px-12 lg:py-10">{children}</main>
      </div>

      <nav aria-label="Navigation de l’application" className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white lg:hidden">
        <NavLinks variant="bottom" />
      </nav>
    </div>
  );
}
