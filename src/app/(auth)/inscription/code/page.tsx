import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { VerifyCodeForm } from "@/components/auth/VerifyCodeForm";

export const metadata: Metadata = { title: "Confirmez votre email — Factoo" };

export default async function VerifyCodePage({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const { email } = await searchParams;
  if (!email) redirect("/inscription");
  return (
    <>
      <h1 className="text-2xl font-extrabold">Confirmez votre email</h1>
      <p className="mt-1 text-sm text-slate-500">
        Nous avons envoyé un code à 6 chiffres à <span className="font-semibold text-slate-800">{email}</span>. Pensez à
        regarder dans les spams.
      </p>
      <div className="mt-6">
        <VerifyCodeForm email={email} />
      </div>
    </>
  );
}
