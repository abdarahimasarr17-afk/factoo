import { Check, Gift } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { cn } from "@/lib/cn";
import { PLANS } from "@/lib/site";

export function Pricing() {
  return (
    <section id="tarifs" className="py-20">
      <Container>
        <SectionHeading
          eyebrow="Tarifs"
          title="Commencez gratuitement, passez Pro quand vous êtes prêt"
          subtitle="2 fois moins cher que les outils existants. Payable par Wave, Orange Money ou carte."
        />
        <div className="mx-auto mt-12 grid max-w-4xl gap-6 md:grid-cols-2">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={cn(
                "relative flex flex-col rounded-3xl border p-8",
                plan.highlight ? "border-primary bg-card shadow-xl ring-2 ring-primary" : "border-border bg-card",
              )}
            >
              {plan.highlight && (
                <span className="absolute -top-3 left-8 rounded-full bg-accent px-3 py-1 text-xs font-bold text-slate-900">
                  Le plus choisi
                </span>
              )}
              <h3 className="text-xl font-extrabold text-foreground">{plan.name}</h3>
              <p className="mt-4 flex flex-wrap items-baseline gap-x-2">
                {plan.oldPrice && (
                  <span className="text-lg text-muted line-through">
                    <span className="sr-only">Au lieu de </span>
                    {plan.oldPrice}
                  </span>
                )}
                <span className="text-4xl font-extrabold text-foreground">{plan.price}</span>
                <span className="text-muted">{plan.period}</span>
              </p>
              {plan.yearly && (
                <p className="mt-1 text-sm text-muted">
                  ou <span className="line-through">{plan.yearly.oldPrice}</span>{" "}
                  <span className="font-bold text-foreground">{plan.yearly.price}</span> par an
                </p>
              )}
              <ul className="mt-6 flex-1 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-3 text-foreground">
                    <Check className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                    {feature}
                  </li>
                ))}
              </ul>
              <a
                href="#waitlist"
                className={buttonClass(plan.highlight ? "primary" : "outline", "md", "mt-8 w-full")}
              >
                Rejoindre la liste d’attente
              </a>
            </div>
          ))}
        </div>
        <p className="mx-auto mt-8 flex max-w-2xl items-center justify-center gap-3 rounded-2xl border border-accent/40 bg-accent/10 p-4 text-center font-semibold text-foreground">
          <Gift className="h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
          Tarif de lancement garanti aux inscrits de la liste d’attente.
        </p>
      </Container>
    </section>
  );
}
