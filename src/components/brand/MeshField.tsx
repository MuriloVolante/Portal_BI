"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

const LIME = [150, 215, 55];
const CYAN = [35, 150, 180];
/** Faixas de cor (ciano → lima) com o brilho pré-renderizado. */
const HALO_STEPS = 6;

interface Node {
  /** Posição relativa ao centro, em fração do raio (sobrevive a resize). */
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Profundidade 0 (fundo) a 1 (frente): tamanho, brilho e cor. */
  z: number;
  seed: number;
}

function mixColor(t: number) {
  return LIME.map((v, i) => Math.round(CYAN[i] + (v - CYAN[i]) * t));
}
function rgba(t: number, a: number) {
  const c = mixColor(t);
  return `rgba(${c[0]},${c[1]},${c[2]},${a})`;
}

/** Brilho radial desenhado uma vez por faixa de cor e reaproveitado. */
function makeHalos(): HTMLCanvasElement[] {
  return Array.from({ length: HALO_STEPS }, (_, i) => {
    const t = i / (HALO_STEPS - 1);
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const g = c.getContext("2d")!;
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, rgba(t, 1));
    grad.addColorStop(1, rgba(t, 0));
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    return c;
  });
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
 * Malha orgânica: poucos nós à deriva num campo de fluxo, com distância
 * mínima entre eles (nunca se amontoam) e ligações que nascem e somem pela
 * proximidade. O ponteiro arrasta e gira o fluxo; o impulso se dissipa
 * devagar. Pausa fora da tela e respeita "reduzir movimento".
 */
export function MeshField({ className, centerY = 0.5, spread = 0.44 }: MeshFieldProps) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const halos = makeHalos();
    let width = 0;
    let height = 0;
    let radius = 1;
    let nodes: Node[] = [];
    let sx = new Float32Array(0);
    let sy = new Float32Array(0);
    // Distância mínima entre nós (fração do raio), calculada pela área da
    // nuvem dividida pela quantidade de nós: sempre cabe sem tremer.
    let separation = 0.3;
    let time = Math.random() * 100;
    let last = 0;
    let raf = 0;
    let visible = true;
    const pointer = { x: 0, y: 0, vx: 0, vy: 0, active: 0, inside: false, lastT: 0 };

    function seedNodes() {
      const count = Math.max(22, Math.min(38, Math.round((width * height) / 24000)));
      nodes = Array.from({ length: count }, () => {
        const a = Math.random() * Math.PI * 2;
        const r = Math.sqrt(Math.random()) * 0.92;
        return { x: Math.cos(a) * r, y: Math.sin(a) * r * 0.9, vx: 0, vy: 0, z: Math.random(), seed: Math.random() * 10 };
      });
      separation = Math.sqrt(2.4 / count) * 0.9;
      sx = new Float32Array(count);
      sy = new Float32Array(count);
    }

    function resize() {
      const rect = canvas!.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
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

      // separação: nós perto demais se empurram, então a malha nunca vira um bolo
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d = Math.hypot(dx, dy);
          if (d >= separation || d < 1e-6) continue;
          const push = (1 - d / separation) * 0.0009 * k;
          const ux = dx / d;
          const uy = dy / d;
          a.vx += ux * push;
          a.vy += uy * push;
          b.vx -= ux * push;
          b.vy -= uy * push;
        }
      }

      const cx = width / 2;
      const cy = height * centerY;
      const influence = Math.min(width, height) * 0.32;

      for (const n of nodes) {
        // deriva do campo de fluxo (em unidades do raio)
        const ang = flowAngle(n.x, n.y, time * 0.55, n.seed);
        n.vx += Math.cos(ang) * 0.000025 * k;
        n.vy += Math.sin(ang) * 0.000025 * k;

        // coesão fraca: depois de uma perturbação a nuvem se reorganiza aos poucos
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

        // ponteiro: arrasta junto e gira em volta
        if (pointer.active > 0.01) {
          const dx = cx + n.x * radius - pointer.x;
          const dy = cy + n.y * radius - pointer.y;
          const d = Math.hypot(dx, dy);
          if (d < influence && d > 0.5) {
            const f = (1 - d / influence) * pointer.active;
            const ux = dx / d;
            const uy = dy / d;
            n.vx += ((pointer.vx * 0.05 - uy * 0.9 + ux * 0.18) * f * k) / radius;
            n.vy += ((pointer.vy * 0.05 + ux * 0.9 + uy * 0.18) * f * k) / radius;
          }
        }

        // atrito baixo: o impulso do mouse dura alguns segundos
        const drag = Math.pow(0.985, k);
        n.vx *= drag;
        n.vy *= drag;
        const speed = Math.hypot(n.vx, n.vy);
        if (speed > 0.012) {
          n.vx = (n.vx / speed) * 0.012;
          n.vy = (n.vy / speed) * 0.012;
        }
        n.x += n.vx * k;
        n.y += n.vy * k;
        n.z = Math.min(1, Math.max(0, n.z + Math.sin(time * 0.4 + n.seed) * 0.0015 * k));
      }
    }

    function draw() {
      const cx = width / 2;
      const cy = height * centerY;
      const link = radius * 0.62;
      const link2 = link * link;
      const count = nodes.length;
      for (let i = 0; i < count; i++) {
        sx[i] = cx + nodes[i].x * radius;
        sy[i] = cy + nodes[i].y * radius;
      }

      ctx!.clearRect(0, 0, width, height);
      ctx!.lineCap = "round";

      for (let i = 0; i < count; i++) {
        for (let j = i + 1; j < count; j++) {
          const dx = sx[i] - sx[j];
          const dy = sy[i] - sy[j];
          const d2 = dx * dx + dy * dy;
          if (d2 > link2) continue;
          const closeness = 1 - Math.sqrt(d2) / link;
          const depth = (nodes[i].z + nodes[j].z) / 2;
          ctx!.strokeStyle = rgba(depth, Math.pow(closeness, 1.2) * (0.22 + 0.5 * depth));
          ctx!.lineWidth = 0.6 + closeness * (0.6 + depth * 0.9);
          ctx!.beginPath();
          ctx!.moveTo(sx[i], sy[i]);
          ctx!.lineTo(sx[j], sy[j]);
          ctx!.stroke();
        }
      }

      // fios até o ponteiro enquanto ele está sobre a malha
      if (pointer.active > 0.02) {
        const reach = link * 1.1;
        ctx!.lineWidth = 0.8;
        for (let i = 0; i < count; i++) {
          const d = Math.hypot(sx[i] - pointer.x, sy[i] - pointer.y);
          if (d > reach) continue;
          ctx!.strokeStyle = rgba(1, (1 - d / reach) * 0.45 * pointer.active);
          ctx!.beginPath();
          ctx!.moveTo(sx[i], sy[i]);
          ctx!.lineTo(pointer.x, pointer.y);
          ctx!.stroke();
        }
      }

      // nós: todos com o mesmo estilo, variando só com a profundidade
      for (let i = 0; i < count; i++) {
        const z = nodes[i].z;
        const r = 1.4 + z * 2;
        const halo = halos[Math.round(z * (HALO_STEPS - 1))];
        const hr = r * 5;
        ctx!.globalAlpha = 0.14 + 0.2 * z + 0.12 * pointer.active;
        ctx!.drawImage(halo, sx[i] - hr, sy[i] - hr, hr * 2, hr * 2);
        ctx!.globalAlpha = 1;
        ctx!.fillStyle = rgba(z, 0.5 + 0.5 * z);
        ctx!.beginPath();
        ctx!.arc(sx[i], sy[i], r, 0, Math.PI * 2);
        ctx!.fill();
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
    // Passos antes do primeiro quadro: a nuvem já nasce espaçada e "assentada".
    for (let i = 0; i < 180; i++) step(1 / 60);
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
