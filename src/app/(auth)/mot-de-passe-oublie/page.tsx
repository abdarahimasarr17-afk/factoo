import type { Metadata } from "next";
import Link from "next/link";
import { ResetPasswordFlow } from "@/components/auth/ResetPasswordFlow";

export const metadata: Metadata = { title: "Mot de passe oublié — Factoo" };

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="text-2xl font-extrabold">Mot de passe oublié</h1>
      <p className="mt-1 text-sm text-slate-500">Recevez un code par email pour choisir un nouveau mot de passe.</p>
      <div className="mt-6">
        <ResetPasswordFlow />
      </div>
      <p className="mt-6 text-center text-sm text-slate-600">
        <Link href="/connexion" className="font-semibold text-[#007A33] underline">
          Retour à la connexion
        </Link>
      </p>
    </>
  );
}
