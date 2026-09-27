import { cn } from "@/lib/cn";

// Contour simplifié de l'Afrique et de Madagascar (projection équirectangulaire, 5 px par degré).
const AFRICA_PATH =
  "M71 11L52 38L35 52.5L15 85L17.5 92.5L20 100L12.5 116.5L16.5 127.5L25 135L33.5 142.5L42.5 155L60 167.5L75 164L85 164.5L100 162L112 158L122.5 158.5L130 168.5L142.5 167.5L147.5 171L149 185L146.5 195L159 214L161.5 220L166 234L169 250L160 275L172.5 304.5L176 325L182.5 333L192 359.5L200 364L212.5 360L228 359.5L240 353.5L255 339.5L263 320L277.5 310L276.5 295L274 289L285 278L303 265L302.5 242.5L296.5 224L298.5 210L308 198L320 182.5L335 165L347.5 145L356.5 131L345 133.5L325 137.5L316 132L313.5 125L300 112.5L292 97.5L286 82.5L277.5 70L267.5 52.5L262.5 40L255 32.5L245 35.5L225 32L200 36L197.5 30L177.5 30L165 26L155 22.5L151 7.5L143.5 5.5L115 6L95 12.5ZM346.5 250L352.5 267.5L349 275L342.5 292.5L337.5 312.5L326 317.5L318.5 307.5L316.5 297.5L322 287.5L320 275L331.5 269L340 257.5Z";

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

export function AfricaMap({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 365 375" className={cn("pointer-events-none", className)} aria-hidden="true">
      <defs>
        <pattern id="africa-dots" width="7" height="7" patternUnits="userSpaceOnUse">
          <circle cx="3.5" cy="3.5" r="1.3" fill="#00C853" />
        </pattern>
        <clipPath id="africa-clip">
          <path d={AFRICA_PATH} />
        </clipPath>
      </defs>

      <rect width="365" height="375" fill="url(#africa-dots)" clipPath="url(#africa-clip)" opacity="0.45" />
      <path d={AFRICA_PATH} fill="none" stroke="white" strokeOpacity="0.25" strokeWidth="1" strokeLinejoin="round" />

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
