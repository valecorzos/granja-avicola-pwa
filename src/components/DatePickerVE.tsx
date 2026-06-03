'use client';

import React, { useState, useRef, useEffect } from 'react';

interface DatePickerVEProps {
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  required?: boolean;
  className?: string;
}

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
const DIAS_SEMANA = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'];

function toYMD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatVE(ymd: string): string {
  if (!ymd) return '';
  const [y, m, d] = ymd.split('-');
  return `${d}/${m}/${y}`;
}

export default function DatePickerVE({ value, onChange, required, className }: DatePickerVEProps) {
  const today = new Date();
  const selDate = value ? new Date(value + 'T12:00:00') : null;

  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(selDate?.getFullYear() ?? today.getFullYear());
  const [viewMonth, setViewMonth] = useState(selDate?.getMonth() ?? today.getMonth());
  const [pickingYear, setPickingYear] = useState(false);

  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selDate) {
      setViewYear(selDate.getFullYear());
      setViewMonth(selDate.getMonth());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        setPickingYear(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  };

  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  };

  const selectDay = (day: number) => {
    onChange(toYMD(new Date(viewYear, viewMonth, day)));
    setOpen(false);
    setPickingYear(false);
  };

  const selectToday = () => {
    onChange(toYMD(today));
    setOpen(false);
    setPickingYear(false);
  };

  const yearRange = Array.from({ length: 12 }, (_, i) => today.getFullYear() - 5 + i);

  const isSelected = (day: number) =>
    selDate?.getFullYear() === viewYear &&
    selDate?.getMonth() === viewMonth &&
    selDate?.getDate() === day;

  const isToday = (day: number) =>
    today.getFullYear() === viewYear &&
    today.getMonth() === viewMonth &&
    today.getDate() === day;

  return (
    <div ref={wrapRef} className={`relative ${className ?? ''}`}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => { setOpen((o) => !o); setPickingYear(false); }}
        className="w-full bg-surface-2 border border-theme rounded-xl px-4 py-3 flex items-center justify-between gap-2 focus:outline-none focus:ring-2 focus:ring-[#1067f2] transition-all hover:border-[#1067f2]/40 group"
      >
        <span className={value ? 'font-title font-semibold text-slate-800 dark:text-slate-100' : 'text-slate-400 dark:text-slate-500 text-sm'}>
          {value ? formatVE(value) : 'DD/MM/AAAA'}
        </span>
        <svg
          className="w-4 h-4 text-slate-400 group-hover:text-[#1067f2] transition-colors flex-shrink-0"
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </button>

      {/* Panel */}
      {open && (
        <div className="absolute top-full mt-2 left-0 z-50 w-72 bg-surface border border-theme rounded-2xl shadow-2xl overflow-hidden">

          {/* Header azul */}
          <div className="bg-[#1067f2] px-4 py-3 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={prevMonth}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/20 text-white transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <button
              type="button"
              onClick={() => setPickingYear((p) => !p)}
              className="flex-1 text-center font-title font-extrabold text-white text-sm hover:bg-white/20 rounded-lg py-1 transition-colors cursor-pointer"
            >
              {MESES[viewMonth]} {viewYear}
            </button>

            <button
              type="button"
              onClick={nextMonth}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/20 text-white transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Selector de año */}
          {pickingYear ? (
            <div className="p-3 grid grid-cols-4 gap-1.5">
              {yearRange.map((y) => (
                <button
                  key={y}
                  type="button"
                  onClick={() => { setViewYear(y); setPickingYear(false); }}
                  className={`py-2 rounded-lg text-sm font-title font-bold transition-colors cursor-pointer
                    ${y === viewYear
                      ? 'bg-[#1067f2] text-white'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-surface-2'}`}
                >
                  {y}
                </button>
              ))}
            </div>
          ) : (
            <>
              {/* Cabecera días */}
              <div className="grid grid-cols-7 px-3 pt-3 pb-1">
                {DIAS_SEMANA.map((d) => (
                  <div key={d} className="text-center text-[10px] font-title font-bold text-muted uppercase py-1">
                    {d}
                  </div>
                ))}
              </div>

              {/* Días */}
              <div className="grid grid-cols-7 px-3 pb-3 gap-y-0.5">
                {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                  <div key={`e-${i}`} />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const sel = isSelected(day);
                  const tod = isToday(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => selectDay(day)}
                      className={`
                        w-full aspect-square flex items-center justify-center rounded-lg
                        text-sm font-title font-semibold transition-all cursor-pointer
                        ${sel
                          ? 'bg-[#1067f2] text-white shadow-sm'
                          : tod
                          ? 'border border-[#1067f2] text-[#1067f2] dark:text-[#a0c1df]'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-surface-2'
                        }
                      `}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>

              {/* Botón Hoy */}
              <div className="px-3 pb-3">
                <button
                  type="button"
                  onClick={selectToday}
                  className="w-full py-2 text-xs font-title font-bold text-[#1067f2] border border-[#1067f2]/30 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-colors cursor-pointer"
                >
                  Hoy — {formatVE(toYMD(today))}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
