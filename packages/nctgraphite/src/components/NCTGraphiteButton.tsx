import type { CSSProperties, MouseEventHandler, ReactNode } from 'react';
import type { NCTGraphiteComponentMeta } from './NCTGraphiteMeta.js';

export const NCTGraphiteButtonMeta: NCTGraphiteComponentMeta = {
  tag: 'NCTGraphiteButton',
  category: 'widgets',
  description: 'Lab action button with optional small leading SVG icon',
  props: {
    label: { type: 'string', required: true, description: 'Button text label' },
    icon: { type: 'node', required: false, description: 'Optional small leading SVG icon (14px, stroke="currentColor")' },
    onClick: { type: 'function', required: false, description: '() => void click handler' },
    variant: { type: 'string', required: false, description: '"default" dark, "primary" accent fill, or "ghost" borderless' },
    disabled: { type: 'boolean', required: false, description: 'Disable the button' },
    title: { type: 'string', required: false, description: 'Native tooltip text' },
  },
  emits: [],
  dependencies: [],
};

export interface NCTGraphiteButtonProps {
  label: string;
  icon?: ReactNode;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  variant?: 'default' | 'primary' | 'ghost';
  disabled?: boolean;
  title?: string;
  className?: string;
  style?: CSSProperties;
  type?: 'button' | 'submit' | 'reset';
}

const variantClass: Record<string, string> = {
  default: 'bg-[#1a1a24] hover:bg-[#222230] border border-[#23232f] text-[#f5f1e8]',
  primary: 'bg-[#7c5cff] hover:bg-[#8d71ff] border border-[#7c5cff] text-white',
  ghost: 'bg-transparent hover:bg-[#1a1a24] border border-transparent text-[#7a7680] hover:text-white',
};

/** Lab action button: label with an optional small leading SVG icon. */
export function NCTGraphiteButton({
  label,
  icon,
  onClick,
  variant = 'default',
  disabled = false,
  title,
  className = '',
  style,
  type = 'button',
}: NCTGraphiteButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`inline-flex items-center justify-center gap-[6px] py-2 px-3 text-[11px] rounded font-bold disabled:opacity-50 ${variantClass[variant]} ${className}`}
      style={style}
    >
      {icon ? (
        <span className="inline-flex flex-none items-center [&>svg]:block" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <span>{label}</span>
    </button>
  );
}
