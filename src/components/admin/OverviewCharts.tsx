"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { OverviewData } from "@/lib/admin/overview";

// Topo da escala no próximo número "redondo" (e par, para o meio ser inteiro).
const NICE = [1, 1.2, 1.4, 1.6, 2, 2.4, 3, 4, 5, 6, 8, 10];
function niceMax(value: number) {
  if (value <= 4) return 4;
  const step = Math.pow(10, Math.floor(Math.log10(value)));
  const m = NICE.find((n) => n * step >= value) ?? 10;
  const max = Math.round(m * step);
  return max % 2 ? max + 1 : max;
}

/** Barras verticais: acessos por dia nas últimas 2 semanas. */
export function DailyAccessChart({ data }: { data: OverviewData["daily"] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = niceMax(Math.max(...data.map((d) => d.count), 0));
  const ticks = [max, max / 2, 0];

  return (
    <div>
      <div className="relative h-[190px] pl-7">
        {/* grade recessiva */}
        {ticks.map((t) => (
          <div
            key={t}
            className="absolute inset-x-0 flex items-center"
            style={{ bottom: `${(t / max) * 100}%`, transform: "translateY(50%)" }}
          >
            <span className="w-7 shrink-0 pr-2 text-right text-[10.5px] tabular-nums text-tertiary">{t}</span>
            <span className={cn("h-px flex-1", t === 0 ? "bg-border" : "bg-border/40")} />
          </div>
        ))}

        <div className="absolute inset-y-0 left-7 right-0 flex items-end">
          {data.map((d, i) => (
            <div
              key={d.key}
              className="relative flex h-full flex-1 items-end justify-center px-[1px]"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            >
              <div
                className={cn(
                  "w-[62%] max-w-[22px] origin-bottom rounded-t-[4px] transition-colors [transition-duration:200ms]",
                  hover === null || hover === i ? "bg-primary" : "bg-primary/40"
                )}
                style={{
                  height: `${(d.count / max) * 100}%`,
                  minHeight: d.count ? 2 : 0,
                  animation: `bar-grow .7s cubic-bezier(.22,1,.36,1) ${i * 55}ms both`,
                }}
              />
              {hover === i && (
                <div
                  className={cn(
                    "pointer-events-none absolute bottom-full z-20 mb-1 whitespace-nowrap rounded-lg border bg-popover px-2.5 py-1.5 text-xs shadow-[0_10px_24px_rgb(0_0_0/.4)]",
                    // centralizada na barra; nas pontas, alinhada para dentro do gráfico
                    i < 2 ? "left-0" : i >= data.length - 2 ? "right-0" : "left-1/2 -translate-x-1/2"
                  )}
                >
                  <span className="text-muted-foreground">
                    {d.weekday}, {d.label}
                  </span>
                  <span className="ml-2 font-semibold tabular-nums text-foreground">
                    {d.count} {d.count === 1 ? "acesso" : "acessos"}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-2 flex pl-7">
        {data.map((d, i) => (
          <span key={d.key} className="flex-1 text-center text-[10.5px] tabular-nums text-tertiary">
            {i % 2 === data.length % 2 ? d.label : ""}
          </span>
        ))}
      </div>

      <table className="sr-only">
        <caption>Acessos por dia</caption>
        <tbody>
          {data.map((d) => (
            <tr key={d.key}>
              <th scope="row">{d.label}</th>
              <td>{d.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Barras horizontais: painéis mais abertos, com o valor à direita. */
export function TopPagesChart({ data }: { data: OverviewData["topPages"] }) {
  const max = Math.max(...data.map((d) => d.count), 1);

  return (
    <ul className="space-y-3.5">
      {data.map((d, i) => (
        <li key={d.label} className="group" title={`${d.label}: ${d.count} acessos`}>
          <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate text-muted-foreground transition-colors group-hover:text-foreground">
              {d.label}
            </span>
            <span className="shrink-0 font-semibold tabular-nums text-foreground">{d.count}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full origin-left rounded-full bg-primary"
              style={{
                width: `${(d.count / max) * 100}%`,
                animation: `bar-grow-x .8s cubic-bezier(.22,1,.36,1) ${i * 55 + 120}ms both`,
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
