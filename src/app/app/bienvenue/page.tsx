import { redirect } from "next/navigation";
import { OnboardingWizard } from "@/components/app/OnboardingWizard";
import { Logo } from "@/components/ui/Logo";
import { getSession } from "@/lib/session";

export default async function WelcomePage() {
  const { profile } = await getSession();
  if (profile.onboarded_at) redirect("/app");
  return (
    <div className="flex min-h-screen flex-col items-center bg-[#04201D] px-4 py-10">
      <Logo light />
      <main className="mt-8 w-full max-w-lg rounded-3xl bg-white p-6 text-slate-900 shadow-2xl sm:p-8">
        <OnboardingWizard initial={{ companyName: profile.company_name ?? "", country: profile.country ?? "" }} />
      </main>
    </div>
  );
}
