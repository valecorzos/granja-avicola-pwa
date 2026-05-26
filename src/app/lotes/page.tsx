'use client';

import React, { useState, useEffect } from 'react';
import { dbLocal } from '@/lib/db-local';
import { sincronizarDatos } from '@/lib/sync';

export default function LotesPage() {
  const [lotes, setLotes] = useState<any[]>([]);
  const [form, setForm] = useState({
    codigo_lote: '',
    fecha_llegada: '',
    raza: '',
    cantidad_hembras: 0,
    cantidad_machos: 0,
    ubicacion: '',
    galpon: '',
  });
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });

  const cargarLotes = async () => {
    if (!dbLocal) return;
    try {
      const list = await dbLocal.lotes.toArray();
      setLotes(list.sort((a, b) => new Date(b.creado_en).getTime() - new Date(a.creado_en).getTime()));
    } catch (err) {
      console.error('Error al cargar lotes:', err);
    }
  };

  const guardarLote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dbLocal) return;

    if (!form.codigo_lote || !form.fecha_llegada || !form.raza || !form.ubicacion || !form.galpon) {
      mostrarMensaje('Por favor, complete todos los campos obligatorios.', 'error');
      return;
    }

    setLoading(true);
    try {
      const id_local = crypto.randomUUID();
      const nuevoLote = {
        id_local,
        id: null,
        codigo_lote: form.codigo_lote,
        fecha_registro: new Date().toISOString().split('T')[0],
        fecha_llegada: form.fecha_llegada,
        raza: form.raza,
        cantidad_hembras: Number(form.cantidad_hembras) || 0,
        cantidad_machos: Number(form.cantidad_machos) || 0,
        ubicacion: form.ubicacion,
        galpon: form.galpon,
        estado: 'activo',
        estado_sync: 'pendiente' as const,
        creado_en: new Date().toISOString(),
        actualizado_en: new Date().toISOString(),
      };

      await dbLocal.lotes.add(nuevoLote);

      setForm({
        codigo_lote: '',
        fecha_llegada: '',
        raza: '',
        cantidad_hembras: 0,
        cantidad_machos: 0,
        ubicacion: '',
        galpon: '',
      });

      mostrarMensaje('Lote guardado localmente con éxito.', 'success');
      await cargarLotes();

      if (navigator.onLine) {
        sincronizarDatos();
      }
    } catch (err) {
      console.error('Error al guardar el lote:', err);
      mostrarMensaje('Error al guardar el lote en el dispositivo.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const mostrarMensaje = (texto: string, tipo: string) => {
    setMensaje({ texto, tipo });
    setTimeout(() => {
      setMensaje({ texto: '', tipo: '' });
    }, 4000);
  };

  useEffect(() => {
    cargarLotes();
  }, []);

  return (
    <div className="space-y-6">
      {mensaje.texto && (
        <div
          className={`p-4 rounded-xl text-sm font-semibold border ${
            mensaje.tipo === 'success'
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
          }`}
        >
          {mensaje.texto}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Formulario de registro */}
        <div className="bg-surface border border-theme rounded-2xl p-6 shadow-xl">
          <h3 className="text-xl font-title font-extrabold text-slate-800 dark:text-slate-100 mb-6">
            Registrar Nuevo Lote
          </h3>
          <form onSubmit={guardarLote} className="space-y-4">
            <div>
              <label className="block text-xs font-title font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                Código del Lote *
              </label>
              <input
                type="text"
                value={form.codigo_lote}
                onChange={(e) => setForm({ ...form, codigo_lote: e.target.value })}
                className="w-full bg-surface-2 border border-theme rounded-xl px-4 py-3 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#1067f2] focus:border-transparent transition-all"
                placeholder="Ej. LOTE-2026-A"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-title font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Fecha de Llegada *
                </label>
                <input
                  type="date"
                  value={form.fecha_llegada}
                  onChange={(e) => setForm({ ...form, fecha_llegada: e.target.value })}
                  className="w-full bg-surface-2 border border-theme rounded-xl px-4 py-3 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#1067f2] focus:border-transparent transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-title font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Raza *
                </label>
                <input
                  type="text"
                  value={form.raza}
                  onChange={(e) => setForm({ ...form, raza: e.target.value })}
                  className="w-full bg-surface-2 border border-theme rounded-xl px-4 py-3 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#1067f2] focus:border-transparent transition-all"
                  placeholder="Ej. Cobb 500"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-title font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Cantidad Hembras *
                </label>
                <input
                  type="number"
                  value={form.cantidad_hembras}
                  onChange={(e) => setForm({ ...form, cantidad_hembras: Number(e.target.value) })}
                  className="w-full bg-surface-2 border border-theme rounded-xl px-4 py-3 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#1067f2] focus:border-transparent transition-all"
                  min="0"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-title font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Cantidad Machos *
                </label>
                <input
                  type="number"
                  value={form.cantidad_machos}
                  onChange={(e) => setForm({ ...form, cantidad_machos: Number(e.target.value) })}
                  className="w-full bg-surface-2 border border-theme rounded-xl px-4 py-3 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#1067f2] focus:border-transparent transition-all"
                  min="0"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-title font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Ubicación *
                </label>
                <input
                  type="text"
                  value={form.ubicacion}
                  onChange={(e) => setForm({ ...form, ubicacion: e.target.value })}
                  className="w-full bg-surface-2 border border-theme rounded-xl px-4 py-3 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#1067f2] focus:border-transparent transition-all"
                  placeholder="Ej. Sector Sur"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-title font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Galpón *
                </label>
                <input
                  type="text"
                  value={form.galpon}
                  onChange={(e) => setForm({ ...form, galpon: e.target.value })}
                  className="w-full bg-surface-2 border border-theme rounded-xl px-4 py-3 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#1067f2] focus:border-transparent transition-all"
                  placeholder="Ej. Galpón 2"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 mt-4 bg-[#1067f2] hover:bg-[#0c328f] text-white font-title font-bold rounded-xl transition-all shadow-md shadow-blue-500/20 disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Guardando...' : 'Guardar Lote'}
            </button>
          </form>
        </div>

        {/* Listado de Lotes */}
        <div className="bg-surface border border-theme rounded-2xl p-6 shadow-xl flex flex-col">
          <h3 className="text-xl font-title font-extrabold text-slate-800 dark:text-slate-100 mb-6">
            Maestro de Lotes
          </h3>
          <div className="overflow-x-auto flex-1 rounded-xl border border-theme max-h-[460px] overflow-y-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-surface-2 border-b border-theme">
                  <th className="p-4 font-title font-bold text-slate-600 dark:text-slate-300">Lote</th>
                  <th className="p-4 font-title font-bold text-slate-600 dark:text-slate-300">Galpón</th>
                  <th className="p-4 font-title font-bold text-slate-600 dark:text-slate-300">Hembras / Machos</th>
                  <th className="p-4 font-title font-bold text-slate-600 dark:text-slate-300">Sync</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme">
                {lotes.map((lote) => (
                  <tr key={lote.id_local} className="hover:bg-surface-2/40 transition-colors">
                    <td className="p-4">
                      <div className="font-title font-bold text-slate-800 dark:text-slate-200">{lote.codigo_lote}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{lote.raza}</div>
                    </td>
                    <td className="p-4 text-slate-700 dark:text-slate-300">{lote.galpon}</td>
                    <td className="p-4 text-slate-700 dark:text-slate-300">
                      {lote.cantidad_hembras} H / {lote.cantidad_machos} M
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-title font-bold border ${
                          lote.estado_sync === 'sincronizado'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                            : lote.estado_sync === 'pendiente'
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                            : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                        }`}
                      >
                        {lote.estado_sync}
                      </span>
                    </td>
                  </tr>
                ))}
                {lotes.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-500 dark:text-slate-400">
                      No hay lotes registrados localmente.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
