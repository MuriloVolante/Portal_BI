"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

// Bipirâmide hexagonal: hub central + anel de 6 nós (o hexágono da marca)
// + 2 polos na profundidade. 9 nós no total.
const RING = Array.from({ length: 6 }, (_, k) => {
  const a = (k * Math.PI) / 3;
  return [Math.sin(a), -Math.cos(a), 0] as const;
});
const NODES: ReadonlyArray<readonly [number, number, number]> = [
  [0, 0, 0],
  ...RING,
  [0, 0, 0.78],
  [0, 0, -0.78],
];
const EDGES: Array<[number, number]> = [
  ...RING.map((_, k): [number, number] => [1 + k, 1 + ((k + 1) % 6)]),
  ...RING.map((_, k): [number, number] => [0, 1 + k]),
  ...RING.map((_, k): [number, number] => [7, 1 + k]),
  ...RING.map((_, k): [number, number] => [8, 1 + k]),
];

const LIME = [150, 215, 55];
const CYAN = [35, 150, 180];
const ATTRACT_RADIUS = 230;
const ATTRACT_FORCE = 46;

function mix(t: number) {
  const c = LIME.map((v, i) => Math.round(v + (CYAN[i] - v) * t));
  return (a: number) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
}

interface MeshCanvasProps {
  className?: string;
  /** Atração dos nós pelo cursor. Desligada em tamanhos pequenos. */
  interactive?: boolean;
}

/** Malha 3D girando (canvas). Pausa fora da tela e respeita "reduzir movimento". */
export function MeshCanvas({ className, interactive = true }: MeshCanvasProps) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const offsets = NODES.map(() => ({ x: 0, y: 0, vx: 0, vy: 0 }));
    const pointer = { x: 0, y: 0, inside: false };
    let width = 0;
    let height = 0;
    let angle = 0.6;
    let elapsed = 0;
    let hover = 0;
    let last = 0;
    let raf = 0;
    let visible = true;

    function resize() {
      const rect = canvas!.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      width = rect.width;
      height = rect.height;
      canvas!.width = Math.max(1, Math.round(width * dpr));
      canvas!.height = Math.max(1, Math.round(height * dpr));
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function draw() {
      const cx = width / 2;
      const cy = height / 2;
      const radius = Math.min(width, height) * 0.36;
      const small = Math.min(width, height) < 120;
      const tilt = Math.sin(elapsed * 0.28) * 0.34;
      const cosY = Math.cos(angle), sinY = Math.sin(angle);
      const cosX = Math.cos(tilt), sinX = Math.sin(tilt);

      const pts = NODES.map(([x, y, z], i) => {
        const x1 = x * cosY + z * sinY;
        const z1 = -x * sinY + z * cosY;
        const y2 = y * cosX - z1 * sinX;
        const z2 = y * sinX + z1 * cosX;
        const p = 1 / (1 + z2 * 0.3);
        return {
          x: cx + x1 * radius * p + offsets[i].x,
          y: cy + y2 * radius * p + offsets[i].y,
          z: z2,
          p,
        };
      });

      ctx!.clearRect(0, 0, width, height);
      const baseLine = (small ? 1.1 : 1.6) * (1 + 0.35 * hover);

      const order = EDGES.map((e, i) => ({ e, z: (pts[e[0]].z + pts[e[1]].z) / 2, i })).sort((a, b) => b.z - a.z);
      for (const { e } of order) {
        const a = pts[e[0]], b = pts[e[1]];
        const grad = ctx!.createLinearGradient(a.x, a.y, b.x, b.y);
        grad.addColorStop(0, mix((a.z + 1) / 2)(0.55 * a.p));
        grad.addColorStop(1, mix((b.z + 1) / 2)(0.55 * b.p));
        ctx!.strokeStyle = grad;
        ctx!.lineWidth = baseLine * ((a.p + b.p) / 2);
        ctx!.beginPath();
        ctx!.moveTo(a.x, a.y);
        ctx!.lineTo(b.x, b.y);
        ctx!.stroke();
      }

      const nodeOrder = pts.map((p, i) => ({ ...p, i })).sort((a, b) => b.z - a.z);
      for (const n of nodeOrder) {
        const color = mix((n.z + 1) / 2);
        const r = (n.i === 0 ? (small ? 3.2 : 5.5) : small ? 1.9 : 3.2) * n.p;
        const halo = ctx!.createRadialGradient(n.x, n.y, 0, n.x, n.y, r * 4);
        halo.addColorStop(0, color((0.22 + 0.3 * hover) * n.p));
        halo.addColorStop(1, color(0));
        ctx!.fillStyle = halo;
        ctx!.beginPath();
        ctx!.arc(n.x, n.y, r * 4, 0, Math.PI * 2);
        ctx!.fill();
        ctx!.fillStyle = color(Math.min(1, 0.55 + 0.45 * n.p));
        ctx!.beginPath();
        ctx!.arc(n.x, n.y, r, 0, Math.PI * 2);
        ctx!.fill();
      }
      return pts;
    }

    function step(now: number) {
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
      last = now;
      elapsed += dt;
      angle += 0.0042 * dt * 60;
      hover += ((pointer.inside ? 1 : 0) - hover) * 0.12;

      const pts = draw();
      for (let i = 0; i < offsets.length; i++) {
        const o = offsets[i];
        let tx = 0, ty = 0;
        if (pointer.inside) {
          const dx = pointer.x - (pts[i].x - o.x);
          const dy = pointer.y - (pts[i].y - o.y);
          const d = Math.hypot(dx, dy);
          if (d > 0.001 && d < ATTRACT_RADIUS) {
            const f = Math.min((1 - d / ATTRACT_RADIUS) * ATTRACT_FORCE, d);
            tx = (dx / d) * f;
            ty = (dy / d) * f;
          }
        }
        o.vx = (o.vx + (tx - o.x) * 0.14) * 0.74;
        o.vy = (o.vy + (ty - o.y) * 0.14) * 0.74;
        o.x += o.vx;
        o.y += o.vy;
      }
      raf = requestAnimationFrame(step);
    }

    function start() {
      if (reduceMotion || raf || !visible || document.hidden) return;
      last = 0;
      raf = requestAnimationFrame(step);
    }
    function stop() {
      cancelAnimationFrame(raf);
      raf = 0;
    }

    resize();
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
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
      pointer.inside = true;
    };
    const onLeave = () => {
      pointer.inside = false;
    };
    if (interactive && !reduceMotion) {
      canvas.addEventListener("pointermove", onMove);
      canvas.addEventListener("pointerleave", onLeave);
    }

    start();

    return () => {
      stop();
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerleave", onLeave);
    };
  }, [interactive]);

  return <canvas ref={ref} aria-hidden="true" className={cn("block h-full w-full", className)} />;
}
