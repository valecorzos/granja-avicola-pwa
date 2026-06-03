'use client';

import React, { useState, useRef, useEffect } from 'react';

export interface SelectOption {
  value: string;
  label: string;
  sublabel?: string;
}

interface SelectVEProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  searchable?: boolean;
}

export default function SelectVE({
  value,
  onChange,
  options,
  placeholder = 'Seleccione...',
  disabled,
  searchable = false,
}: SelectVEProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  useEffect(() => {
    if (open && searchable) {
      setTimeout(() => searchRef.current?.focus(), 50);
    }
  }, [open, searchable]);

  const filtered = searchable && search
    ? options.filter((o) =>
        o.label.toLowerCase().includes(search.toLowerCase()) ||
        o.sublabel?.toLowerCase().includes(search.toLowerCase())
      )
    : options;

  return (
    <div ref={wrapRef} className="relative">
      {/* Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        className={`
          w-full bg-[#F4F4F4] dark:bg-slate-800/40 border rounded-xl pl-4 pr-3 py-2.5
          flex items-center justify-between gap-2
          text-left transition-all
          ${open
            ? 'border-[#1067f2] ring-2 ring-[#1067f2]/20'
            : 'border-theme hover:border-slate-300 dark:hover:border-slate-600'}
          ${disabled
            ? 'opacity-50 cursor-not-allowed'
            : 'cursor-pointer focus:outline-none focus:border-[#1067f2] focus:ring-2 focus:ring-[#1067f2]/20'}
        `}
      >
        <span className={`flex-1 truncate text-sm ${
          selected
            ? 'font-title font-semibold text-slate-800 dark:text-slate-100'
            : 'text-slate-400 dark:text-slate-500'
        }`}>
          {selected ? selected.label : placeholder}
        </span>

        {/* Chevron sutil — color slate-400 (no oscuro) */}
        <svg
          className={`w-4 h-4 text-slate-400 transition-transform duration-200 flex-shrink-0 ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Panel */}
      {open && (
        <div className="absolute top-full mt-2 left-0 right-0 z-40 bg-white dark:bg-[#11151e] border border-slate-200 dark:border-[#2c3245] rounded-xl shadow-2xl overflow-hidden animate-[fadeIn_120ms_ease-out]">

          {searchable && (
            <div className="p-2 border-b border-slate-100 dark:border-[#2c3245]">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  ref={searchRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar..."
                  className="w-full bg-[#F4F4F4] dark:bg-slate-800/40 border-0 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1067f2]/30"
                />
              </div>
            </div>
          )}

          <ul className="max-h-60 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-4 py-6 text-center text-sm text-slate-400">
                Sin resultados
              </li>
            ) : (
              filtered.map((opt) => {
                const isSel = opt.value === value;
                return (
                  <li key={opt.value}>
                    <button
                      type="button"
                      onClick={() => {
                        onChange(opt.value);
                        setOpen(false);
                        setSearch('');
                      }}
                      className={`
                        w-full text-left px-4 py-2.5 flex items-center justify-between gap-2
                        transition-colors cursor-pointer
                        ${isSel
                          ? 'bg-blue-50 dark:bg-blue-950/30 text-[#1067f2] dark:text-[#a0c1df]'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'}
                      `}
                    >
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm font-title truncate ${isSel ? 'font-extrabold' : 'font-semibold'}`}>
                          {opt.label}
                        </div>
                        {opt.sublabel && (
                          <div className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
                            {opt.sublabel}
                          </div>
                        )}
                      </div>

                      {isSel && (
                        <svg className="w-4 h-4 text-[#1067f2] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
