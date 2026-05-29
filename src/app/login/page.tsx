'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';

export default function LoginPage() {
  const { login, loading, isOffline, user } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // ✅ Redirección en useEffect, NUNCA durante el render
  useEffect(() => {
    if (user && !loading) {
      router.replace('/');
    }
  }, [user, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      router.replace('/');
    } catch (err: unknown) {
      setError('Usuario y/o Contraseña incorrecto');
    } finally {
      setSubmitting(false);
    }
  };

  // Mientras se verifica sesión guardada, no mostrar nada para evitar flash
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#EDEDED] dark:bg-[var(--background)]">
        <div className="w-8 h-8 border-4 border-[#1067f2] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div
      className="relative min-h-screen flex items-center justify-center bg-cover bg-center"
      style={{ backgroundImage: "url('/Fondo PC-app.jpg')" }}
    >
      {/* Overlay semitransparente con tinte del nuevo fondo oscuro */}
      <div className="absolute inset-0 bg-black/40 dark:bg-[var(--background)]/70 backdrop-blur-sm" />

      {/* Toggle de tema — esquina superior derecha */}
      <button
        onClick={toggleTheme}
        className="absolute top-5 right-5 z-20 p-2.5 rounded-full bg-white/80 dark:bg-[var(--surface-2)]/80 hover:bg-white dark:hover:bg-[var(--surface-2)] border border-theme shadow-md transition-all cursor-pointer"
        aria-label="Cambiar tema"
        title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      >
        <span className="text-lg">{isDark ? '☀️' : '🌙'}</span>
      </button>

      {/* Card de login */}
      <div className="relative z-10 w-full max-w-sm mx-4">
        <div className="bg-white/95 dark:bg-[var(--surface)]/95 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-theme dark:border-[var(--border)]">

          {/* Logo y título */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative w-50 h-20">
              <Image
                src="/isotipo_serex.png"
                alt="Alimentos Serex"
                fill
                className="object-contain drop-shadow-md"
              />
            </div>
            <h1 className="mt-5 text-2xl font-title font-extrabold text-slate-800 dark:text-white tracking-tight">
              Bienvenido
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
              Gestión de Reproductora
            </p>
            {isOffline && (
              <div className="mt-3 flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-100 dark:bg-amber-900/40 border border-amber-300 dark:border-amber-600">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-xs font-title font-bold text-amber-700 dark:text-amber-400">
                  Modo Sin Conexión
                </span>
              </div>
            )}
          </div>

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div>
              <label
                htmlFor="login-email"
                className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1"
              >
                Correo electrónico
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 border border-theme rounded-lg bg-white dark:bg-[var(--surface-2)] text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1067f2] focus:border-transparent transition-all"
                placeholder="correo@empresa.com"
              />
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1"
              >
                Contraseña
              </label>
              <input
                id="login-password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 border border-theme rounded-lg bg-white dark:bg-[var(--surface-2)] text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1067f2] focus:border-transparent transition-all"
                placeholder="••••••••"
              />
            </div>

            {/* Mensaje de error */}
            {error && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700">
                <span className="text-red-500 mt-0.5 text-sm">⚠</span>
                <p className="text-sm text-red-600 dark:text-red-400" role="alert">
                  {error}
                </p>
              </div>
            )}

            {/* Botón de login */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 px-4 bg-[#1067f2] hover:bg-[#0c328f] dark:hover:bg-[var(--accent-hover)] active:bg-[#1e2e5a] text-white font-title font-bold rounded-lg transition-all shadow-md shadow-blue-500/20 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer"
            >
              {submitting ? (
                <svg
                  className="animate-spin h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="3"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              ) : isOffline ? (
                'Ingresar (Offline)'
              ) : (
                'Ingresar'
              )}
            </button>
          </form>

          {/* Nota offline */}
          {isOffline && (
            <p className="mt-4 text-xs text-center text-slate-500 dark:text-slate-400">
              Sin conexión. Se usarán las credenciales guardadas localmente.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}