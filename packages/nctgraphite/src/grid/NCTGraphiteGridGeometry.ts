/**
 * Framework-free grid geometry shared by canvas, SVG, and WebGL renderers.
 * Coordinates use `q`/`r`: axial for hex grids and column/row for squares.
 */

export type NCTGraphiteGridKind = 'square' | 'hex-flat' | 'hex-pointy';

export interface NCTGraphitePoint {
  x: number;
  y: number;
}

export interface NCTGraphiteGridCoordinate {
  q: number;
  r: number;
}

export interface NCTGraphiteGridSpec {
  kind: NCTGraphiteGridKind;
  /**
   * Hex radius, measured from its center to a vertex. For squares this is
   * half the cell width, so a square has a side length of `size * 2`.
   */
  size: number;
  origin?: NCTGraphitePoint;
}

export interface NCTGraphiteGridCell extends NCTGraphiteGridCoordinate {
  id: string;
  center: NCTGraphitePoint;
  corners: NCTGraphitePoint[];
}

export interface NCTGraphiteGridBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

const SQRT_3 = Math.sqrt(3);
const EPSILON = 1e-9;

function assertValidSpec(spec: NCTGraphiteGridSpec): void {
  if (!Number.isFinite(spec.size) || spec.size <= 0) {
    throw new Error('NCTGraphite grid size must be a finite number greater than zero.');
  }
}

function originOf(spec: NCTGraphiteGridSpec): NCTGraphitePoint {
  return spec.origin ?? { x: 0, y: 0 };
}

/** Convert an axial hex or square column/row coordinate into document space. */
export function gridCoordinateToPoint(
  spec: NCTGraphiteGridSpec,
  coordinate: NCTGraphiteGridCoordinate,
): NCTGraphitePoint {
  assertValidSpec(spec);
  const { q, r } = coordinate;
  const { x, y } = originOf(spec);
  if (spec.kind === 'square') return { x: x + q * spec.size * 2, y: y + r * spec.size * 2 };
  if (spec.kind === 'hex-flat') {
    return { x: x + spec.size * 1.5 * q, y: y + spec.size * SQRT_3 * (r + q / 2) };
  }
  return { x: x + spec.size * SQRT_3 * (q + r / 2), y: y + spec.size * 1.5 * r };
}

/** Return the unrounded grid coordinate for a document-space point. */
export function pointToFractionalGridCoordinate(
  spec: NCTGraphiteGridSpec,
  point: NCTGraphitePoint,
): NCTGraphiteGridCoordinate {
  assertValidSpec(spec);
  const origin = originOf(spec);
  const x = point.x - origin.x;
  const y = point.y - origin.y;
  if (spec.kind === 'square') return { q: x / (spec.size * 2), r: y / (spec.size * 2) };
  if (spec.kind === 'hex-flat') {
    return { q: (2 / 3 * x) / spec.size, r: (-1 / 3 * x + SQRT_3 / 3 * y) / spec.size };
  }
  return { q: (SQRT_3 / 3 * x - 1 / 3 * y) / spec.size, r: (2 / 3 * y) / spec.size };
}

/** Round a fractional axial hex coordinate while preserving q + r + s = 0. */
export function roundHexCoordinate(coordinate: NCTGraphiteGridCoordinate): NCTGraphiteGridCoordinate {
  let q = Math.round(coordinate.q);
  let r = Math.round(coordinate.r);
  const s = Math.round(-coordinate.q - coordinate.r);
  const qDelta = Math.abs(q - coordinate.q);
  const rDelta = Math.abs(r - coordinate.r);
  const sDelta = Math.abs(s - (-coordinate.q - coordinate.r));
  if (qDelta > rDelta && qDelta > sDelta) q = -r - s;
  else if (rDelta > sDelta) r = -q - s;
  return { q, r };
}

/** Find the cell containing a point. For square grids, q/r are floored. */
export function pointToGridCoordinate(
  spec: NCTGraphiteGridSpec,
  point: NCTGraphitePoint,
): NCTGraphiteGridCoordinate {
  const fractional = pointToFractionalGridCoordinate(spec, point);
  if (spec.kind === 'square') return { q: Math.floor(fractional.q + 0.5), r: Math.floor(fractional.r + 0.5) };
  return roundHexCoordinate(fractional);
}

/** Corners are clockwise in screen coordinates, beginning at the rightmost hex vertex. */
export function gridCellCorners(
  spec: NCTGraphiteGridSpec,
  coordinate: NCTGraphiteGridCoordinate,
): NCTGraphitePoint[] {
  const center = gridCoordinateToPoint(spec, coordinate);
  if (spec.kind === 'square') {
    const s = spec.size;
    return [
      { x: center.x - s, y: center.y - s },
      { x: center.x + s, y: center.y - s },
      { x: center.x + s, y: center.y + s },
      { x: center.x - s, y: center.y + s },
    ];
  }
  const startDegrees = spec.kind === 'hex-flat' ? 0 : 30;
  return Array.from({ length: 6 }, (_, index) => {
    const radians = (startDegrees + index * 60) * Math.PI / 180;
    return { x: center.x + spec.size * Math.cos(radians), y: center.y + spec.size * Math.sin(radians) };
  });
}

export function gridCell(
  spec: NCTGraphiteGridSpec,
  coordinate: NCTGraphiteGridCoordinate,
): NCTGraphiteGridCell {
  const center = gridCoordinateToPoint(spec, coordinate);
  return {
    ...coordinate,
    id: gridCellId(coordinate),
    center,
    corners: gridCellCorners(spec, coordinate),
  };
}

export function gridCellId({ q, r }: NCTGraphiteGridCoordinate): string {
  return `${q},${r}`;
}

/** Orthogonal square neighbors or the six axial hex neighbors, in stable order. */
export function gridNeighbors(
  spec: Pick<NCTGraphiteGridSpec, 'kind'>,
  coordinate: NCTGraphiteGridCoordinate,
): NCTGraphiteGridCoordinate[] {
  const offsets = spec.kind === 'square'
    ? [{ q: 1, r: 0 }, { q: 0, r: 1 }, { q: -1, r: 0 }, { q: 0, r: -1 }]
    : [{ q: 1, r: 0 }, { q: 1, r: -1 }, { q: 0, r: -1 }, { q: -1, r: 0 }, { q: -1, r: 1 }, { q: 0, r: 1 }];
  return offsets.map((offset) => ({ q: coordinate.q + offset.q, r: coordinate.r + offset.r }));
}

/** Exact polygon test for a candidate cell. Useful with custom or bounded layouts. */
export function pointInGridCell(
  spec: NCTGraphiteGridSpec,
  coordinate: NCTGraphiteGridCoordinate,
  point: NCTGraphitePoint,
): boolean {
  return pointInPolygon(point, gridCellCorners(spec, coordinate));
}

/** Ray-casting polygon test. Points on a boundary count as inside. */
export function pointInPolygon(point: NCTGraphitePoint, polygon: readonly NCTGraphitePoint[]): boolean {
  let inside = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index++) {
    const a = polygon[previous];
    const b = polygon[index];
    const cross = (point.x - a.x) * (b.y - a.y) - (point.y - a.y) * (b.x - a.x);
    const onSegment = Math.abs(cross) <= EPSILON &&
      point.x >= Math.min(a.x, b.x) - EPSILON && point.x <= Math.max(a.x, b.x) + EPSILON &&
      point.y >= Math.min(a.y, b.y) - EPSILON && point.y <= Math.max(a.y, b.y) + EPSILON;
    if (onSegment) return true;
    if ((a.y > point.y) !== (b.y > point.y) && point.x < (b.x - a.x) * (point.y - a.y) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

/** Axis-aligned bounds for a cell polygon. */
export function gridCellBounds(
  spec: NCTGraphiteGridSpec,
  coordinate: NCTGraphiteGridCoordinate,
): NCTGraphiteGridBounds {
  const corners = gridCellCorners(spec, coordinate);
  return {
    minX: Math.min(...corners.map((corner) => corner.x)),
    minY: Math.min(...corners.map((corner) => corner.y)),
    maxX: Math.max(...corners.map((corner) => corner.x)),
    maxY: Math.max(...corners.map((corner) => corner.y)),
  };
}

/** Enumerate grid cells whose polygon bounds intersect a document-space rectangle. */
export function gridCellsInBounds(
  spec: NCTGraphiteGridSpec,
  bounds: NCTGraphiteGridBounds,
): NCTGraphiteGridCell[] {
  const corners = [
    pointToFractionalGridCoordinate(spec, { x: bounds.minX, y: bounds.minY }),
    pointToFractionalGridCoordinate(spec, { x: bounds.minX, y: bounds.maxY }),
    pointToFractionalGridCoordinate(spec, { x: bounds.maxX, y: bounds.minY }),
    pointToFractionalGridCoordinate(spec, { x: bounds.maxX, y: bounds.maxY }),
  ];
  const padding = spec.kind === 'square' ? 1 : 2;
  const minQ = Math.floor(Math.min(...corners.map((corner) => corner.q))) - padding;
  const maxQ = Math.ceil(Math.max(...corners.map((corner) => corner.q))) + padding;
  const minR = Math.floor(Math.min(...corners.map((corner) => corner.r))) - padding;
  const maxR = Math.ceil(Math.max(...corners.map((corner) => corner.r))) + padding;
  const cells: NCTGraphiteGridCell[] = [];
  for (let q = minQ; q <= maxQ; q++) {
    for (let r = minR; r <= maxR; r++) {
      const cell = gridCell(spec, { q, r });
      const cellBounds = gridCellBounds(spec, cell);
      if (cellBounds.maxX >= bounds.minX && cellBounds.minX <= bounds.maxX && cellBounds.maxY >= bounds.minY && cellBounds.minY <= bounds.maxY) cells.push(cell);
    }
  }
  return cells;
}
