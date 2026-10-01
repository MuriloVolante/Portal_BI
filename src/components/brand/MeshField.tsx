"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

const LIME = [150, 215, 55];
const CYAN = [35, 150, 180];

interface Node {
  /** Posição relativa ao centro, em fração do raio (sobrevive a resize). */
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Profundidade 0 (fundo) a 1 (frente): tamanho, brilho e cor. */
  z: number;
  seed: number;
  hub: boolean;
}

function rgba(t: number, a: number) {
  const c = LIME.map((v, i) => Math.round(CYAN[i] + (v - CYAN[i]) * t));
  return `rgba(${c[0]},${c[1]},${c[2]},${a})`;
}

/** Campo de fluxo suave: soma de senoides, muda devagar no tempo. */
function flowAngle(x: number, y: number, t: number, seed: number) {
  return (
    Math.sin(x * 1.9 + t * 0.9 + seed) * 1.4 +
    Math.sin(y * 2.3 - t * 0.7) * 1.2 +
    Math.sin((x + y) * 1.3 + t * 0.5 + seed * 0.5)
  );
}

interface MeshFieldProps {
  className?: string;
  /** Centro vertical da nuvem, em fração da altura (0.5 = meio). */
  centerY?: number;
  /** Raio da nuvem, em fração do menor lado. */
  spread?: number;
}

/**
 * Malha orgânica: nós à deriva num campo de fluxo formam uma nuvem
 * irregular, com ligações que nascem e somem pela distância. O ponteiro
 * arrasta e gira o fluxo; o impulso se dissipa devagar, então a forma muda
 * de verdade em vez de só voltar. Pausa fora da tela e respeita "reduzir
 * movimento" (quadro estático).
 */
export function MeshField({ className, centerY = 0.5, spread = 0.44 }: MeshFieldProps) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let width = 0;
    let height = 0;
    let radius = 1;
    let nodes: Node[] = [];
    let time = Math.random() * 100;
    let last = 0;
    let raf = 0;
    let visible = true;
    const pointer = { x: 0, y: 0, vx: 0, vy: 0, active: 0, inside: false, lastT: 0 };

    function seedNodes() {
      const count = Math.max(34, Math.min(105, Math.round((width * height) / 10500)));
      nodes = Array.from({ length: count }, (_, i) => {
        const a = Math.random() * Math.PI * 2;
        const r = Math.sqrt(Math.random()) * 0.95;
        return {
          x: Math.cos(a) * r,
          y: Math.sin(a) * r * 0.9,
          vx: 0,
          vy: 0,
          z: Math.random(),
          seed: Math.random() * 10,
          hub: i < 3,
        };
      });
    }

    function resize() {
      const rect = canvas!.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const first = width === 0;
      width = rect.width;
      height = rect.height;
      radius = Math.min(width, height) * spread;
      canvas!.width = Math.max(1, Math.round(width * dpr));
      canvas!.height = Math.max(1, Math.round(height * dpr));
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (first || nodes.length === 0) seedNodes();
    }

    function step(dt: number) {
      const k = dt * 60; // frames de 60Hz decorridos
      time += dt;
      const breathe = 1 + Math.sin(time * 0.35) * 0.06;
      pointer.vx *= Math.pow(0.82, k);
      pointer.vy *= Math.pow(0.82, k);
      pointer.active += ((pointer.inside ? 1 : 0) - pointer.active) * Math.min(1, 0.08 * k);

      const cx = width / 2;
      const cy = height * centerY;
      const influence = Math.min(width, height) * 0.32;

      for (const n of nodes) {
        // deriva do campo de fluxo (em unidades do raio)
        const ang = flowAngle(n.x, n.y, time * 0.55, n.seed);
        n.vx += Math.cos(ang) * 0.000025 * k;
        n.vy += Math.sin(ang) * 0.000025 * k;

        // coesão bem fraca: depois de uma perturbação a nuvem se reorganiza
        // aos poucos, sem voltar de uma vez para a forma anterior
        n.vx -= n.x * 0.000012 * k;
        n.vy -= n.y * 0.000012 * k;

        // contenção suave numa nuvem que "respira"
        const dist = Math.hypot(n.x, n.y * 1.1);
        const limit = 0.92 * breathe;
        if (dist > limit) {
          const pull = (dist - limit) * 0.012 * k;
          n.vx -= (n.x / dist) * pull;
          n.vy -= (n.y / dist) * pull;
        }

        // ponteiro: arrasta junto, gira em volta e abre caminho
        if (pointer.active > 0.01) {
          const px = cx + n.x * radius;
          const py = cy + n.y * radius;
          const dx = px - pointer.x;
          const dy = py - pointer.y;
          const d = Math.hypot(dx, dy);
          if (d < influence && d > 0.5) {
            const f = (1 - d / influence) * pointer.active;
            const ux = dx / d;
            const uy = dy / d;
            n.vx += ((pointer.vx * 0.05 + -uy * 0.9 + ux * 0.18) * f * k) / radius;
            n.vy += ((pointer.vy * 0.05 + ux * 0.9 + uy * 0.18) * f * k) / radius;
          }
        }

        // atrito baixo: o impulso do mouse dura alguns segundos
        const drag = Math.pow(0.985, k);
        n.vx *= drag;
        n.vy *= drag;
        const speed = Math.hypot(n.vx, n.vy);
        const max = 0.012;
        if (speed > max) {
          n.vx = (n.vx / speed) * max;
          n.vy = (n.vy / speed) * max;
        }
        n.x += n.vx * k;
        n.y += n.vy * k;
        n.z = Math.min(1, Math.max(0, n.z + Math.sin(time * 0.4 + n.seed) * 0.0015 * k));
      }
    }

    function draw() {
      const cx = width / 2;
      const cy = height * centerY;
      const link = Math.max(70, Math.min(150, Math.min(width, height) * 0.2));
      const pts = nodes.map((n) => ({ ...n, sx: cx + n.x * radius, sy: cy + n.y * radius }));

      ctx!.clearRect(0, 0, width, height);
      ctx!.lineCap = "round";

      for (let i = 0; i < pts.length; i++) {
        const a = pts[i];
        for (let j = i + 1; j < pts.length; j++) {
          const b = pts[j];
          const dx = a.sx - b.sx;
          const dy = a.sy - b.sy;
          const d2 = dx * dx + dy * dy;
          if (d2 > link * link) continue;
          const closeness = 1 - Math.sqrt(d2) / link;
          const depth = (a.z + b.z) / 2;
          ctx!.strokeStyle = rgba(depth, Math.pow(closeness, 1.3) * (0.18 + 0.5 * depth));
          ctx!.lineWidth = 0.5 + closeness * (0.6 + depth * 0.9);
          ctx!.beginPath();
          ctx!.moveTo(a.sx, a.sy);
          ctx!.lineTo(b.sx, b.sy);
          ctx!.stroke();
        }
      }

      // fios até o ponteiro enquanto ele está sobre a malha
      if (pointer.active > 0.02) {
        const reach = link * 1.15;
        for (const p of pts) {
          const d = Math.hypot(p.sx - pointer.x, p.sy - pointer.y);
          if (d > reach) continue;
          ctx!.strokeStyle = rgba(1, (1 - d / reach) * 0.45 * pointer.active);
          ctx!.lineWidth = 0.8;
          ctx!.beginPath();
          ctx!.moveTo(p.sx, p.sy);
          ctx!.lineTo(pointer.x, pointer.y);
          ctx!.stroke();
        }
      }

      for (const p of pts.sort((a, b) => a.z - b.z)) {
        const r = p.hub ? 3.6 + p.z * 1.6 : 1 + p.z * 2.1;
        const halo = ctx!.createRadialGradient(p.sx, p.sy, 0, p.sx, p.sy, r * 5);
        halo.addColorStop(0, rgba(p.z, 0.16 + 0.22 * p.z + 0.15 * pointer.active));
        halo.addColorStop(1, rgba(p.z, 0));
        ctx!.fillStyle = halo;
        ctx!.beginPath();
        ctx!.arc(p.sx, p.sy, r * 5, 0, Math.PI * 2);
        ctx!.fill();

        ctx!.fillStyle = rgba(p.z, 0.45 + 0.55 * p.z);
        ctx!.beginPath();
        ctx!.arc(p.sx, p.sy, r, 0, Math.PI * 2);
        ctx!.fill();
        if (p.hub) {
          ctx!.strokeStyle = "rgba(38,38,38,0.9)";
          ctx!.lineWidth = 1.4;
          ctx!.stroke();
        }
      }
    }

    function frame(now: number) {
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
      last = now;
      step(dt);
      draw();
      raf = requestAnimationFrame(frame);
    }
    function start() {
      if (reduceMotion || raf || !visible || document.hidden) return;
      last = 0;
      raf = requestAnimationFrame(frame);
    }
    function stop() {
      cancelAnimationFrame(raf);
      raf = 0;
    }

    resize();
    // Alguns passos antes do primeiro quadro: a nuvem já nasce "assentada".
    for (let i = 0; i < 90; i++) step(1 / 60);
    draw();

    const ro = new ResizeObserver(() => {
      resize();
      draw();
    });
    ro.observe(canvas);
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) start();
      else stop();
    });
    io.observe(canvas);
    const onVisibility = () => (document.hidden ? stop() : start());
    document.addEventListener("visibilitychange", onVisibility);

    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const now = performance.now();
      if (pointer.inside && pointer.lastT) {
        const dt = Math.max(8, now - pointer.lastT) / 16.7;
        pointer.vx = Math.max(-40, Math.min(40, (x - pointer.x) / dt));
        pointer.vy = Math.max(-40, Math.min(40, (y - pointer.y) / dt));
      }
      pointer.x = x;
      pointer.y = y;
      pointer.lastT = now;
      pointer.inside = true;
    };
    const onLeave = () => {
      pointer.inside = false;
      pointer.lastT = 0;
    };
    if (!reduceMotion) {
      canvas.addEventListener("pointermove", onMove);
      canvas.addEventListener("pointerleave", onLeave);
      canvas.addEventListener("pointercancel", onLeave);
    }

    start();

    return () => {
      stop();
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerleave", onLeave);
      canvas.removeEventListener("pointercancel", onLeave);
    };
  }, [centerY, spread]);

  return <canvas ref={ref} aria-hidden="true" className={cn("block h-full w-full touch-pan-y", className)} />;
}
