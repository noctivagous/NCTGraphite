import type { NCTGraphiteComponentMeta } from './NCTGraphiteMeta.js';
import type { NCTGraphiteCommandDef } from '../bindings/NCTGraphiteCommands.js';

export const NCTGraphiteKeyMapMeta: NCTGraphiteComponentMeta = {
  tag: 'NCTGraphiteKeyMap',
  category: 'widgets',
  description: 'Rebindable key-click map rows: kbd chip, label, desc, rebind button',
  props: {
    commands: { type: 'array', required: true, description: '{id, label, desc, defaultKey}[] command definitions' },
    keyMap: { type: 'object', required: true, description: 'action id → current key, from useNCTGraphiteCommands' },
    rebinding: { type: 'string', required: false, description: 'id currently capturing a replacement key, or null' },
    onRebind: { type: 'function', required: true, description: '(id | null) => void to arm/cancel rebinding' },
    heldActions: { type: 'object', required: false, description: 'held action ids, from useNCTGraphiteCommands; held rows highlight' },
    emphasizeIds: { type: 'object', required: false, description: 'action ids whose chips carry the accent treatment persistently' },
  },
  emits: [],
  dependencies: ['useNCTGraphiteCommands'],
};

export interface NCTGraphiteKeyMapProps {
  commands: NCTGraphiteCommandDef[];
  keyMap: Record<string, string>;
  rebinding: string | null;
  onRebind: (id: string | null) => void;
  heldActions?: Set<string>;
  emphasizeIds?: Set<string>;
}

/**
 * Key-click map rows (lab idiom): kbd chip, label/desc, rebind button.
 * Held rows highlight violet while their key is down (hex-lab idiom).
 */
export function NCTGraphiteKeyMap({ commands, keyMap, rebinding, onRebind, heldActions, emphasizeIds }: NCTGraphiteKeyMapProps) {
  const held = heldActions ?? new Set<string>();
  const emphasized = emphasizeIds ?? new Set<string>();
  return (
    <div className="flex flex-col gap-2">
      {commands.map((c) => (
        <div key={c.id} className="flex items-center gap-2">
          <div className={`w-6 h-6 shrink-0 rounded-[6px] border grid place-items-center text-[11px] font-bold text-white ${held.has(c.id) || emphasized.has(c.id) ? 'bg-[#7c5cff] border-[#7c5cff]' : 'bg-[#15151e] border-[#23232f]'}`}>
            {(keyMap[c.id] ?? c.defaultKey).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-bold text-white">{c.label}</div>
            <div className="text-[9px] text-[#7a7680] truncate">{c.desc}</div>
          </div>
          <button
            onClick={() => onRebind(rebinding === c.id ? null : c.id)}
            className={`px-2 py-1 rounded text-[9px] font-bold ${rebinding === c.id ? 'bg-[#00e5ff] text-black' : 'bg-[#15151e] border border-[#23232f] text-[#7a7680] hover:text-white'}`}
          >
            {rebinding === c.id ? 'PRESS KEY…' : 'REBIND'}
          </button>
        </div>
      ))}
    </div>
  );
}
