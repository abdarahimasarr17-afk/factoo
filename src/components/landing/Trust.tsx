import { Sparkles } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { PaymentBadges } from "@/components/ui/PaymentBadges";

export function Trust() {
  return (
    <section aria-label="Moyens de paiement et premiers utilisateurs" className="py-16">
      <Container>
        <div className="grid items-center gap-8 rounded-3xl border border-border bg-card p-8 md:grid-cols-2">
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-primary">Moyens de paiement</p>
            <p className="mt-2 text-lg font-bold text-foreground">Vos clients paient avec ce qu’ils utilisent déjà.</p>
            <PaymentBadges className="mt-4" />
          </div>
          <div className="flex gap-4 rounded-2xl bg-primary/10 p-6">
            <Sparkles className="h-6 w-6 shrink-0 text-primary" aria-hidden="true" />
            <p className="text-foreground">
              <span className="font-bold">Rejoignez les premiers freelances et PME qui testent Factoo.</span> Vos
              retours construisent le produit : on vous écrit personnellement sur WhatsApp.
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
}
