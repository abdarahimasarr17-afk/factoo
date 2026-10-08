import type { Metadata } from "next";
import Link from "next/link";
import { Divider } from "@/components/auth/Divider";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { SignInForm } from "@/components/auth/SignInForm";
import { safeNext } from "@/lib/routes";

export const metadata: Metadata = { title: "Connexion — Factoo" };

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string; erreur?: string }> }) {
  const { next, erreur } = await searchParams;
  const destination = safeNext(next);
  return (
    <>
      <h1 className="text-2xl font-extrabold">Se connecter</h1>
      {erreur === "google" && (
        <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          Connexion Google annulée ou impossible. Réessayez.
        </p>
      )}
      <div className="mt-6">
        <GoogleButton next={destination} />
      </div>
      <Divider />
      <SignInForm next={destination} />
      <p className="mt-6 text-center text-sm text-slate-600">
        Pas encore de compte ?{" "}
        <Link href="/inscription" className="font-semibold text-[#007A33] underline">
          Créer un compte
        </Link>
      </p>
    </>
  );
}
