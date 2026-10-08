import { signOutAction } from "@/app/(auth)/actions";
import { BillingForm } from "@/components/app/BillingForm";
import { CompanyForm } from "@/components/app/CompanyForm";
import { LogoForm } from "@/components/app/LogoForm";
import { PasswordForm } from "@/components/app/PasswordForm";
import { splitPhone } from "@/lib/phone";
import { logoUrl } from "@/lib/profile";
import { getSession } from "@/lib/session";
import { COUNTRIES } from "@/lib/site";

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <h2 className="text-lg font-bold">{title}</h2>
      {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

export default async function SettingsPage() {
  const { user, profile } = await getSession();
  const dial = COUNTRIES.find((c) => c.code === profile.country)?.dial || "221";
  const phone = splitPhone(profile.phone, dial);
  const providers = (user.app_metadata?.providers as string[] | undefined) ?? [user.app_metadata?.provider];
  const hasPassword = providers.includes("email");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold sm:text-3xl">Paramètres</h1>

      <Section title="Entreprise" description="Ces informations apparaissent sur vos factures.">
        <CompanyForm
          initial={{
            companyName: profile.company_name ?? "",
            address: profile.address ?? "",
            city: profile.city ?? "",
            country: profile.country ?? "",
            countryCode: phone.countryCode,
            phone: phone.phone,
            businessEmail: profile.business_email ?? "",
            rccm: profile.rccm ?? "",
            nif: profile.nif ?? "",
          }}
        />
      </Section>

      <Section title="Logo" description="Redimensionné automatiquement pour vos factures.">
        <LogoForm logoUrl={logoUrl(profile.logo_path)} />
      </Section>

      <Section title="Facturation">
        <BillingForm initial={{ currency: profile.currency, vatRate: String(profile.vat_rate).replace(".", ",") }} />
      </Section>

      <Section title="Compte">
        <p className="text-sm text-slate-600">
          Email : <span className="font-semibold text-slate-900">{user.email}</span>
        </p>
        <div className="mt-5">
          {hasPassword ? <PasswordForm /> : <p className="text-sm text-slate-500">Vous vous connectez avec Google.</p>}
        </div>
        <form action={signOutAction} className="mt-6 border-t border-slate-100 pt-5">
          <button type="submit" className="text-sm font-semibold text-red-700 underline">
            Se déconnecter
          </button>
        </form>
      </Section>
    </div>
  );
}
