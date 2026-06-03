'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { sincronizarDatos } from '@/lib/sync';
import SyncButton from '@/components/SyncButton';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const pathname = usePathname();
  const [online, setOnline] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const desktopDropdownRef = useRef<HTMLDivElement>(null);
  const mobileDropdownRef = useRef<HTMLDivElement>(null);

  // Detección de estado online/offline
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

  // Cerrar menú desplegable al hacer click fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownOpen &&
        (!desktopDropdownRef.current || !desktopDropdownRef.current.contains(event.target as Node)) &&
        (!mobileDropdownRef.current || !mobileDropdownRef.current.contains(event.target as Node))
      ) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen]);

  const userInitial = user?.email ? user.email.charAt(0).toUpperCase() : 'U';

  // Ítems de navegación principal
  const navItems = [
    {
      name: 'Inicio',
      href: '/',
      icon: (active: boolean) => (
        <svg
          className={`w-6 h-6 transition-colors duration-200 ${
            active
              ? 'text-[#1067f2] dark:text-[#a0c1df]'
              : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300'
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
          />
        </svg>
      ),
    },
    {
      name: 'Recepción Cría',
      href: '/lotes',
      icon: (active: boolean) => (
        <svg
          className={`w-6 h-6 transition-colors duration-200 ${
            active
              ? 'text-[#1067f2] dark:text-[#a0c1df]'
              : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300'
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
          />
        </svg>
      ),
    },
    {
      name: 'Diario Cría',
      href: '/cria-levante',
      icon: (active: boolean) => (
        <svg
          className={`w-6 h-6 transition-colors duration-200 ${
            active
              ? 'text-[#1067f2] dark:text-[#a0c1df]'
              : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300'
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
    },
    {
      name: 'Recep. Prod.',
      href: '/produccion/lotes',
      icon: (active: boolean) => (
        <svg
          className={`w-6 h-6 transition-colors duration-200 ${
            active
              ? 'text-[#1067f2] dark:text-[#a0c1df]'
              : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300'
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
        </svg>
      ),
    },
    {
      name: 'Diario Prod.',
      href: '/produccion/diario',
      icon: (active: boolean) => (
        <svg
          className={`w-6 h-6 transition-colors duration-200 ${
            active
              ? 'text-[#1067f2] dark:text-[#a0c1df]'
              : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300'
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
    },
    {
      name: 'Incubación',
      href: '/produccion/incubacion',
      icon: (active: boolean) => (
        <svg
          className={`w-6 h-6 transition-colors duration-200 ${
            active
              ? 'text-[#1067f2] dark:text-[#a0c1df]'
              : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300'
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" />
        </svg>
      ),
    },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#EDEDED] dark:bg-[#0a0e1c] text-[#1e2e5a] dark:text-[#e8eaed] transition-colors duration-300">
      
      {/* =========================================
         BARRA LATERAL (DESKTOP)
         ========================================= */}
      <aside className="hidden md:flex flex-col w-16 h-screen fixed left-0 top-0 bg-white dark:bg-[#11151e] border-r border-theme z-30 justify-between py-6 items-center shadow-lg transition-colors duration-300">
        {/* Logo superior */}
        <div className="flex flex-col items-center">
          <Link href="/" className="relative w-10 h-10 hover:opacity-85 transition-opacity" title="Control Operativo">
            <Image
              src="/isotipo_serex.png"
              alt="Logo"
              fill
              priority
              className="object-contain"
            />
          </Link>
        </div>

        {/* Ítems centrales */}
        <nav className="flex flex-col items-center gap-5 w-full">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative group p-2.5 rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'bg-blue-50 dark:bg-blue-950/40 text-[#1067f2] dark:text-[#a0c1df]'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                }`}
              >
                {item.icon(isActive)}
                
                {/* Tooltip en Hover */}
                <span className="absolute left-16 top-1/2 -translate-y-1/2 ml-2 px-2.5 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-title font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none whitespace-nowrap shadow-lg z-50">
                  {item.name}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Perfil y Conexión abajo */}
        <div className="flex flex-col items-center gap-4 relative" ref={desktopDropdownRef}>
          {/* Avatar del usuario con la inicial y el botón/punto de conexión */}
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white flex items-center justify-center font-title font-extrabold text-base shadow-md cursor-pointer transition-all hover:scale-105 relative"
            aria-label="Menú de usuario"
          >
            {userInitial}

            {/* Punto indicador de conexión */}
            <span
              className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-[#11151e] transition-all duration-300 ${
                online
                  ? 'bg-emerald-500 shadow-[0_0_6px_#10b981]'
                  : 'bg-rose-500 shadow-[0_0_6px_#ef4444] animate-pulse'
              }`}
              title={online ? 'En línea' : 'Sin conexión'}
            />
          </button>

          {/* Menú Desplegable (Dropdown) */}
          {dropdownOpen && (
            <div className="absolute bottom-12 left-2 w-64 bg-white dark:bg-[#11151e] border border-slate-200 dark:border-[#2c3245] rounded-xl shadow-xl p-4 z-50 flex flex-col gap-3 font-sans">
              <div className="border-b border-slate-100 dark:border-[#2c3245] pb-2.5">
                <p className="text-xs text-slate-400 dark:text-slate-500 font-title font-semibold uppercase tracking-wider">Usuario</p>
                <p className="text-sm font-bold truncate text-slate-800 dark:text-slate-200" title={user?.email}>{user?.email}</p>
              </div>

              {/* Botón de estado de conexión */}
              <div className="flex items-center justify-between text-xs py-1.5 px-2 rounded-lg bg-slate-50 dark:bg-[#090b11]/50 border border-slate-100 dark:border-[#2c3245]">
                <span className="font-semibold text-slate-600 dark:text-slate-400">Estado</span>
                <span className={`font-extrabold flex items-center gap-1.5 ${online ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  <span className={`w-2 h-2 rounded-full ${online ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                  {online ? 'Conectado' : 'Sin Conexión'}
                </span>
              </div>

              {/* Toggle de Tema */}
              <button
                onClick={toggleTheme}
                className="w-full flex items-center justify-between text-xs py-2 px-2.5 rounded-lg border border-slate-100 dark:border-[#2c3245] hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer transition-colors"
              >
                <span>Cambiar Tema</span>
                <span>{isDark ? '☀️ Claro' : '🌙 Oscuro'}</span>
              </button>

              {/* Botón de Cerrar Sesión */}
              <button
                onClick={logout}
                className="w-full flex items-center justify-center gap-2 text-xs py-2.5 px-3 rounded-lg bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/40 border border-rose-100 dark:border-rose-900/40 font-title font-bold cursor-pointer transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Cerrar Sesión
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* =========================================
         CABECERA SUPERIOR (MÓVIL)
         ========================================= */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-14 bg-white/95 dark:bg-[#11151e]/95 backdrop-blur-md border-b border-slate-100 dark:border-[#2c3245] z-30 flex items-center justify-between px-4 transition-colors duration-300 shadow-sm">
        <Link href="/" className="relative w-28 h-8 hover:opacity-85 transition-opacity">
          {/* Usamos el Isotipo de Serex a la izquierda del header móvil */}
          <Image
            src="/isotipo_serex.png"
            alt="Serex Logo"
            fill
            priority
            className="object-contain object-left"
          />
        </Link>

        {/* Info de conexión y Avatar de la persona en el lado derecho */}
        <div className="flex items-center gap-3 relative" ref={mobileDropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 text-white flex items-center justify-center font-title font-extrabold text-xs shadow-sm cursor-pointer relative"
          >
            {userInitial}
            
            {/* Punto indicador de conexión */}
            <span
              className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border border-white dark:border-[#11151e] transition-all duration-300 ${
                online
                  ? 'bg-emerald-500'
                  : 'bg-rose-500 animate-pulse'
              }`}
            />
          </button>

          {/* Dropdown flotante en móvil */}
          {dropdownOpen && (
            <div className="absolute top-10 right-0 w-56 bg-white dark:bg-[#11151e] border border-slate-200 dark:border-[#2c3245] rounded-xl shadow-xl p-3.5 z-50 flex flex-col gap-2.5 font-sans">
              <div className="border-b border-slate-100 dark:border-[#2c3245] pb-2">
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-title font-semibold uppercase tracking-wider">Usuario</p>
                <p className="text-xs font-bold truncate text-slate-800 dark:text-slate-200">{user?.email}</p>
              </div>

              {/* Botón de estado */}
              <div className="flex items-center justify-between text-[11px] py-1.5 px-2 rounded-lg bg-slate-50 dark:bg-[#090b11]/50 border border-slate-100 dark:border-[#2c3245]">
                <span className="font-semibold text-slate-600 dark:text-slate-400">Estado</span>
                <span className={`font-extrabold flex items-center gap-1 ${online ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${online ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                  {online ? 'En Línea' : 'Sin Red'}
                </span>
              </div>

              {/* Botón cambiar tema */}
              <button
                onClick={toggleTheme}
                className="w-full flex items-center justify-between text-[11px] py-1.5 px-2 rounded-lg border border-slate-100 dark:border-[#2c3245] hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer"
              >
                <span>Cambiar Tema</span>
                <span>{isDark ? '☀️ Claro' : '🌙 Oscuro'}</span>
              </button>

              {/* Botón cerrar sesión */}
              <button
                onClick={logout}
                className="w-full flex items-center justify-center gap-1.5 text-[11px] py-2 px-3 rounded-lg bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/40 border border-rose-100 dark:border-rose-900/40 font-title font-bold cursor-pointer"
              >
                Cerrar Sesión
              </button>
            </div>
          )}
        </div>
      </header>

      {/* =========================================
         BARRA DE NAVEGACIÓN INFERIOR (MÓVIL)
         ========================================= */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white/95 dark:bg-[#11151e]/95 backdrop-blur-md border-t border-slate-100 dark:border-[#2c3245] z-30 flex items-center justify-around pb-safe transition-colors duration-300 shadow-[0_-2px_10px_rgba(0,0,0,0.04)]">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 h-full py-1 gap-1 text-[11px] font-title font-bold transition-all duration-200 ${
                isActive
                  ? 'text-[#1067f2] dark:text-[#a0c1df]'
                  : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
            >
              <div className={`p-1.5 rounded-lg transition-colors ${isActive ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''}`}>
                {item.icon(isActive)}
              </div>
              <span className="tracking-tight leading-none">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* =========================================
         CONTENIDO PRINCIPAL
         ========================================= */}
      <div className="flex-1 flex flex-col md:pl-16 pt-14 md:pt-0 pb-16 md:pb-0 min-h-screen">
        <main className="flex-1 w-full px-4 sm:px-6 py-5 md:py-6">
          {children}
        </main>
      </div>

      {/* Botón flotante de sincronización con la base de datos */}
      <SyncButton />

    </div>
  );
}
