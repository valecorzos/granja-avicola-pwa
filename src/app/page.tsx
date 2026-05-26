'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { dbLocal } from '@/lib/db-local';
import { useAuth } from '@/context/AuthContext';

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState({
    totalLotes: 0,
    lotesActivos: 0,
    pendientesSync: 0,
  });
  const [online, setOnline] = useState(true);

  const cargarStats = async () => {
    if (!dbLocal) return;

    try {
      const todosLotes = await dbLocal.lotes.toArray();
      const lotesActivosCount = todosLotes.filter((l) => l.estado === 'activo').length;

      const lotesPendientes = todosLotes.filter((l) => l.estado_sync === 'pendiente').length;
      const criaPendientes = await dbLocal.cria_levante_diario
        .where('estado_sync')
        .equals('pendiente')
        .count();

      setStats({
        totalLotes: todosLotes.length,
        lotesActivos: lotesActivosCount,
        pendientesSync: lotesPendientes + criaPendientes,
      });
    } catch (err) {
      console.error('Error al cargar estadísticas:', err);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOnline(navigator.onLine);
      cargarStats();

      const interval = setInterval(cargarStats, 5000);
      return () => clearInterval(interval);
    }
  }, []);

  return (
    <div className="space-y-8">
      {/* Header con bienvenida y botón logout */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-title font-extrabold tracking-tight text-slate-800 dark:text-slate-100">
            Panel de Operaciones
          </h2>
          <p className="text-slate-500 dark:text-slate-300 mt-2">
            Bienvenido, <span className="font-title font-bold text-[#1067f2] dark:text-[#a0c1df]">{user?.email}</span>
          </p>
        </div>
        <button
          onClick={logout}
          className="px-4 py-2 text-sm font-title font-semibold rounded-lg bg-slate-100 dark:bg-[#0c328f]/40 border border-theme text-slate-700 dark:text-slate-300 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 dark:hover:text-red-400 hover:border-red-200 dark:hover:border-red-700 transition-all cursor-pointer"
        >
          Cerrar Sesión
        </button>
      </div>

      {/* Grid de Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-surface border border-theme rounded-2xl p-6 shadow-sm dark:shadow-lg hover:border-[#1067f2]/50 dark:hover:border-[#1067f2]/30 transition-all">
          <span className="text-xs font-title font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">
            Lotes Totales
          </span>
          <div className="text-3xl font-title font-extrabold text-[#1067f2] dark:text-[#a0c1df] mt-2">
            {stats.totalLotes}
          </div>
        </div>

        <div className="bg-surface border border-theme rounded-2xl p-6 shadow-sm dark:shadow-lg hover:border-[#0c328f]/50 dark:hover:border-[#0c328f]/30 transition-all">
          <span className="text-xs font-title font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">
            Lotes Activos
          </span>
          <div className="text-3xl font-title font-extrabold text-[#0c328f] dark:text-[#a0c1df] mt-2">
            {stats.lotesActivos}
          </div>
        </div>

        <div className="bg-surface border border-theme rounded-2xl p-6 shadow-sm dark:shadow-lg hover:border-[#a0c1df]/50 dark:hover:border-[#a0c1df]/30 transition-all">
          <span className="text-xs font-title font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">
            Pendientes de Sincronización
          </span>
          <div
            className={`text-3xl font-title font-extrabold mt-2 ${
              stats.pendientesSync > 0 ? 'text-amber-500 dark:text-amber-400' : 'text-[#1067f2] dark:text-[#a0c1df]'
            }`}
          >
            {stats.pendientesSync}
          </div>
        </div>
      </div>

      {/* Tarjeta resumen */}
      <div className="bg-surface border border-theme rounded-2xl p-8 shadow-sm dark:shadow-xl">
        <h3 className="text-xl font-title font-extrabold text-slate-800 dark:text-slate-100 mb-4">
          Resumen Logístico Avícola
        </h3>
        <p className="text-slate-500 dark:text-slate-300 max-w-2xl leading-relaxed mb-6">
          Esta plataforma progresiva (PWA) permite registrar lotes operativos, mortalidad y consumos
          de alimento incluso en zonas de crianza sin cobertura de red. Los datos se guardan de
          forma local y se sincronizan de forma transparente con la nube en cuanto se recupera la
          señal.
        </p>

        <div className="flex gap-4 flex-wrap">
          <Link
            href="/lotes"
            className="px-6 py-2.5 bg-[#1067f2] hover:bg-[#0c328f] text-white font-title font-bold rounded-xl transition-all shadow-md shadow-blue-500/20"
          >
            Gestionar Lotes
          </Link>
          <Link
            href="/cria-levante"
            className="px-6 py-2.5 bg-[#0c328f] hover:bg-[#1e2e5a] text-white font-title font-bold rounded-xl transition-all shadow-md shadow-blue-900/20"
          >
            Registro Cría y Levante
          </Link>
        </div>
      </div>
    </div>
  );
}
