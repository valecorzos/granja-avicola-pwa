'use client';

import React from 'react';

type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

interface TooltipProps {
  label: string;
  children: React.ReactNode;
  position?: TooltipPosition;
  className?: string;
}

const POS: Record<TooltipPosition, { bubble: string; arrow: string }> = {
  top: {
    bubble: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    arrow: 'top-full left-1/2 -translate-x-1/2 -mt-1',
  },
  bottom: {
    bubble: 'top-full left-1/2 -translate-x-1/2 mt-2',
    arrow: 'bottom-full left-1/2 -translate-x-1/2 -mb-1',
  },
  left: {
    bubble: 'right-full top-1/2 -translate-y-1/2 mr-2',
    arrow: 'left-full top-1/2 -translate-y-1/2 -ml-1',
  },
  right: {
    bubble: 'left-full top-1/2 -translate-y-1/2 ml-2',
    arrow: 'right-full top-1/2 -translate-y-1/2 -mr-1',
  },
};

/**
 * Tooltip ligero basado en CSS (hover/focus). Burbuja redondeada con flecha,
 * aparición suave y sin dependencias. Se posiciona relativo al hijo.
 *
 * Uso:
 *   <Tooltip label="Editar"><button>…</button></Tooltip>
 */
export default function Tooltip({ label, children, position = 'top', className = '' }: TooltipProps) {
  const pos = POS[position];
  return (
    <span className={`relative inline-flex group/tip ${className}`}>
      {children}
      <span
        role="tooltip"
        className={`pointer-events-none absolute z-[60] ${pos.bubble}
          px-2.5 py-1.5 rounded-lg whitespace-nowrap
          bg-slate-900/95 dark:bg-slate-700/95 text-white text-[11px] font-title font-semibold
          shadow-lg shadow-black/20 backdrop-blur-sm
          opacity-0 scale-95 translate-y-0.5
          group-hover/tip:opacity-100 group-hover/tip:scale-100 group-hover/tip:translate-y-0
          group-focus-within/tip:opacity-100 group-focus-within/tip:scale-100
          transition-all duration-150 ease-out`}
      >
        {label}
        <span
          className={`absolute ${pos.arrow} w-2 h-2 rotate-45 bg-slate-900/95 dark:bg-slate-700/95`}
        />
      </span>
    </span>
  );
}
