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
  const [honk, setHonk] = useState(0);

  // Elementos animados via ref (sem re-render a cada quadro).
  const skylineRef = useRef<SVGGElement>(null);
  const laneRef = useRef<SVGGElement>(null);
  const stopsRef = useRef<SVGGElement>(null);
  const busRef = useRef<SVGGElement>(null);
  const wheelRefs = useRef<(SVGGElement | null)[]>([]);
  const doorRefs = useRef<(SVGRectElement | null)[]>([]);
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

/** Pintura inspirada na frota: verde-limão com setas grafite/prata e frisos brancos. */
const PAINT = {
  green: "#86C440",
  greenLight: "#9BD456",
  greenDark: "#6EA632",
  graphite: "#3A3A3A",
  silver: "#A3A3A3",
  white: "#F4F4F4",
  glass: "#232A26",
  mask: "#1B1B1B",
};

/** Seta "<" da faixa inferior, com ponta em (tipX) e topo/base em x + depth. */
function chevron(x: number, depth: number, top: number, bottom: number) {
  const mid = (top + bottom) / 2;
  return `${x + depth},${top} ${x},${mid} ${x + depth},${bottom}`;
}

function Bus({
  wheelRefs,
  doorRefs,
}: {
  wheelRefs: React.MutableRefObject<(SVGGElement | null)[]>;
  doorRefs: React.MutableRefObject<(SVGRectElement | null)[]>;
}) {
  const clipId = `bus-body${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const W = BUS_W;
  // Origem: traseira do ônibus, no chão. Desenhado virado para a direita.
  const body = `M4,-12 L4,-50 Q4,-58 12,-58 L${W - 16},-58 Q${W - 3},-58 ${W},-45 L${W},-14 Q${W},-10 ${W - 4},-10 L8,-10 Q4,-10 4,-12 Z`;
  const TOP = -33; // faixa inferior (setas), da janela até a saia
  const BOTTOM = -14;
  const D = 12; // profundidade das setas
  const MID = (TOP + BOTTOM) / 2;
  const wheelsX = [34, W - 38];

  return (
    <g>
      <ellipse cx={W / 2} cy="1" rx={W / 2 + 4} ry="4" fill="#000" opacity="0.28" />
      {/* farol no chão */}
      <polygon points={`${W},-14 ${W + 90},-2 ${W + 90},4 ${W},-8`} fill="url(#bus-beam)" />

      {/* ar-condicionado no teto */}
      <rect x="34" y="-62" width="46" height="5" rx="2" fill={PAINT.greenLight} />
      <rect x="96" y="-61" width="26" height="4" rx="2" fill={PAINT.greenLight} />

      <clipPath id={clipId}>
        <path d={body} />
      </clipPath>
      <g clipPath={`url(#${clipId})`}>
        <rect x="0" y="-60" width={W + 2} height="52" fill={PAINT.green} />
        <rect x="0" y="-58" width={W + 2} height="3" fill={PAINT.greenLight} />

        {/* faixa inferior: seta prata e seta grafite contornadas de branco,
            e o painel grafite seguindo até a porta */}
        <polygon points={`20,${TOP} 46,${TOP} ${46 - D},${MID} 46,${BOTTOM} 20,${BOTTOM} ${20 - D},${MID}`} fill={PAINT.silver} />
        <polygon points={`46,${TOP} ${DOOR_X - 11},${TOP} ${DOOR_X - 11},${BOTTOM} 46,${BOTTOM} ${46 - D},${MID}`} fill={PAINT.graphite} />
        {[20, 46, 72].map((x) => (
          <polyline key={x} points={chevron(x - D, D, TOP, BOTTOM)} fill="none" stroke={PAINT.white} strokeWidth="2" strokeLinejoin="round" />
        ))}
        {/* frente: painel grafite com seta branca */}
        <polygon points={`${W - 22},-24 ${W - 5},-24 ${W - 5},-17 ${W - 22},-17 ${W - 26},-20.5`} fill={PAINT.graphite} />
        <polyline points={chevron(W - 26, 4, -24, -17)} fill="none" stroke={PAINT.white} strokeWidth="1.4" strokeLinejoin="round" />

        {/* saia */}
        <rect x="0" y="-14" width={W + 2} height="4" fill={PAINT.greenDark} />

        {/* janelas contínuas com colunas */}
        <rect x="8" y="-52" width={W - 46} height="19" rx="2" fill={PAINT.glass} />
        {[30, 52, 74, 96].map((x) => (
          <rect key={x} x={x} y="-52" width="2" height="19" fill="#151A17" />
        ))}
        <rect x="11" y="-50" width="5" height="15" rx="1" fill={CYAN} opacity="0.22" />
        <rect x="56" y="-50" width="5" height="15" rx="1" fill={CYAN} opacity="0.18" />

        {/* máscara preta da frente e para-brisa */}
        <path d={`M${W - 34},-58 L${W - 16},-58 Q${W - 3},-58 ${W},-45 L${W},-27 L${W - 34},-27 Z`} fill={PAINT.mask} />
        <path d={`M${W - 30},-52 L${W - 14},-52 Q${W - 6},-51 ${W - 4},-43 L${W - 4},-31 L${W - 30},-31 Z`} fill={PAINT.glass} />
        <rect x={W - 26} y="-50" width="4" height="16" rx="1" fill={CYAN} opacity="0.3" />
        {/* letreiro lateral */}
        <rect x={W - 82} y="-57" width="44" height="5" rx="1.5" fill={PAINT.mask} />
        <text x={W - 60} y="-53.1" textAnchor="middle" fontSize="4.6" fontWeight="700" letterSpacing="0.8" fill="#EDEDED">
          PORTAL BI
        </text>
      </g>

      {/* porta: moldura verde, folhas de vidro que abrem nos pontos */}
      <rect x={DOOR_X - 10} y="-52" width="20" height="41" rx="2" fill={PAINT.greenDark} />
      <rect x={DOOR_X - 9} y="-51" width="18" height="39" rx="1.5" fill="#151A17" />
      {[0, 1].map((i) => (
        <rect
          key={i}
          ref={(el) => {
            doorRefs.current[i] = el;
          }}
          x={i === 0 ? DOOR_X - 9 : DOOR_X}
          y="-51"
          width="9"
          height="39"
          rx="1.5"
          fill={PAINT.glass}
          stroke={PAINT.green}
          strokeWidth="1"
        />
      ))}

      {/* retrovisor, luzes */}
      <path d={`M${W - 1},-48 L${W + 5},-46 L${W + 5},-38`} fill="none" stroke={PAINT.mask} strokeWidth="2" strokeLinecap="round" />
      <circle cx={W - 2} cy="-19" r="2.6" fill="#FFF6D0" />
      <rect x="4" y="-28" width="3" height="9" rx="1" fill="#E5484D" />

      {/* caixas de roda e rodas */}
      {wheelsX.map((cx, i) => (
        <g key={cx} transform={`translate(${cx} -9)`}>
          <path d="M-13,-1 A13,13 0 0 1 13,-1 Z" fill="#141414" />
          <circle r="10" fill="#161616" stroke="#2E2E2E" strokeWidth="1.5" />
          <g
            ref={(el) => {
              wheelRefs.current[i] = el;
            }}
          >
            <circle r="5.2" fill="#BDBDBD" />
            <circle r="2" fill="#7A7A7A" />
            {[0, 60, 120].map((a) => (
              <rect key={a} x="-0.7" y="-5" width="1.4" height="10" fill="#8F8F8F" transform={`rotate(${a})`} />
            ))}
          </g>
        </g>
      ))}
    </g>
  );
}
