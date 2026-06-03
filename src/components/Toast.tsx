'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type ToastTipo = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: number;
  tipo: ToastTipo;
  mensaje: string;
  duracion: number;
}

interface ToastContextValue {
  notify: (mensaje: string, tipo?: ToastTipo, duracion?: number) => void;
  success: (mensaje: string, duracion?: number) => void;
  error: (mensaje: string, duracion?: number) => void;
  info: (mensaje: string, duracion?: number) => void;
  warning: (mensaje: string, duracion?: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast debe usarse dentro de <ToastProvider>');
  return ctx;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const notify = useCallback(
    (mensaje: string, tipo: ToastTipo = 'info', duracion = 3500) => {
      const id = Date.now() + Math.random();
      setToasts((t) => [...t, { id, tipo, mensaje, duracion }]);
    },
    []
  );

  const api: ToastContextValue = {
    notify,
    success: (m, d) => notify(m, 'success', d),
    error: (m, d) => notify(m, 'error', d),
    info: (m, d) => notify(m, 'info', d),
    warning: (m, d) => notify(m, 'warning', d),
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      {mounted &&
        createPortal(
          <div
            className="fixed z-[100] flex flex-col gap-3 pointer-events-none
                       top-4 right-4 left-4 items-center
                       md:top-6 md:right-6 md:left-auto md:items-end
                       max-w-md md:max-w-sm md:ml-auto"
            aria-live="polite"
            aria-atomic="true"
          >
            {toasts.map((t) => (
              <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
            ))}
          </div>,
          document.body
        )}
    </ToastContext.Provider>
  );
}

// ─── Configuración visual por tipo ────────────────────────────────────────────

const CONFIG: Record<
  ToastTipo,
  { ringCls: string; iconBgCls: string; barCls: string; icon: React.ReactNode; titulo: string }
> = {
  success: {
    ringCls: 'border-emerald-500/30',
    iconBgCls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    barCls: 'bg-emerald-500',
    titulo: 'Éxito',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    ),
  },
  error: {
    ringCls: 'border-rose-500/30',
    iconBgCls: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
    barCls: 'bg-rose-500',
    titulo: 'Error',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
  },
  info: {
    ringCls: 'border-[#1067f2]/30',
    iconBgCls: 'bg-[#1067f2]/10 text-[#1067f2] dark:text-[#a0c1df]',
    barCls: 'bg-[#1067f2]',
    titulo: 'Información',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  warning: {
    ringCls: 'border-amber-500/30',
    iconBgCls: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    barCls: 'bg-amber-500',
    titulo: 'Atención',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
  },
};

// ─── ToastItem ────────────────────────────────────────────────────────────────

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const [leaving, setLeaving] = useState(false);
  const [paused, setPaused] = useState(false);
  const cfg = CONFIG[toast.tipo];

  // Auto-dismiss
  useEffect(() => {
    if (paused) return;
    const t = setTimeout(() => {
      setLeaving(true);
      setTimeout(onDismiss, 220);
    }, toast.duracion);
    return () => clearTimeout(t);
  }, [toast.duracion, paused, onDismiss]);

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className={`
        pointer-events-auto w-full
        bg-white/95 dark:bg-[#11151e]/95 backdrop-blur-xl
        border ${cfg.ringCls} rounded-2xl shadow-2xl
        overflow-hidden
        transition-all duration-200 ease-out
        ${leaving
          ? 'opacity-0 translate-x-4 scale-95'
          : 'opacity-100 translate-x-0 scale-100 animate-[toastIn_220ms_ease-out]'}
      `}
      role="status"
    >
      <div className="flex items-start gap-3 p-4">
        {/* Icono */}
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.iconBgCls}`}>
          {cfg.icon}
        </div>

        {/* Contenido */}
        <div className="flex-1 min-w-0 pt-0.5">
          <p className="text-[11px] font-title font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 leading-none mb-1">
            {cfg.titulo}
          </p>
          <p className="text-sm font-title font-semibold text-slate-700 dark:text-slate-200 leading-snug break-words">
            {toast.mensaje}
          </p>
        </div>

        {/* Cerrar */}
        <button
          type="button"
          onClick={() => { setLeaving(true); setTimeout(onDismiss, 220); }}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-300 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer flex-shrink-0"
          aria-label="Cerrar"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Barra de progreso */}
      <div className="h-1 bg-slate-100 dark:bg-slate-800/50 relative overflow-hidden">
        <div
          className={`absolute inset-y-0 left-0 ${cfg.barCls} origin-left`}
          style={{
            animation: `toastProgress ${toast.duracion}ms linear forwards`,
            animationPlayState: paused ? 'paused' : 'running',
          }}
        />
      </div>

      {/* Keyframes locales */}
      <style jsx>{`
        @keyframes toastIn {
          from {
            opacity: 0;
            transform: translateX(24px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }
        @keyframes toastProgress {
          from { transform: scaleX(1); }
          to   { transform: scaleX(0); }
        }
      `}</style>
    </div>
  );
}
