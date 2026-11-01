import type { NCTGraphiteComponentMeta } from './NCTGraphiteMeta.js';
import { NCTGraphiteParamLabel } from './NCTGraphiteHint.js';

export const NCTGraphiteSegmentedMeta: NCTGraphiteComponentMeta = {
  tag: 'NCTGraphiteSegmented',
  category: 'widgets',
  description: 'Single-select segmented row for lab mode and option pickers',
  props: {
    label: { type: 'string', required: false, description: 'Optional uppercase label above the row' },
    options: { type: 'array', required: true, description: '{value, label}[] choices' },
    value: { type: 'string', required: true, description: 'Selected value' },
    onChange: { type: 'function', required: true, description: '(v: string) => void' },
    hint: { type: 'string', required: false, description: 'Optional ? tooltip beside the label' },
  },
  emits: [],
  dependencies: [],
};

export interface NCTGraphiteSegmentedOption {
  value: string;
  label: string;
}

export interface NCTGraphiteSegmentedProps {
  label?: string;
  options: NCTGraphiteSegmentedOption[];
  value: string;
  onChange: (v: string) => void;
  hint?: string;
}

/** Single-select segmented row for mode/option pickers (lab idiom). */
export function NCTGraphiteSegmented({ label, options, value, onChange, hint }: NCTGraphiteSegmentedProps) {
  return (
    <div>
      {label ? <NCTGraphiteParamLabel label={label} hint={hint} /> : null}
      <div className="flex gap-1 p-1 rounded-[8px] bg-[#15151e] border border-[#23232f]">
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={`flex-1 px-2 py-1 text-[11px] rounded-[6px] ${
                active ? 'bg-[#7c5cff] text-white' : 'text-[#7a7680]'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
