import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import type { NCTGraphiteComponentMeta } from './NCTGraphiteMeta.js';

/** Tracks a min-width media query (client-only; labs render client-side). */
function useWide(minWidth: number | undefined): boolean {
  const [match, setMatch] = useState<boolean>(false);
  useEffect(() => {
    if (minWidth == null || typeof window === 'undefined') return;
    const mql = window.matchMedia(`(min-width: ${minWidth}px)`);
    const onChange = () => setMatch(mql.matches);
    onChange();
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [minWidth]);
  return match;
}

export const NCTGraphiteGridMeta: NCTGraphiteComponentMeta = {
  tag: 'NCTGraphiteGrid',
  category: 'layout',
  description: 'CSS Grid layout with deterministic behavior for reliable composition',
  props: {
    columns: { type: 'string', default: '1fr', description: 'Grid template columns (grid-template-columns)' },
    rows: { type: 'string', default: 'auto', description: 'Grid template rows (grid-template-rows)' },
    gap: { type: ['number', 'string'], default: 0, description: 'Gap between items (px number or CSS value)' },
    template: { type: 'string', required: false, description: 'Full grid-template shorthand (overrides columns/rows)' },
    wideMinWidth: { type: 'number', required: false, description: 'Viewport px at which the wide* variants apply (matchMedia)' },
    wideColumns: { type: 'string', required: false, description: 'grid-template-columns at/above wideMinWidth' },
    wideRows: { type: 'string', required: false, description: 'grid-template-rows at/above wideMinWidth' },
    wideGap: { type: ['number', 'string'], required: false, description: 'Gap at/above wideMinWidth' },
    wideTemplate: { type: 'string', required: false, description: 'Full grid-template at/above wideMinWidth' },
    children: { type: 'node', required: true, description: 'Grid items' },
  },
  slots: { default: 'Grid items' },
  emits: [],
  dependencies: [],
};

export interface NCTGraphiteGridProps {
  columns?: string;
  rows?: string;
  gap?: number | string;
  template?: string;
  wideMinWidth?: number;
  wideColumns?: string;
  wideRows?: string;
  wideGap?: number | string;
  wideTemplate?: string;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

/** CSS Grid with deterministic columns/rows/gap, plus optional wide-viewport variants. */
export function NCTGraphiteGrid({
  columns = '1fr', rows = 'auto', gap = 0, template,
  wideMinWidth, wideColumns, wideRows, wideGap, wideTemplate,
  className = '', style, children,
}: NCTGraphiteGridProps) {
  const wide = useWide(wideMinWidth);
  const effTemplate = wide && wideTemplate ? wideTemplate : template;
  const effColumns = wide && wideColumns ? wideColumns : columns;
  const effRows = wide && wideRows ? wideRows : rows;
  const effGap = wide && wideGap != null ? wideGap : gap;
  // A slash-less template is a column track list, not grid-template
  // shorthand (which would wrongly produce rows).
  const templateIsColumns = effTemplate != null && !effTemplate.includes('/');
  return (
    <div
      className={className}
      style={{
        display: 'grid',
        ...(effTemplate && !templateIsColumns
          ? { gridTemplate: effTemplate }
          : {
              gridTemplateColumns: templateIsColumns ? (effTemplate as string) : effColumns,
              gridTemplateRows: effRows,
            }),
        gap: typeof effGap === 'number' ? `${effGap}px` : effGap,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
