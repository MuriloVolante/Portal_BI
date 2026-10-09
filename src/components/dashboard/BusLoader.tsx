"use client";

import { useEffect, useId, useRef, useState } from "react";

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
/** O ônibus é desenhado em 385 × ~100 unidades e exibido nesta escala. */
const BUS_SCALE = 0.6;
const BUS_W = 385 * BUS_SCALE;
const CRUISE = 150; // px/s
const BRAKE_DIST = 130; // px antes do ponto em que começa a frear
const DWELL_MS = 1100; // tempo parado com as portas abertas
const DOOR_X = 346 * BUS_SCALE; // porta da frente (a que para no ponto), a partir da traseira

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

/** Entrada do recarregar: ônibus chega pela esquerda sobre o relatório… */
const INTRO_ENTER_S = 1.0;
/** …o fundo escuro cobre o relatório enquanto ele freia… */
const INTRO_BACKDROP = { start: 0.75, duration: 0.55 };
/** …e a cidade e a estrada surgem em volta dele. */
const INTRO_SCENE = { start: 1.05, duration: 0.7 };

const progress = (t: number, { start, duration }: { start: number; duration: number }) =>
  Math.min(1, Math.max(0, (t - start) / duration));

interface BusLoaderProps {
  /** O relatório carregou: o ônibus parte e a tela some. */
  arriving: boolean;
  onDone: () => void;
  /** Painel em segundo plano: não anima (economiza CPU). */
  paused?: boolean;
  /**
   * Entrada do recarregar: fundo transparente no começo (o relatório atual
   * continua visível), o ônibus entra pela esquerda e só depois o cenário
   * cobre a tela. `onCovered` avisa quando já dá para recarregar por baixo.
   */
  intro?: boolean;
  onCovered?: () => void;
}

export function BusLoader({ arriving, onDone, paused = false, intro = false, onCovered }: BusLoaderProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(800);
  const [caption, setCaption] = useState(STOPS[0].caption);

  // Elementos animados via ref (sem re-render a cada quadro).
  const skylineRef = useRef<SVGGElement>(null);
  const laneRef = useRef<SVGGElement>(null);
  const stopsRef = useRef<SVGGElement>(null);
  const busRef = useRef<SVGGElement>(null);
  const wheelRefs = useRef<(SVGGElement | null)[]>([]);
  const doorRefs = useRef<(SVGGElement | null)[]>([]);
  const puffRefs = useRef<(SVGCircleElement | null)[]>([]);
  // Partes que aparecem depois do ônibus na entrada do recarregar.
  const sceneRef = useRef<SVGGElement>(null);
  const edgesRef = useRef<SVGRectElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const captionRef = useRef<HTMLDivElement>(null);

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
    introT: 0,
    introDone: !intro,
    covered: !intro,
    done: false,
  });
  const arrivingRef = useRef(arriving);
  arrivingRef.current = arriving;
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const onCoveredRef = useRef(onCovered);
  onCoveredRef.current = onCovered;

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
    const s = state.current;
    if (!(paused || reduceMotion)) return;
    if (!s.covered) {
      // Sem animação a entrada não acontece: mostra tudo e libera o recarregar.
      s.covered = true;
      s.introDone = true;
      [sceneRef.current, edgesRef.current, backdropRef.current, captionRef.current].forEach((el) =>
        el?.style.setProperty("opacity", "1")
      );
      onCoveredRef.current?.();
    }
    if (arriving && !s.done) {
      s.done = true;
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

      if (!s.introDone) {
        // Entrada: o ônibus freia vindo da esquerda; o cenário surge em volta.
        s.introT += dt;
        const startX = -(busLeft + BUS_W + 30);
        const e = Math.min(1, s.introT / INTRO_ENTER_S);
        const prevX = s.busX;
        s.busX = startX * Math.pow(1 - e, 3);
        s.speed = dt > 0 ? (s.busX - prevX) / dt : 0;
        const back = progress(s.introT, INTRO_BACKDROP);
        const scene = progress(s.introT, INTRO_SCENE);
        const sceneEase = 1 - Math.pow(1 - scene, 2);
        backdropRef.current?.style.setProperty("opacity", back.toFixed(3));
        sceneRef.current?.style.setProperty("opacity", sceneEase.toFixed(3));
        sceneRef.current?.setAttribute("transform", `translate(0 ${((1 - sceneEase) * 10).toFixed(2)})`);
        edgesRef.current?.style.setProperty("opacity", sceneEase.toFixed(3));
        captionRef.current?.style.setProperty("opacity", sceneEase.toFixed(3));
        // Fundo opaco: o relatório já está coberto, pode recarregar por baixo.
        if (back >= 1 && !s.covered) {
          s.covered = true;
          onCoveredRef.current?.();
        }
        if (e >= 1 && scene >= 1) {
          s.introDone = true;
          s.busX = 0;
          s.speed = 0;
        }
      } else if (arrivingRef.current && !s.leaving) {
        s.leaving = true;
        s.dwellUntil = 0;
        setCaption("Chegamos! Bom trabalho.");
      }

      if (!s.introDone) {
        // (entrada em andamento: nada além dela)
      } else if (s.leaving) {
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
      const accelerating =
        s.leaving || (!s.introDone && s.speed > 40) || (s.introDone && !s.dwellUntil && s.speed > 20 && s.speed < CRUISE * 0.8);
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
        // folhas da porta da frente (medidas do desenho, antes da escala)
        const shift = s.door * 11 * (i === 0 ? -1 : 1);
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
    <div ref={wrapRef} className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden">
      <div ref={backdropRef} className="absolute inset-0 bg-background" style={{ opacity: intro ? 0 : 1 }} />
      <svg
        width="100%"
        height={HEIGHT * scale}
        viewBox={`0 0 ${vw} ${HEIGHT}`}
        className="relative max-w-full select-none overflow-visible"
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

        <g ref={sceneRef} style={{ opacity: intro ? 0 : 1 }}>
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
        <g ref={busRef} transform={`translate(${intro ? -BUS_W - 30 : busLeft} 0)`}>
          <g transform={`translate(0 ${ROAD_Y + 8})`}>
            <Bus wheelRefs={wheelRefs} doorRefs={doorRefs} />
          </g>
        </g>

        {/* bordas esfumaçadas */}
        <rect
          ref={edgesRef}
          x="0"
          y="0"
          width={vw}
          height={HEIGHT}
          fill="url(#bus-fade)"
          pointerEvents="none"
          style={{ opacity: intro ? 0 : 1 }}
        />
      </svg>

      <div ref={captionRef} className="relative px-4" style={{ opacity: intro ? 0 : 1 }}>
        <p key={caption} className="mt-2 min-h-[22px] animate-rise-in text-center text-[15px] text-foreground/90" aria-live="polite">
          {caption}
        </p>
        <p className="mt-1 text-center text-xs text-tertiary">Carregando o painel do Power BI</p>
      </div>
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

/** Pintura da frota (lateral direita do modelo Metropolitano). */
const PAINT = {
  green: "#A8CF44",
  greenDark: "#8DB534",
  gray: "#A9B8C1",
  graphite: "#4C4B4E",
  white: "#FFFFFF",
  band: "#0E0E0E",
};

// Medidas no desenho original (385 unidades de comprimento, chão em y = 0).
const BODY_PATH =
  "M4,-13 L2,-85 Q2,-93 10,-93 L352,-93 Q373,-93 379,-82 L385,-56 L385,-16 Q385,-13 382,-13 Z";
const WINDOWS = [[12, 50], [90, 134], [137, 182], [224, 276], [279, 326]];
const DOORS = [[54, 88], [185, 219], [332, 360]];
const WHEELS = [128, 309];
const ROOF_HATCHES = [[40, 66], [76, 86], [111, 121], [247, 269], [294, 304], [328, 338]];
const RIM_BOLTS = Array.from({ length: 10 }, (_, k) => [Math.cos((k * Math.PI) / 5) * 6.6, Math.sin((k * Math.PI) / 5) * 6.6]);

const pts = (points: number[][]) => points.map(([x, y]) => `${x},${y}`).join(" ");
const diamond = (cx: number, cy: number, h: number) => pts([[cx, cy - h], [cx + h, cy], [cx, cy + h], [cx - h, cy]]);

function Bus({
  wheelRefs,
  doorRefs,
}: {
  wheelRefs: React.MutableRefObject<(SVGGElement | null)[]>;
  doorRefs: React.MutableRefObject<(SVGGElement | null)[]>;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const bodyClip = `bus-body-${uid}`;
  const clusterClip = `bus-cluster-${uid}`;
  const glass = `bus-glass-${uid}`;
  const [frontDoorStart, frontDoorEnd] = DOORS[2];

  return (
    <g transform={`scale(${BUS_SCALE})`}>
      <defs>
        <clipPath id={bodyClip}>
          <path d={BODY_PATH} />
        </clipPath>
        <clipPath id={clusterClip}>
          <rect x="88" y="-53" width="97" height="40" />
        </clipPath>
        <linearGradient id={glass} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3A3A3A" />
          <stop offset=".5" stopColor="#6A6A6A" />
          <stop offset="1" stopColor="#2C2C2C" />
        </linearGradient>
      </defs>

      <ellipse cx="192.5" cy="0.5" rx="198" ry="5" fill="#000" opacity="0.28" />
      {/* farol no chão */}
      <polygon points="385,-30 520,-6 520,4 385,-20" fill="url(#bus-beam)" />

      {/* teto: ar-condicionado e escotilhas */}
      <rect x="141" y="-98.5" width="103" height="7" rx="3.5" fill={PAINT.green} stroke={PAINT.greenDark} strokeWidth="0.8" />
      {ROOF_HATCHES.map(([a, b]) => (
        <rect key={a} x={a} y="-95.5" width={b - a} height="3.2" rx="1.6" fill={PAINT.green} stroke={PAINT.greenDark} strokeWidth="0.7" />
      ))}

      <g clipPath={`url(#${bodyClip})`}>
        <rect x="0" y="-100" width="387" height="90" fill={PAINT.green} />

        {/* faixa do teto: frisos brancos e bloco cinza */}
        <polygon points="111,-93 116,-93 123,-84 118,-84" fill={PAINT.white} />
        <polygon points="161,-93 186,-93 193,-84 154,-84" fill={PAINT.gray} />
        <polygon points="156,-93 160.5,-93 153.5,-84 149,-84" fill={PAINT.white} />
        <polygon points="187.5,-93 192,-93 199,-84 194.5,-84" fill={PAINT.white} />
        <polygon points="277,-93 282,-93 289,-84 284,-84" fill={PAINT.white} />
        <text x="255" y="-86" textAnchor="middle" fontSize="5.2" fontWeight="700" letterSpacing="1.6" fill={PAINT.graphite}>
          PORTAL BI
        </text>

        {/* faixa das janelas */}
        <rect x="0" y="-84" width="362" height="31" fill={PAINT.band} />
        {WINDOWS.map(([a, b]) => (
          <rect key={a} x={a} y="-82.5" width={b - a} height="28" rx="3" fill={`url(#${glass})`} />
        ))}

        {/* traseira: seta branca ">" */}
        <polyline points="31,-53 45,-40 18,-13" fill="none" stroke={PAINT.white} strokeWidth="5" />

        {/* losangos entre a porta traseira e a do meio */}
        <g clipPath={`url(#${clusterClip})`}>
          <rect x="88" y="-53" width="97" height="40" fill={PAINT.green} />
          <polygon points={diamond(112, -51, 27)} fill={PAINT.gray} stroke={PAINT.white} strokeWidth="4" />
          <polygon points={diamond(186, -58, 30)} fill={PAINT.gray} stroke={PAINT.white} strokeWidth="4" />
          <polygon points={diamond(150, -32, 29)} fill={PAINT.graphite} stroke={PAINT.white} strokeWidth="4" />
          <polygon points={diamond(98, -42, 5.5)} fill={PAINT.graphite} stroke={PAINT.white} strokeWidth="2.2" />
        </g>

        {/* painel grafite com ponta ">" antes da porta da frente */}
        <polygon points="219,-53 316,-53 325,-42.5 316,-32 219,-32" fill={PAINT.graphite} />
        <polyline points="319.5,-53 329,-42.5 319.5,-32" fill="none" stroke={PAINT.white} strokeWidth="3" />
        <rect x="250" y="-27" width="15" height="12" rx="1" fill="#3F4A26" opacity="0.55" />
        <rect x="266" y="-27" width="15" height="12" rx="1" fill="#3F4A26" opacity="0.55" />

        {/* frente: máscara preta e para-brisa */}
        <path d="M362,-93 L352,-93 Q373,-93 379,-82 L385,-56 L385,-40 L364,-40 L362,-53 Z" fill={PAINT.band} />
        <path d="M366,-86 Q374,-86 377,-78 L382,-56 L382,-45 L367,-45 Z" fill={`url(#${glass})`} opacity="0.9" />
        <rect x="379" y="-34" width="5" height="4" rx="1.5" fill="#FFF6D0" />
      </g>

      {/* portas (a da frente abre nos pontos) */}
      {DOORS.map(([a, b]) => {
        const mid = (a + b) / 2;
        const leaves = [
          [a + 1.5, mid - 0.8],
          [mid + 0.8, b - 1.5],
        ];
        const isFront = a === frontDoorStart && b === frontDoorEnd;
        return (
          <g key={a}>
            <rect x={a} y="-84" width={b - a} height="70" fill={PAINT.band} />
            {leaves.map(([l0, l1], i) => (
              <g
                key={i}
                ref={
                  isFront
                    ? (el) => {
                        doorRefs.current[i] = el;
                      }
                    : undefined
                }
              >
                <rect x={l0} y="-82" width={l1 - l0} height="67" rx="1.6" fill={PAINT.green} />
                <rect x={l0 + 1.6} y="-80" width={l1 - l0 - 3.2} height="28" rx="1.5" fill={`url(#${glass})`} />
                <rect x={l0 + 1.6} y="-49.5" width={l1 - l0 - 3.2} height="32.5" rx="1.5" fill={`url(#${glass})`} />
              </g>
            ))}
          </g>
        );
      })}

      {/* retrovisor */}
      <path d="M378,-84 Q388,-84 389,-78 L389,-70" fill="none" stroke={PAINT.band} strokeWidth="1.6" strokeLinecap="round" />
      <rect x="386.5" y="-72" width="5" height="10" rx="1.6" fill={PAINT.band} />

      {/* caixas de roda e rodas */}
      {WHEELS.map((cx, i) => (
        <g key={cx} transform={`translate(${cx} -15)`}>
          <path d="M-20,2 A20,20 0 0 1 20,2 Z" fill="#222" />
          <circle r="15" fill="#151515" />
          <g
            ref={(el) => {
              wheelRefs.current[i] = el;
            }}
          >
            <circle r="9.5" fill="#C9C9C9" stroke="#9A9A9A" strokeWidth="0.8" />
            {RIM_BOLTS.map(([x, y], k) => (
              <circle key={k} cx={x.toFixed(2)} cy={y.toFixed(2)} r="1.1" fill="#8A8A8A" />
            ))}
            <circle r="3.4" fill="#A8A8A8" stroke="#7A7A7A" strokeWidth="0.7" />
          </g>
        </g>
      ))}
    </g>
  );
}
