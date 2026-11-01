import type { CSSProperties, ReactNode } from 'react';
import type { NCTGraphiteComponentMeta } from './NCTGraphiteMeta.js';

export const NCTGraphiteStackMeta: NCTGraphiteComponentMeta = {
  tag: 'NCTGraphiteStack',
  category: 'layout',
  description: 'Flexbox stack for vertical or horizontal arrangement of controls and content',
  props: {
    direction: { type: ['row', 'column', 'row-reverse', 'column-reverse'], default: 'column', description: 'Stack direction (flex-direction)' },
    gap: { type: ['number', 'string'], default: 0, description: 'Gap between items (px number or CSS value)' },
    align: { type: ['start', 'center', 'end', 'stretch'], default: 'stretch', description: 'Cross-axis alignment (align-items)' },
    justify: { type: ['start', 'center', 'end', 'between', 'around', 'evenly'], default: 'start', description: 'Main-axis distribution (justify-content)' },
    wrap: { type: 'boolean', default: false, description: 'Allow wrapping (flex-wrap)' },
    children: { type: 'node', required: true, description: 'Stacked items' },
  },
  slots: { default: 'Stacked items' },
  emits: [],
  dependencies: [],
};

const alignMap: Record<string, string> = { start: 'flex-start', center: 'center', end: 'flex-end', stretch: 'stretch' };
const justifyMap: Record<string, string> = {
  start: 'flex-start', center: 'center', end: 'flex-end',
  between: 'space-between', around: 'space-around', evenly: 'space-evenly',
};

export interface NCTGraphiteStackProps {
  direction?: 'row' | 'column' | 'row-reverse' | 'column-reverse';
  gap?: number | string;
  align?: 'start' | 'center' | 'end' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
  wrap?: boolean;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

/** Flexbox stack (row/column) with gap and alignment. */
export function NCTGraphiteStack({
  direction = 'column', gap = 0, align = 'stretch', justify = 'start',
  wrap = false, className = '', style, children,
}: NCTGraphiteStackProps) {
  return (
    <div
      className={className}
      style={{
        display: 'flex',
        flexDirection: direction,
        gap: typeof gap === 'number' ? `${gap}px` : gap,
        alignItems: alignMap[align],
        justifyContent: justifyMap[justify],
        flexWrap: wrap ? 'wrap' : 'nowrap',
        ...style,
      }}
    >
      {children}
    </div>
  );
}
