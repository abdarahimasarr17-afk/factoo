import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/ui/Logo";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center bg-[#04201D] px-4 py-10">
      <Link href="/" aria-label="Factoo — accueil">
        <Logo light />
      </Link>
      <main className="mt-8 w-full max-w-md rounded-3xl bg-white p-6 text-slate-900 shadow-2xl sm:p-8">{children}</main>
    </div>
  );
}
