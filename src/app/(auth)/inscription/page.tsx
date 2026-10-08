import type { Metadata } from "next";
import Link from "next/link";
import { Divider } from "@/components/auth/Divider";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { SignUpForm } from "@/components/auth/SignUpForm";

export const metadata: Metadata = { title: "Créer un compte — Factoo" };

export default function SignUpPage() {
  return (
    <>
      <h1 className="text-2xl font-extrabold">Créer votre compte</h1>
      <p className="mt-1 text-sm text-slate-500">Gratuit, sans carte bancaire.</p>
      <div className="mt-6">
        <GoogleButton next="/app" />
      </div>
      <Divider />
      <SignUpForm />
      <p className="mt-6 text-center text-sm text-slate-600">
        Déjà un compte ?{" "}
        <Link href="/connexion" className="font-semibold text-[#007A33] underline">
          Se connecter
        </Link>
      </p>
    </>
  );
}
