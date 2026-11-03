import { GRID_DEFAULT_COLUMNS } from './constants';
import type { Kind, Node } from '../model';

export function defaultsFor(kind: Kind): Node['props'] {
  if (kind === 'grid') return { columns: GRID_DEFAULT_COLUMNS };
  if (kind === 'tabs' || kind === 'list' || kind === 'segmented') return { options: 'One, Two, Three' };
  if (kind === 'knob' || kind === 'fader' || kind === 'slider') return { value: 50, min: 0, max: 100 };
  if (kind === 'dualRange') return { min: 0, max: 100 };
  if (kind === 'meter') return { value: 40, min: 0, max: 100 };
  if (kind === 'progress') return { value: 68, max: 100 };
  if (kind === 'valueDisplay') return { value: 0 };
  if (kind === 'toggle') return { checked: false };
  if (kind === 'panel') return { variant: 'raised' };
  if (kind === 'toolbar') return { size: 'md' };
  if (kind === 'iconButton') return { variant: 'ghost' };
  return {};
}

export function parentOf(node: Node, id: string): Node | undefined {
  for (const child of node.children) {
    if (child.id === id) return node;
    const hit = parentOf(child, id);
    if (hit) return hit;
  }
  return undefined;
}

export function coerceInput(raw: string): string | number | boolean {
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(raw.trim()) && raw.trim() !== '') return Number(raw);
  return raw;
}
