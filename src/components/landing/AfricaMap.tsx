import { AFRICA_BORDERS_PATH } from "@/components/landing/africa-borders";
import { cn } from "@/lib/cn";

const CITIES: [number, number][] = [
  [13, 116.5], // Dakar
  [60, 127], // Bamako
  [92.5, 128], // Ouagadougou
  [80, 163.5], // Abidjan
  [106, 159.5], // Lomé
  [112, 158], // Cotonou
  [148.5, 170], // Douala
];

// Flux de paiement animés entre villes (courbes de Bézier quadratiques).
const FLOWS = [
  "M13 116.5Q46 118 80 163.5",
  "M60 127Q88 120 112 158",
  "M80 163.5Q114 140 148.5 170",
  "M92.5 128Q104 138 106 159.5",
];

// Carte façon croquis au feutre : frontières tracées deux fois, déformées par un bruit différent à chaque passage.
export function AfricaMap({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 365 375" className={cn("pointer-events-none rotate-3", className)} aria-hidden="true">
      <defs>
        <filter id="sketch-a" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="3" />
          <feDisplacementMap in="SourceGraphic" scale="3" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <filter id="sketch-b" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="11" />
          <feDisplacementMap in="SourceGraphic" scale="2.2" xChannelSelector="G" yChannelSelector="R" />
        </filter>
      </defs>

      <g opacity="0.07" fill="none" stroke="#00C853" strokeLinecap="round" strokeLinejoin="round">
        <path d={AFRICA_BORDERS_PATH} strokeWidth="1.3" filter="url(#sketch-a)" />
        <path d={AFRICA_BORDERS_PATH} strokeWidth="0.8" filter="url(#sketch-b)" transform="translate(0.7 0.5)" />
      </g>

      {FLOWS.map((d) => (
        <path
          key={d}
          d={d}
          fill="none"
          stroke="#00C853"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeDasharray="4 8"
          className="animate-dash"
        />
      ))}

      {CITIES.map(([cx, cy], i) => (
        <g key={`${cx}-${cy}`}>
          <circle
            cx={cx}
            cy={cy}
            r="3"
            fill="#00C853"
            className="animate-pulse-ring"
            style={{ animationDelay: `${i * 0.35}s` }}
          />
          <circle cx={cx} cy={cy} r="2.6" fill="#00C853" />
          <circle cx={cx} cy={cy} r="1" fill="white" />
        </g>
      ))}
    </svg>
  );
}
