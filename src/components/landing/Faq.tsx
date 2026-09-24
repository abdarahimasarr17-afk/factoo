import { Plus } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { FAQ } from "@/lib/site";

export function Faq() {
  return (
    <section id="faq" className="py-20">
      <Container className="max-w-3xl">
        <SectionHeading eyebrow="FAQ" title="Vos questions" />
        <div className="mt-10 space-y-3">
          {FAQ.map((item) => (
            <details key={item.question} className="group rounded-2xl border border-border bg-card p-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold text-foreground [&::-webkit-details-marker]:hidden">
                {item.question}
                <Plus className="h-5 w-5 shrink-0 text-primary transition group-open:rotate-45" aria-hidden="true" />
              </summary>
              <p className="mt-3 text-muted">{item.answer}</p>
            </details>
          ))}
        </div>
      </Container>
    </section>
  );
}
