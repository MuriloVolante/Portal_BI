import { cn } from "@/lib/utils";

const HUB = { x: 20, y: 20 };
const OUTER = [
  { x: 20, y: 7 },
  { x: 31.3, y: 13.5 },
  { x: 31.3, y: 26.5 },
  { x: 20, y: 33 },
  { x: 8.7, y: 26.5 },
  { x: 8.7, y: 13.5 },
];
const LIME = "#96D737";
const CYAN = "#2396B4";

interface MeshMarkProps {
  size?: number;
  className?: string;
}

/** Marca estática (hexágono de nós + hub). Nunca animada. */
export function MeshMark({ size = 30, className }: MeshMarkProps) {
  const perimeter = OUTER.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
      className={cn("shrink-0", className)}
    >
      <polygon points={perimeter} stroke={CYAN} strokeOpacity={0.55} strokeWidth={1.5} strokeLinejoin="round" />
      {OUTER.map((p, i) => (
        <line key={`e${i}`} x1={HUB.x} y1={HUB.y} x2={p.x} y2={p.y} stroke={LIME} strokeOpacity={0.5} strokeWidth={1.5} />
      ))}
      {OUTER.map((p, i) => (
        <circle key={`n${i}`} cx={p.x} cy={p.y} r={2.4} fill={i % 2 === 0 ? LIME : CYAN} />
      ))}
      <circle cx={HUB.x} cy={HUB.y} r={4.4} fill={LIME} stroke="#2D2D2D" strokeWidth={1.4} />
    </svg>
  );
}
