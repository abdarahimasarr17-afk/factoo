import { redirect } from "next/navigation";
import { AppShell } from "@/components/app/AppShell";
import { logoUrl } from "@/lib/profile";
import { getSession } from "@/lib/session";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await getSession();
  if (!profile.onboarded_at) redirect("/app/bienvenue");
  return (
    <AppShell companyName={profile.company_name} logoUrl={logoUrl(profile.logo_path)}>
      {children}
    </AppShell>
  );
}
