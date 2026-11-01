import type { NCTGraphiteComponentMeta } from './NCTGraphiteMeta.js';

export const NCTGraphiteToggleMeta: NCTGraphiteComponentMeta = {
  tag: 'NCTGraphiteToggle',
  category: 'widgets',
  description: 'Checkbox card row for lab boolean options',
  props: {
    label: { type: 'string', required: true, description: 'Option label' },
    checked: { type: 'boolean', required: true, description: 'Current state' },
    onChange: { type: 'function', required: true, description: '(v: boolean) => void' },
    controlStyle: { type: 'string', required: false, description: '"checkbox" (default) card-row checkbox, or "switch" sliding pill' },
  },
  emits: [],
  dependencies: [],
};

export interface NCTGraphiteToggleProps {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  controlStyle?: 'checkbox' | 'switch';
}

/** Boolean option row (lab idiom): checkbox card by default, sliding pill with controlStyle="switch". */
export function NCTGraphiteToggle({ label, checked, onChange, controlStyle = 'checkbox' }: NCTGraphiteToggleProps) {
  if (controlStyle === 'switch') {
    return (
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className="w-full flex items-center justify-between p-2 rounded-[8px] bg-[#15151e] border border-[#23232f] cursor-pointer"
      >
        <span className="text-[11px]">{label}</span>
        <span className={`w-9 h-5 rounded-full p-0.5 flex shrink-0 ${checked ? 'justify-end bg-[#7c5cff]' : 'justify-start bg-[#222230]'}`}>
          <span className="w-4 h-4 rounded-full bg-white" />
        </span>
      </button>
    );
  }
  return (
    <label className="flex items-center justify-between p-2 rounded-[8px] bg-[#15151e] border border-[#23232f] cursor-pointer">
      <span className="text-[11px]">{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="accent-[#7c5cff]" />
    </label>
  );
}
