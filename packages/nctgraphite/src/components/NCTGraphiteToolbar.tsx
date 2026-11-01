import type { CSSProperties, ReactNode } from 'react';
import type { NCTGraphiteComponentMeta } from './NCTGraphiteMeta.js';

export const NCTGraphiteToolbarMeta: NCTGraphiteComponentMeta = {
  tag: 'NCTGraphiteToolbar',
  category: 'layout',
  description: 'Toolbar row or column grouping buttons, toggles, and actions',
  props: {
    orientation: { type: ['horizontal', 'vertical'], default: 'horizontal', description: 'Toolbar orientation' },
    size: { type: ['sm', 'md', 'lg'], default: 'md', description: 'Gap density' },
    compact: { type: 'boolean', default: false, description: 'Remove outer padding for tighter layouts' },
    children: { type: 'node', required: true, description: 'Toolbar items (real elements, not config strings)' },
  },
  slots: { default: 'Toolbar items' },
  emits: [],
  dependencies: [],
};

const sizeGap: Record<string, number> = { sm: 4, md: 8, lg: 12 };

export interface NCTGraphiteToolbarProps {
  orientation?: 'horizontal' | 'vertical';
  size?: 'sm' | 'md' | 'lg';
  compact?: boolean;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

/** Toolbar grouping real action elements (hosts pass elements, not config). */
export function NCTGraphiteToolbar({
  orientation = 'horizontal', size = 'md', compact = false, className = '', style, children,
}: NCTGraphiteToolbarProps) {
  return (
    <div
      className={className}
      style={{
        display: 'flex',
        flexDirection: orientation === 'horizontal' ? 'row' : 'column',
        gap: `${sizeGap[size]}px`,
        alignItems: 'center',
        padding: compact ? 0 : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
