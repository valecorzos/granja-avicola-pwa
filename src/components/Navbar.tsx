'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { sincronizarDatos } from '@/lib/sync';
import { useTheme } from '@/context/ThemeContext';

export default function Navbar() {
  const [online, setOnline] = useState(true);
  const pathname = usePathname();

  // ✅ Hooks al nivel del componente (no dentro de callbacks ni IIFEs)
  const { isDark, toggleTheme } = useTheme();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOnline(navigator.onLine);

      const handleOnline = () => {
        setOnline(true);
        sincronizarDatos();
      };
      const handleOffline = () => setOnline(false);

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, []);

  return (
    <header className="sticky top-0 z-50 bg-white/80 dark:bg-[#1e2e5a]/85 backdrop-blur-md border-b border-theme py-4 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-6 flex justify-between items-center flex-wrap gap-4">
        {/* Logo / Título */}
        <div>
          <Link href="/">
            <h1 className="text-xl font-title font-extrabold tracking-tight bg-gradient-to-r from-[#1067f2] to-[#0c328f] dark:from-[#a0c1df] dark:to-[#1067f2] bg-clip-text text-transparent hover:opacity-90 transition-opacity">
              Control Operativo Avícola
            </h1>
          </Link>
        </div>

        {/* Navegación */}
        <nav className="flex items-center gap-6">
          <Link
            href="/"
            className={`text-sm font-title font-semibold transition-colors ${
              pathname === '/' ? 'text-[#1067f2] dark:text-[#a0c1df]' : 'text-slate-500 dark:text-slate-300 hover:text-[#1067f2] dark:hover:text-[#a0c1df]'
            }`}
          >
            Panel General
          </Link>
          <Link
            href="/lotes"
            className={`text-sm font-title font-semibold transition-colors ${
              pathname === '/lotes' ? 'text-[#1067f2] dark:text-[#a0c1df]' : 'text-slate-500 dark:text-slate-300 hover:text-[#1067f2] dark:hover:text-[#a0c1df]'
            }`}
          >
            Maestro Lotes
          </Link>
          <Link
            href="/cria-levante"
            className={`text-sm font-title font-semibold transition-colors ${
              pathname === '/cria-levante' ? 'text-[#1067f2] dark:text-[#a0c1df]' : 'text-slate-500 dark:text-slate-300 hover:text-[#1067f2] dark:hover:text-[#a0c1df]'
            }`}
          >
            Cría y Levante
          </Link>
        </nav>

        {/* Controles derecha */}
        <div className="flex items-center gap-3">
          {/* Estado de conexión */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-title font-bold uppercase tracking-wider bg-slate-100 dark:bg-[#0c328f]/40 border border-theme">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                online
                  ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]'
                  : 'bg-rose-500 shadow-[0_0_8px_#ef4444]'
              }`}
            />
            <span className="text-slate-700 dark:text-slate-200">
              {online ? 'En Línea' : 'Modo Offline'}
            </span>
          </div>

          {/* Toggle de tema */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full bg-slate-100 dark:bg-[#0c328f]/40 border border-theme hover:bg-slate-200 dark:hover:bg-[#0c328f]/70 transition-all cursor-pointer"
            aria-label="Cambiar tema"
            title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          >
            {isDark ? '☀️' : '🌙'}
          </button>
        </div>
      </div>
    </header>
  );
}
