import { useEffect, useMemo, useRef } from 'react';

const PITCH_ASPECT = 68 / 105;
const GRID_W = 72;
const GRID_H = 108;
const KERNEL_SIGMA = 2.8;

/**
 * @param {number} t 0–1
 */
function heatColor(t) {
  const v = Math.max(0, Math.min(1, t));
  let r;
  let g;
  let b;
  let a;

  if (v < 0.35) {
    const p = v / 0.35;
    r = 22 + p * 18;
    g = 120 + p * 60;
    b = 60 + p * 20;
    a = 0.15 + p * 0.35;
  } else if (v < 0.7) {
    const p = (v - 0.35) / 0.35;
    r = 40 + p * 200;
    g = 180 - p * 40;
    b = 80 - p * 50;
    a = 0.5 + p * 0.25;
  } else {
    const p = (v - 0.7) / 0.3;
    r = 240 + p * 15;
    g = 140 - p * 100;
    b = 30 - p * 20;
    a = 0.75 + p * 0.2;
  }

  return `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${a.toFixed(2)})`;
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} w
 * @param {number} h
 */
function drawPitchBase(ctx, w, h) {
  ctx.fillStyle = '#1a3d22';
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = 1;

  const padX = w * 0.06;
  const padY = h * 0.04;
  const fieldW = w - padX * 2;
  const fieldH = h - padY * 2;

  ctx.strokeRect(padX, padY, fieldW, fieldH);
  ctx.beginPath();
  ctx.moveTo(padX, padY + fieldH / 2);
  ctx.lineTo(padX + fieldW, padY + fieldH / 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(padX + fieldW / 2, padY + fieldH / 2, fieldW * 0.12, 0, Math.PI * 2);
  ctx.stroke();

  const boxW = fieldW * 0.44;
  const boxH = fieldH * 0.16;
  ctx.strokeRect(padX + (fieldW - boxW) / 2, padY, boxW, boxH);
  ctx.strokeRect(padX + (fieldW - boxW) / 2, padY + fieldH - boxH, boxW, boxH);
}

/**
 * @param {Array<{x:number,y:number,weight?:number}>} points
 */
function buildDensityGrid(points) {
  const density = new Float32Array(GRID_W * GRID_H);

  points.forEach((pt) => {
    const weight = pt.weight ?? 1;
    const cx = (pt.x / 100) * GRID_W;
    const cy = (pt.y / 100) * GRID_H;
    const radius = Math.ceil(KERNEL_SIGMA * 2.5);

    for (let dy = -radius; dy <= radius; dy += 1) {
      for (let dx = -radius; dx <= radius; dx += 1) {
        const gx = Math.round(cx + dx);
        const gy = Math.round(cy + dy);
        if (gx < 0 || gx >= GRID_W || gy < 0 || gy >= GRID_H) continue;
        const dist2 = dx * dx + dy * dy;
        const kernel = Math.exp(-dist2 / (2 * KERNEL_SIGMA * KERNEL_SIGMA)) * weight;
        density[gy * GRID_W + gx] += kernel;
      }
    }
  });

  let max = 0;
  for (let i = 0; i < density.length; i += 1) {
    if (density[i] > max) max = density[i];
  }

  return { density, max: max || 1 };
}

/**
 * Mapa de calor en canvas (KDE simple + gradiente verde → rojo).
 */
export default function PlayerHeatmap({ points = [], className = '' }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  const pointsKey = useMemo(
    () => JSON.stringify(points.map((p) => [Math.round(p.x), Math.round(p.y), p.weight ?? 1])),
    [points]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !points.length) return undefined;

    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    let frameId = 0;

    const render = () => {
      const rect = container.getBoundingClientRect();
      const cssW = Math.max(280, Math.floor(rect.width));
      const cssH = Math.max(160, Math.floor(cssW * PITCH_ASPECT));
      const dpr = window.devicePixelRatio || 1;

      canvas.width = Math.floor(cssW * dpr);
      canvas.height = Math.floor(cssH * dpr);
      canvas.style.width = `${cssW}px`;
      canvas.style.height = `${cssH}px`;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawPitchBase(ctx, cssW, cssH);

      const { density, max } = buildDensityGrid(points);
      const padX = cssW * 0.06;
      const padY = cssH * 0.04;
      const fieldW = cssW - padX * 2;
      const fieldH = cssH - padY * 2;

      const cellW = fieldW / GRID_W;
      const cellH = fieldH / GRID_H;

      for (let gy = 0; gy < GRID_H; gy += 1) {
        for (let gx = 0; gx < GRID_W; gx += 1) {
          const value = density[gy * GRID_W + gx] / max;
          if (value < 0.04) continue;
          ctx.fillStyle = heatColor(value);
          ctx.fillRect(
            padX + gx * cellW,
            padY + gy * cellH,
            cellW + 0.5,
            cellH + 0.5
          );
        }
      }

      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.lineWidth = 1;
      ctx.strokeRect(padX, padY, fieldW, fieldH);
    };

    render();

    const observer = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(() => {
          cancelAnimationFrame(frameId);
          frameId = requestAnimationFrame(render);
        })
      : null;

    observer?.observe(container);
    window.addEventListener('resize', render);

    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', render);
      cancelAnimationFrame(frameId);
      const c = canvasRef.current;
      if (c) {
        const cctx = c.getContext('2d');
        cctx?.clearRect(0, 0, c.width, c.height);
      }
    };
  }, [pointsKey, points.length]);

  return (
    <div
      ref={containerRef}
      className={`player-heatmap${className ? ` ${className}` : ''}`}
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className="player-heatmap__canvas" />
      <span className="player-heatmap__attack-label">Ataque ↑</span>
    </div>
  );
}
