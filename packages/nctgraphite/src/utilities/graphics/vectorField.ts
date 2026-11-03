/**
 * Rectangular vector lattice: cell-centered samples, seek/velocity/swirl
 * stamps, attractor influence, and the original angle→hue style.
 */

export type VectorFieldMode = 'seek' | 'velocity' | 'swirl';

export interface VectorSample {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export interface VectorAttractor {
  x: number;
  y: number;
  r: number;
  orbit: boolean;
}

export interface VectorStyle {
  skip: boolean;
  m: number;
  hue: number;
  alpha: number;
  width: number;
  arrow: boolean;
  light: number;
}

export function makeVectorField(
  columns: number,
  rows: number,
  width: number,
  height: number,
): VectorSample[] {
  const out: VectorSample[] = [];
  const cellW = width / columns;
  const cellH = height / rows;
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < columns; i++) {
      out.push({ x: (i + 0.5) * cellW, y: (j + 0.5) * cellH, vx: 0, vy: 0 });
    }
  }
  return out;
}

/**
 * Original angle→color scheme: hue is the vector direction on a 0–360 wheel
 * (canvas y-down), lightness 62% (75% dimmed preview), alpha grows with
 * magnitude. Vectors under an idle brush render dimmed (preview); vectors
 * under a held paint key render full with arrowheads above 0.08.
 */
export function vectorStyle(vx: number, vy: number, preview: boolean): VectorStyle {
  const m = Math.hypot(vx, vy);
  if (m < 0.01) return { skip: true, m, hue: 0, alpha: 0, width: 0, arrow: false, light: 62 };
  const hue = ((Math.atan2(vy, vx) * 180) / Math.PI + 180) % 360;
  const alpha = Math.min(0.95, 0.25 + m * 0.9) * (preview ? 0.35 : 1);
  return {
    skip: false,
    m,
    hue,
    alpha,
    width: preview ? 1 : Math.max(1, m * 2.2),
    arrow: !preview && m > 0.08,
    light: preview ? 75 : 62,
  };
}

export type VectorStampAction = 'paint' | 'erase' | 'smooth';

export function stampVectorField(
  field: readonly VectorSample[],
  options: {
    columns: number;
    rows: number;
    x: number;
    y: number;
    radius: number;
    action: VectorStampAction;
    mode: VectorFieldMode;
    strength: number;
    velocityX?: number;
    velocityY?: number;
    paintScale?: number;
  },
): VectorSample[] {
  const paintScale = options.paintScale ?? 1;
  const next = field.map((sample) => ({ ...sample }));
  for (const sample of next) {
    const d = Math.hypot(sample.x - options.x, sample.y - options.y);
    if (d > options.radius) continue;
    const fall = 1 - d / options.radius;
    if (options.action === 'erase') {
      sample.vx = 0;
      sample.vy = 0;
      continue;
    }
    if (options.action === 'smooth') continue;
    const s = options.strength * fall * paintScale;
    if (options.mode === 'seek') {
      const dx = options.x - sample.x;
      const dy = options.y - sample.y;
      const m = Math.hypot(dx, dy) || 1;
      sample.vx += (dx / m) * s;
      sample.vy += (dy / m) * s;
    } else if (options.mode === 'velocity') {
      sample.vx += (options.velocityX ?? 0) * s * 0.05;
      sample.vy += (options.velocityY ?? 0) * s * 0.05;
    } else {
      const dx = sample.x - options.x;
      const dy = sample.y - options.y;
      const m = Math.hypot(dx, dy) || 1;
      sample.vx += (-dy / m) * s;
      sample.vy += (dx / m) * s;
    }
    const mag = Math.hypot(sample.vx, sample.vy);
    if (mag > 3) {
      sample.vx = (sample.vx / mag) * 3;
      sample.vy = (sample.vy / mag) * 3;
    }
  }
  if (options.action === 'smooth') {
    const idx = (i: number, j: number) => j * options.columns + i;
    const src = next.map((sample) => ({ ...sample }));
    for (let j = 0; j < options.rows; j++) {
      for (let i = 0; i < options.columns; i++) {
        const sample = src[idx(i, j)];
        if (Math.hypot(sample.x - options.x, sample.y - options.y) > options.radius) continue;
        let sx = 0, sy = 0, n = 0;
        for (let dj = -1; dj <= 1; dj++) {
          for (let di = -1; di <= 1; di++) {
            const ii = i + di, jj = j + dj;
            if (ii < 0 || jj < 0 || ii >= options.columns || jj >= options.rows) continue;
            sx += src[idx(ii, jj)].vx;
            sy += src[idx(ii, jj)].vy;
            n++;
          }
        }
        next[idx(i, j)].vx = sx / n;
        next[idx(i, j)].vy = sy / n;
      }
    }
  }
  return next;
}

export function applyVectorAttractors(
  field: readonly VectorSample[],
  attractors: readonly VectorAttractor[],
): VectorSample[] {
  if (attractors.length === 0) return field.slice().map((sample) => ({ ...sample }));
  const next = field.map((sample) => ({ ...sample }));
  for (const attractor of attractors) {
    for (const sample of next) {
      const dx = sample.x - attractor.x;
      const dy = sample.y - attractor.y;
      const d = Math.hypot(dx, dy);
      if (d > attractor.r || d < 0.001) continue;
      const fall = 1 - d / attractor.r;
      if (attractor.orbit) {
        sample.vx += (-dy / d) * fall * 0.06;
        sample.vy += (dx / d) * fall * 0.06;
      } else {
        sample.vx += (-dx / d) * fall * 0.04;
        sample.vy += (-dy / d) * fall * 0.04;
      }
    }
  }
  return next;
}
