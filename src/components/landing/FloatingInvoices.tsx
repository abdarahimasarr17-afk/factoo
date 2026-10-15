import { cn } from "@/lib/cn";

type Paper = {
  amount: string;
  width: number;
  rotate: number;
  duration: number;
  delay: number;
  opacity: number;
  className: string;
};

// Placées dans les marges et les zones vides du hero (vérifié de 1024 à 1920 px : 3 papiers en lg, 4 dès xl) ; masquées sous lg,
// où le hero empilé n'a plus de zone vide hors du texte et de la maquette.
const PAPERS: Paper[] = [
  { amount: "250 000 FCFA", width: 168, rotate: -4, duration: 8, delay: 0, opacity: 0.1, className: "-bottom-10 left-[3%]" },
  { amount: "85 000 FCFA", width: 118, rotate: 5, duration: 7, delay: 1.2, opacity: 0.12, className: "right-[2%] top-24" },
  { amount: "40 000 FCFA", width: 118, rotate: 3, duration: 6.5, delay: 2.4, opacity: 0.09, className: "bottom-4 left-[44%] hidden xl:block" },
  { amount: "12 500 FCFA", width: 80, rotate: -5, duration: 6, delay: 0.6, opacity: 0.11, className: "bottom-[14%] -right-4" },
];

function InvoicePaper({ amount, width }: { amount: string; width: number }) {
  const s = width / 120;
  return (
    <div className="rounded-lg bg-white text-slate-900 shadow-2xl" style={{ width, padding: 10 * s }}>
      <div className="flex items-center gap-1" style={{ gap: 4 * s }}>
        <span className="rounded-[3px] bg-[#0F766E]" style={{ width: 10 * s, height: 10 * s }} />
        <span className="rounded-full bg-slate-300" style={{ width: 34 * s, height: 4 * s }} />
      </div>
      <div className="grid" style={{ gap: 4 * s, marginTop: 9 * s }}>
        <span className="rounded-full bg-slate-200" style={{ width: "100%", height: 3 * s }} />
        <span className="rounded-full bg-slate-200" style={{ width: "80%", height: 3 * s }} />
        <span className="rounded-full bg-slate-200" style={{ width: "90%", height: 3 * s }} />
      </div>
      <p className="font-extrabold leading-none" style={{ fontSize: 11 * s, marginTop: 9 * s }}>
        {amount}
      </p>
      <p className="font-bold leading-none text-[#00C853]" style={{ fontSize: 9 * s, marginTop: 5 * s }}>
        Payée ✓
      </p>
    </div>
  );
}

export function FloatingInvoices() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 hidden select-none lg:block">
      {PAPERS.map((p) => (
        <div
          key={p.amount}
          data-floating-invoice
          className={cn("animate-invoice-float absolute", p.className)}
          style={
            {
              opacity: p.opacity,
              "--invoice-rotate": `${p.rotate}deg`,
              animationDuration: `${p.duration}s`,
              animationDelay: `-${p.delay}s`,
            } as React.CSSProperties
          }
        >
          <InvoicePaper amount={p.amount} width={p.width} />
        </div>
      ))}
    </div>
  );
}
