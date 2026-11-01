import type { ReactNode } from 'react';
import type { NCTGraphiteComponentMeta } from './NCTGraphiteMeta.js';

export const NCTGraphitePanelMeta: NCTGraphiteComponentMeta = {
  tag: 'NCTGraphitePanel',
  category: 'layout',
  description: 'Beveled panel card for lab control clusters and sidebar sections',
  props: {
    title: { type: 'string', required: false, description: 'Optional uppercase section title' },
    children: { type: 'node', required: true, description: 'Panel content' },
    className: { type: 'string', required: false, description: 'Extra classes' },
  },
  slots: { default: 'Panel content' },
  emits: [],
  dependencies: [],
};

export interface NCTGraphitePanelProps {
  title?: string;
  children: ReactNode;
  className?: string;
}

/** Beveled panel card for control clusters (lab sidebar idiom). */
export function NCTGraphitePanel({ title, children, className = '' }: NCTGraphitePanelProps) {
  return (
    <div className={`p-2.5 rounded-[8px] bg-[#15151e] border border-[#23232f] ${className}`}>
      {title ? <div className="text-[11px] tracking-[0.18em] text-[#7a7680] mb-3">{title}</div> : null}
      {children}
    </div>
  );
}
