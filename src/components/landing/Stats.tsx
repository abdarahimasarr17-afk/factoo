import { Container } from "@/components/ui/Container";

const STATS = [
  { value: "2 min", label: "pour créer une facture" },
  { value: "3 taps", label: "pour que votre client paie" },
  { value: "0 FCFA", label: "pour commencer" },
  { value: "J+3 · J+7 · J+14", label: "relances automatiques" },
];

export function Stats() {
  return (
    <section aria-label="Factoo en chiffres" className="py-12">
      <Container>
        <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {STATS.map((stat) => (
            <div key={stat.label} className="rounded-2xl border border-border bg-card p-5">
              <dt className="sr-only">{stat.label}</dt>
              <dd className="text-xl font-extrabold text-primary sm:text-3xl">{stat.value}</dd>
              <dd className="mt-1 text-sm text-muted">{stat.label}</dd>
            </div>
          ))}
        </dl>
      </Container>
    </section>
  );
}
