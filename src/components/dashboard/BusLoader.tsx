"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Tela de carregamento do painel: um ônibus percorrendo a cidade e parando
 * nos pontos enquanto o Power BI carrega. O ônibus fica no lugar e o cenário
 * passa (funciona para qualquer tempo de espera). Quando o relatório termina
 * de carregar (`arriving`), ele acelera e sai de cena; aí chama `onDone`.
 */

interface Stop {
  name: string;
  caption: string;
}

const STOPS: Stop[] = [
  { name: "Garagem Central", caption: "Saindo da garagem…" },
  { name: "Rua das Admissões", caption: "Embarcando os indicadores…" },
  { name: "Av. do Turnover", caption: "Conferindo quem desceu e quem subiu…" },
  { name: "Praça do Banco de Horas", caption: "Parada rápida pra fechar o saldo…" },
  { name: "Terminal Headcount", caption: "Contando os passageiros…" },
  { name: "Ponto do Cafezinho", caption: "Ninguém é de ferro. Já pegou o café?" },
  { name: "Rodoviária Power BI", caption: "O Power BI está caprichando nos gráficos…" },
];

const HEIGHT = 210;
const ROAD_Y = 158; // topo da pista
const BUS_W = 168;
const CRUISE = 150; // px/s
const BRAKE_DIST = 130; // px antes do ponto em que começa a frear
const DWELL_MS = 1100; // tempo parado com as portas abertas
const DOOR_X = 118; // posição da porta a partir da traseira do ônibus

const LIME = "#96D737";
const CYAN = "#2396B4";

/** Prédios do horizonte (repetem a cada SKYLINE_W px). */
const SKYLINE_W = 900;
const BUILDINGS = Array.from({ length: 16 }, (_, i) => {
  const r = (n: number) => {
    const x = Math.sin(i * 12.9898 + n * 78.233) * 43758.5453;
    return x - Math.floor(x);
  };
  const w = 34 + r(1) * 40;
  const h = 34 + r(2) * 70;
  return { x: i * (SKYLINE_W / 16) + r(3) * 10, w, h, lit: Array.from({ length: 4 }, (_, k) => r(4 + k) > 0.62) };
});

interface BusLoaderProps {
  /** O relatório carregou: o ônibus parte e a tela some. */
  arriving: boolean;
  onDone: () => void;
  /** Painel em segundo plano: não anima (economiza CPU). */
  paused?: boolean;
}

export function BusLoader({ arriving, onDone, paused = false }: BusLoaderProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(800);
  const [caption, setCaption] = useState(STOPS[0].caption);
  const [honk, setHonk] = useState(0);

  // Elementos animados via ref (sem re-render a cada quadro).
  const skylineRef = useRef<SVGGElement>(null);
  const laneRef = useRef<SVGGElement>(null);
  const stopsRef = useRef<SVGGElement>(null);
  const busRef = useRef<SVGGElement>(null);
  const wheelRefs = useRef<(SVGGElement | null)[]>([]);
  const doorRefs = useRef<(SVGRectElement | null)[]>([]);
  const puffRefs = useRef<(SVGCircleElement | null)[]>([]);

  const state = useRef({
    distance: 0, // quanto o mundo andou
    speed: 0,
    nextStop: 1, // índice do próximo ponto (o 0 é a garagem, onde começa)
    dwellUntil: 0,
    door: 0, // 0 fechada … 1 aberta
    leaving: false,
    busX: 0, // deslocamento extra ao sair de cena
    bounce: 0,
    puffs: [0, 0, 0].map(() => ({ x: 0, y: 0, life: 0 })),
    puffTimer: 0,
    leftGarage: false,
    done: false,
  });
  const arrivingRef = useRef(arriving);
  arrivingRef.current = arriving;
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  // Cena ampliada em telas grandes; as contas abaixo usam a largura "virtual".
  const scale = width >= 900 ? 1.4 : width >= 600 ? 1.2 : 1;
  const vw = Math.round(width / scale);
  const spacing = Math.min(480, Math.max(340, vw * 0.5)); // ~3 s entre pontos
  const busLeft = Math.round(vw * 0.36 - BUS_W / 2);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.max(320, Math.round(entry.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Sem animação (reduzir movimento ou em segundo plano): só espera o load.
  const reduceMotion =
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  useEffect(() => {
    if ((paused || reduceMotion) && arriving && !state.current.done) {
      state.current.done = true;
      onDoneRef.current();
    }
  }, [arriving, paused, reduceMotion]);

  useEffect(() => {
    if (paused || reduceMotion) return;
    let raf = 0;
    let last = performance.now();
    const s = state.current;

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      if (arrivingRef.current && !s.leaving) {
        s.leaving = true;
        s.dwellUntil = 0;
        setCaption("Chegamos! Bom trabalho.");
      }

      if (s.leaving) {
        s.door = Math.max(0, s.door - dt * 6);
        s.speed = Math.min(1400, s.speed + 2600 * dt);
        s.busX += s.speed * dt;
        s.distance += 60 * dt; // cenário quase parado: quem anda é o ônibus
        if (busLeft + s.busX > vw + 40 && !s.done) {
          s.done = true;
          onDoneRef.current();
          return;
        }
      } else {
        const stopAt = s.nextStop * spacing; // distância em que a porta alinha com o ponto
        const toStop = stopAt - s.distance;
        if (s.dwellUntil) {
          s.speed = 0;
          s.door = Math.min(1, s.door + dt * 4);
          if (now >= s.dwellUntil) {
            s.dwellUntil = 0;
            s.nextStop += 1;
            setCaption(`Próxima parada: ${STOPS[s.nextStop % STOPS.length].name}`);
          }
        } else {
          s.door = Math.max(0, s.door - dt * 4);
          const target = toStop < BRAKE_DIST ? Math.max(14, CRUISE * Math.sqrt(Math.max(0, toStop) / BRAKE_DIST)) : CRUISE;
          // acelera devagar, freia mais rápido
          s.speed += (target - s.speed) * Math.min(1, dt * (target > s.speed ? 1.6 : 6));
          s.distance += s.speed * dt;
          if (!s.leftGarage && s.distance > 50) {
            s.leftGarage = true;
            setCaption(`Próxima parada: ${STOPS[1].name}`);
          }
          if (toStop <= 0.5) {
            s.distance = stopAt;
            s.dwellUntil = now + DWELL_MS;
            setCaption(STOPS[s.nextStop % STOPS.length].caption);
          }
        }
      }

      // fumacinha ao acelerar
      s.puffTimer -= dt;
      const accelerating = s.leaving || (!s.dwellUntil && s.speed > 20 && s.speed < CRUISE * 0.8);
      if (accelerating && s.puffTimer <= 0) {
        const p = s.puffs.find((q) => q.life <= 0);
        if (p) Object.assign(p, { x: busLeft + s.busX - 4, y: ROAD_Y + 6, life: 1 });
        s.puffTimer = 0.18;
      }
      s.puffs.forEach((p, i) => {
        if (p.life > 0) {
          p.life -= dt * 1.4;
          p.x -= (s.speed * 0.5 + 30) * dt;
          p.y -= 10 * dt;
        }
        const el = puffRefs.current[i];
        if (el) {
          el.setAttribute("cx", p.x.toFixed(1));
          el.setAttribute("cy", p.y.toFixed(1));
          el.setAttribute("r", (3 + (1 - p.life) * 7).toFixed(1));
          el.setAttribute("opacity", Math.max(0, p.life * 0.35).toFixed(2));
        }
      });

      s.bounce += dt * (s.speed > 5 ? 9 : 2);
      const bob = s.speed > 5 ? Math.sin(s.bounce) * 0.9 : 0;

      skylineRef.current?.setAttribute("transform", `translate(${-((s.distance * 0.25) % SKYLINE_W)} 0)`);
      laneRef.current?.setAttribute("transform", `translate(${-(s.distance % 44)} 0)`);
      stopsRef.current?.setAttribute("transform", `translate(${-s.distance} 0)`);
      busRef.current?.setAttribute("transform", `translate(${busLeft + s.busX} ${bob.toFixed(2)})`);
      const wheelAngle = ((s.distance + s.busX) / 9) * (180 / Math.PI);
      wheelRefs.current.forEach((w) => w?.setAttribute("transform", `rotate(${wheelAngle % 360})`));
      doorRefs.current.forEach((d, i) => {
        if (!d) return;
        const shift = s.door * 7 * (i === 0 ? -1 : 1);
        d.setAttribute("transform", `translate(${shift} 0)`);
      });

      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [paused, reduceMotion, vw, spacing, busLeft]);

  // Posição de cada ponto no "mundo": o ponto k alinha com a porta quando o
  // cenário andou k × spacing. 40 pontos ≈ 4 min de viagem.
  const stopX = (k: number) => busLeft + DOOR_X + k * spacing;

  return (
    <div ref={wrapRef} className="flex h-full w-full flex-col items-center justify-center overflow-hidden px-4">
      <svg
        width="100%"
        height={HEIGHT * scale}
        viewBox={`0 0 ${vw} ${HEIGHT}`}
        className="max-w-full select-none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="bus-beam" x1="0" x2="1">
            <stop offset="0" stopColor={LIME} stopOpacity="0.22" />
            <stop offset="1" stopColor={LIME} stopOpacity="0" />
          </linearGradient>
          <linearGradient id="bus-fade" x1="0" x2="1">
            <stop offset="0" stopColor="#2D2D2D" />
            <stop offset="0.12" stopColor="#2D2D2D" stopOpacity="0" />
            <stop offset="0.88" stopColor="#2D2D2D" stopOpacity="0" />
            <stop offset="1" stopColor="#2D2D2D" />
          </linearGradient>
        </defs>

        {/* horizonte */}
        <g ref={skylineRef}>
          {[0, 1, 2].map((rep) =>
            BUILDINGS.map((b, i) => (
              <g key={`${rep}-${i}`} transform={`translate(${rep * SKYLINE_W + b.x} ${ROAD_Y - b.h})`}>
                <rect width={b.w} height={b.h} rx="2" fill="#333333" />
                {b.lit.map((on, k) =>
                  on ? (
                    <rect
                      key={k}
                      x={6 + (k % 2) * (b.w / 2 - 4)}
                      y={8 + Math.floor(k / 2) * 14}
                      width="6"
                      height="5"
                      rx="1"
                      fill={k % 3 === 0 ? CYAN : LIME}
                      opacity="0.35"
                    />
                  ) : null
                )}
              </g>
            ))
          )}
        </g>

        {/* pista */}
        <rect x="0" y={ROAD_Y} width={vw} height="30" fill="#262626" />
        <rect x="0" y={ROAD_Y} width={vw} height="1.5" fill="#464646" />
        <g ref={laneRef}>
          {Array.from({ length: Math.ceil(vw / 44) + 2 }, (_, i) => (
            <rect key={i} x={i * 44} y={ROAD_Y + 17} width="22" height="2" rx="1" fill={LIME} opacity="0.3" />
          ))}
        </g>

        {/* pontos de ônibus */}
        <g ref={stopsRef}>
          {Array.from({ length: 40 }, (_, k) => (
            <BusStop key={k} x={stopX(k)} stop={STOPS[k % STOPS.length]} />
          ))}
        </g>

        {/* fumaça */}
        {[0, 1, 2].map((i) => (
          <circle
            key={i}
            ref={(el) => {
              puffRefs.current[i] = el;
            }}
            r="0"
            fill="#8A8A8A"
            opacity="0"
          />
        ))}

        {/* ônibus */}
        <g ref={busRef} transform={`translate(${busLeft} 0)`}>
          <g
            transform={`translate(0 ${ROAD_Y + 8})`}
            onClick={() => setHonk((n) => n + 1)}
            className="cursor-pointer"
            style={{ pointerEvents: "auto" }}
          >
            <Bus wheelRefs={wheelRefs} doorRefs={doorRefs} />
            {honk > 0 && (
              <g key={honk} className="animate-rise-in">
                <rect x={BUS_W + 8} y="-52" width="58" height="22" rx="11" fill="#363636" stroke={LIME} strokeOpacity="0.6" />
                <text x={BUS_W + 37} y="-37" textAnchor="middle" fontSize="11" fontWeight="600" fill={LIME}>
                  Bi-bi!
                </text>
              </g>
            )}
          </g>
        </g>

        {/* bordas esfumaçadas */}
        <rect x="0" y="0" width={vw} height={HEIGHT} fill="url(#bus-fade)" pointerEvents="none" />
      </svg>

      <p key={caption} className="mt-2 min-h-[22px] animate-rise-in text-center text-[15px] text-foreground/90" aria-live="polite">
        {caption}
      </p>
      <p className="mt-1 text-center text-xs text-tertiary">Carregando o painel do Power BI</p>
    </div>
  );
}

function BusStop({ x, stop }: { x: number; stop: Stop }) {
  const plateW = Math.max(96, stop.name.length * 6.4 + 22);
  return (
    <g transform={`translate(${x} ${ROAD_Y})`}>
      <rect x="-1.25" y="-58" width="2.5" height="58" fill="#5A5A5A" />
      <g transform={`translate(${-plateW / 2} -86)`}>
        <rect width={plateW} height="30" rx="7" fill="#363636" stroke={LIME} strokeOpacity="0.45" />
        <text x="10" y="11.5" fontSize="7.5" fontWeight="600" letterSpacing="1.2" fill={LIME} opacity="0.85">
          PONTO
        </text>
        <text x="10" y="23" fontSize="10.5" fontWeight="500" fill="#F2F2F2">
          {stop.name}
        </text>
      </g>
    </g>
  );
}

function Bus({
  wheelRefs,
  doorRefs,
}: {
  wheelRefs: React.MutableRefObject<(SVGGElement | null)[]>;
  doorRefs: React.MutableRefObject<(SVGRectElement | null)[]>;
}) {
  // Origem: traseira do ônibus, no chão. Desenhado virado para a direita.
  return (
    <g>
      <ellipse cx={BUS_W / 2} cy="1" rx={BUS_W / 2 + 4} ry="4" fill="#000" opacity="0.28" />
      {/* farol no chão */}
      <polygon points={`${BUS_W},-14 ${BUS_W + 90},-2 ${BUS_W + 90},4 ${BUS_W},-8`} fill="url(#bus-beam)" />

      {/* carroceria */}
      <path
        d={`M6,-12 L6,-52 Q6,-58 12,-58 L${BUS_W - 14},-58 Q${BUS_W - 2},-58 ${BUS_W},-46 L${BUS_W},-14 Q${BUS_W},-10 ${BUS_W - 4},-10 L10,-10 Q6,-10 6,-12 Z`}
        fill="#ECECEC"
      />
      {/* faixa lima e saia */}
      <rect x="6" y="-24" width={BUS_W - 6} height="5" fill={LIME} />
      <rect x="6" y="-19" width={BUS_W - 6} height="7" fill="#D6D6D6" />
      {/* janelas */}
      {Array.from({ length: 4 }, (_, i) => (
        <g key={i}>
          <rect x={14 + i * 21} y="-50" width="17" height="18" rx="2.5" fill="#262626" />
          <rect x={16 + i * 21} y="-48" width="4" height="14" rx="1" fill={CYAN} opacity="0.35" />
        </g>
      ))}
      {/* porta (duas folhas que abrem) */}
      <rect x={DOOR_X - 9} y="-50" width="18" height="38" rx="2" fill="#1F1F1F" />
      <rect
        ref={(el) => {
          doorRefs.current[0] = el;
        }}
        x={DOOR_X - 9}
        y="-50"
        width="9"
        height="38"
        rx="1.5"
        fill="#2F2F2F"
        stroke="#3F3F3F"
      />
      <rect
        ref={(el) => {
          doorRefs.current[1] = el;
        }}
        x={DOOR_X}
        y="-50"
        width="9"
        height="38"
        rx="1.5"
        fill="#2F2F2F"
        stroke="#3F3F3F"
      />
      {/* para-brisa e letreiro */}
      <path d={`M${BUS_W - 30},-50 L${BUS_W - 12},-50 Q${BUS_W - 4},-49 ${BUS_W - 3},-40 L${BUS_W - 3},-28 L${BUS_W - 30},-28 Z`} fill="#262626" />
      <rect x={BUS_W - 27} y="-48" width="4" height="16" rx="1" fill={CYAN} opacity="0.35" />
      <rect x="18" y="-57" width="70" height="6" rx="1.5" fill="#262626" />
      <text x="53" y="-52.3" textAnchor="middle" fontSize="5" fontWeight="700" letterSpacing="0.8" fill={LIME}>
        PORTAL BI
      </text>
      {/* luzes */}
      <circle cx={BUS_W - 2} cy="-17" r="2.6" fill="#FFE27A" />
      <rect x="6" y="-22" width="3" height="6" rx="1" fill="#E5484D" />
      {/* rodas */}
      {[34, BUS_W - 38].map((cx, i) => (
        <g key={cx} transform={`translate(${cx} -9)`}>
          <circle r="10" fill="#1A1A1A" stroke="#3A3A3A" strokeWidth="2" />
          <g
            ref={(el) => {
              wheelRefs.current[i] = el;
            }}
          >
            <circle r="4" fill="#A5A5A5" />
            <rect x="-0.8" y="-7" width="1.6" height="14" fill="#7A7A7A" />
            <rect x="-7" y="-0.8" width="14" height="1.6" fill="#7A7A7A" />
          </g>
        </g>
      ))}
    </g>
  );
}
