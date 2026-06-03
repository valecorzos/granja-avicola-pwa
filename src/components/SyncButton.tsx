'use client';

import React, { useEffect, useState } from 'react';
import { liveQuery } from 'dexie';
import { sincronizarDatos, contarPendientes } from '@/lib/sync';
import { sincronizarMaestro } from '@/lib/maestro';
import { useToast } from '@/components/Toast';

type Estado = 'idle' | 'sincronizando' | 'ok' | 'error';

/**
 * Botón flotante de actualización. Vive sobre el contenedor principal.
 *  • Muestra en vivo cuántos registros quedan pendientes por subir.
 *  • Al pulsar, intenta sincronizar maestro + datos contra Supabase.
 *  • Refleja conexión, progreso y resultado.
 */
export default function SyncButton() {
  const toast = useToast();
  const [pendientes, setPendientes] = useState(0);
  const [estado, setEstado] = useState<Estado>('idle');
  const [online, setOnline] = useState(true);

  // Conteo de pendientes en vivo
  useEffect(() => {
    const sub = liveQuery(() => contarPendientes()).subscribe({
      next: (n) => setPendientes(n),
      error: (e) => console.error('liveQuery pendientes:', e),
    });
    return () => sub.unsubscribe();
  }, []);

  // Estado de conexión
  useEffect(() => {
    if (typeof window === 'undefined') return;
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  const sincronizar = async () => {
    if (estado === 'sincronizando') return;
    if (!navigator.onLine) {
      toast.warning('Sin conexión. Los datos se subirán cuando vuelvas a tener internet.');
      return;
    }

    setEstado('sincronizando');
    try {
      await sincronizarMaestro();
      const res = await sincronizarDatos();

      if (res === 'sin-sesion') {
        setEstado('error');
        toast.error('Sesión expirada. Cierra sesión e inicia de nuevo CON internet para poder subir los datos.');
        return;
      }

      const restantes = await contarPendientes();
      if (restantes === 0) {
        setEstado('ok');
        toast.success('Todo sincronizado con la base de datos.');
      } else {
        setEstado('error');
        toast.error(`Quedaron ${restantes} registro(s) sin subir. Revisa la conexión.`);
      }
    } catch (e) {
      console.error('Error al sincronizar:', e);
      setEstado('error');
      toast.error('No se pudo sincronizar con la base de datos.');
    } finally {
      setTimeout(() => setEstado('idle'), 2200);
    }
  };

  const sincronizando = estado === 'sincronizando';

  // Color del botón según estado / pendientes
  const colorCls =
    estado === 'ok'
      ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/30'
      : estado === 'error'
      ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/30'
      : !online
      ? 'bg-slate-400 hover:bg-slate-500 shadow-slate-500/20'
      : pendientes > 0
      ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/30'
      : 'bg-[#1067f2] hover:bg-[#0c328f] shadow-blue-500/30';

  const titulo = !online
    ? 'Sin conexión'
    : sincronizando
    ? 'Sincronizando…'
    : pendientes > 0
    ? `${pendientes} pendiente(s) — toca para subir`
    : 'Todo al día — toca para actualizar';

  return (
    <button
      type="button"
      onClick={sincronizar}
      disabled={sincronizando}
      title={titulo}
      aria-label={titulo}
      className={`fixed z-40 bottom-20 right-4 md:bottom-6 md:right-6
        w-14 h-14 rounded-full text-white flex items-center justify-center
        shadow-xl transition-all duration-300 cursor-pointer
        hover:scale-105 active:scale-95 disabled:cursor-wait ${colorCls}`}
    >
      {/* Anillo pulsante cuando hay pendientes */}
      {pendientes > 0 && online && estado === 'idle' && (
        <span className="absolute inset-0 rounded-full bg-amber-400/40 animate-ping" />
      )}

      {/* Ícono según estado */}
      {estado === 'ok' ? (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ) : !online ? (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636a9 9 0 010 12.728M3 3l18 18M5.636 5.636a9 9 0 000 12.728" />
        </svg>
      ) : (
        <svg
          className={`w-6 h-6 ${sincronizando ? 'animate-spin' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      )}

      {/* Badge con el número de pendientes */}
      {pendientes > 0 && !sincronizando && estado === 'idle' && (
        <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 rounded-full bg-white text-amber-600 text-[11px] font-title font-extrabold flex items-center justify-center shadow-md border border-amber-200">
          {pendientes > 99 ? '99+' : pendientes}
        </span>
      )}
    </button>
  );
}
