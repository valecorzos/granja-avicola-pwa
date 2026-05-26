'use client';

import React, { useState, useEffect } from 'react';
import { dbLocal } from '@/lib/db-local';
import { sincronizarDatos } from '@/lib/sync';

export default function CriaLevantePage() {
  const [registros, setRegistros] = useState<any[]>([]);
  const [lotes, setLotes] = useState<any[]>([]);
  const [form, setForm] = useState({
    lote_id_local: '',
    fecha: new Date().toISOString().split('T')[0],
    semana_ave: 1,
    sexo: 'H' as 'H' | 'M',
    mortalidad: 0,
    consumo_alimento_kg: 0,
  });
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });

  const cargarDatos = async () => {
    if (!dbLocal) return;

    try {
      const listLotes = await dbLocal.lotes.toArray();
      setLotes(listLotes);

      const listRegs = await dbLocal.cria_levante_diario.toArray();
      const mappedRegs = listRegs.map((reg) => {
        const lote = listLotes.find((l) => l.id_local === reg.lote_id_local || (l.id && l.id === reg.lote_id));
        return {
          ...reg,
          codigo_lote: lote ? lote.codigo_lote : 'Desconocido',
        };
      });

      setRegistros(mappedRegs.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()));
    } catch (err) {
      console.error('Error al cargar cría y levante:', err);
    }
  };

  const guardarRegistro = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dbLocal) return;

    if (!form.lote_id_local || !form.fecha || form.semana_ave === undefined) {
      mostrarMensaje('Por favor, complete todos los campos obligatorios.', 'error');
      return;
    }

    setLoading(true);
    try {
      const id_local = crypto.randomUUID();
      const lote = lotes.find((l) => l.id_local === form.lote_id_local);
      const lote_id_supabase = lote ? lote.id : null;

      const nuevoRegistro = {
        id_local,
        id: null,
        lote_id_local: form.lote_id_local,
        lote_id: lote_id_supabase,
        fecha: form.fecha,
        semana_ave: Number(form.semana_ave) || 0,
        sexo: form.sexo,
        mortalidad: Number(form.mortalidad) || 0,
        consumo_alimento_kg: Number(form.consumo_alimento_kg) || 0,
        estado_sync: 'pendiente' as const,
        creado_en: new Date().toISOString(),
        actualizado_en: new Date().toISOString(),
      };

      await dbLocal.cria_levante_diario.add(nuevoRegistro);

      setForm((prev) => ({
        ...prev,
        mortalidad: 0,
        consumo_alimento_kg: 0,
      }));

      mostrarMensaje('Registro diario guardado localmente con éxito.', 'success');
      await cargarDatos();

      if (navigator.onLine) {
        sincronizarDatos();
      }
    } catch (err) {
      console.error('Error al guardar registro:', err);
      mostrarMensaje('Error al guardar el registro en el dispositivo.', 'error');
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
    cargarDatos();
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
            Registro Diario de Lote
          </h3>
          <form onSubmit={guardarRegistro} className="space-y-4">
            <div>
              <label className="block text-xs font-title font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                Seleccionar Lote *
              </label>
              <select
                value={form.lote_id_local}
                onChange={(e) => setForm({ ...form, lote_id_local: e.target.value })}
                className="w-full bg-surface-2 border border-theme rounded-xl px-4 py-3 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#1067f2] focus:border-transparent transition-all"
                required
              >
                <option value="" disabled className="text-slate-400 dark:text-slate-500">
                  Seleccione un lote...
                </option>
                {lotes.map((lote) => (
                  <option key={lote.id_local} value={lote.id_local} className="bg-surface text-slate-800 dark:text-slate-100">
                    {lote.codigo_lote} ({lote.galpon})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-title font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Fecha *
                </label>
                <input
                  type="date"
                  value={form.fecha}
                  onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                  className="w-full bg-surface-2 border border-theme rounded-xl px-4 py-3 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#1067f2] focus:border-transparent transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-title font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Semana de Vida *
                </label>
                <input
                  type="number"
                  value={form.semana_ave}
                  onChange={(e) => setForm({ ...form, semana_ave: Number(e.target.value) })}
                  className="w-full bg-surface-2 border border-theme rounded-xl px-4 py-3 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#1067f2] focus:border-transparent transition-all"
                  min="1"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-title font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                Sexo del Ave *
              </label>
              <select
                value={form.sexo}
                onChange={(e) => setForm({ ...form, sexo: e.target.value as 'H' | 'M' })}
                className="w-full bg-surface-2 border border-theme rounded-xl px-4 py-3 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#1067f2] focus:border-transparent transition-all"
                required
              >
                <option value="H" className="bg-surface text-slate-800 dark:text-slate-100">Hembra (H)</option>
                <option value="M" className="bg-surface text-slate-800 dark:text-slate-100">Macho (M)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-title font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Mortalidad (Aves) *
                </label>
                <input
                  type="number"
                  value={form.mortalidad}
                  onChange={(e) => setForm({ ...form, mortalidad: Number(e.target.value) })}
                  className="w-full bg-surface-2 border border-theme rounded-xl px-4 py-3 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#1067f2] focus:border-transparent transition-all"
                  min="0"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-title font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Consumo Alimento (Kg) *
                </label>
                <input
                  type="number"
                  value={form.consumo_alimento_kg}
                  onChange={(e) => setForm({ ...form, consumo_alimento_kg: Number(e.target.value) })}
                  className="w-full bg-surface-2 border border-theme rounded-xl px-4 py-3 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#1067f2] focus:border-transparent transition-all"
                  min="0"
                  step="0.01"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 mt-4 bg-[#1067f2] hover:bg-[#0c328f] text-white font-title font-bold rounded-xl transition-all shadow-md shadow-blue-500/20 disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Registrando...' : 'Registrar Día'}
            </button>
          </form>
        </div>

        {/* Historial */}
        <div className="bg-surface border border-theme rounded-2xl p-6 shadow-xl flex flex-col">
          <h3 className="text-xl font-title font-extrabold text-slate-800 dark:text-slate-100 mb-6">
            Historial de Cría y Levante
          </h3>
          <div className="overflow-x-auto flex-1 rounded-xl border border-theme max-h-[460px] overflow-y-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-surface-2 border-b border-theme">
                  <th className="p-4 font-title font-bold text-slate-600 dark:text-slate-300">Fecha</th>
                  <th className="p-4 font-title font-bold text-slate-600 dark:text-slate-300">Lote / Sem</th>
                  <th className="p-4 font-title font-bold text-slate-600 dark:text-slate-300">Sexo</th>
                  <th className="p-4 font-title font-bold text-slate-600 dark:text-slate-300">Mort.</th>
                  <th className="p-4 font-title font-bold text-slate-600 dark:text-slate-300">Consumo</th>
                  <th className="p-4 font-title font-bold text-slate-600 dark:text-slate-300">Sync</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme">
                {registros.map((reg) => (
                  <tr key={reg.id_local} className="hover:bg-surface-2/40 transition-colors">
                    <td className="p-4 text-slate-700 dark:text-slate-300">{reg.fecha}</td>
                    <td className="p-4">
                      <div className="font-title font-bold text-slate-800 dark:text-slate-200">{reg.codigo_lote}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">Semana {reg.semana_ave}</div>
                    </td>
                    <td className="p-4">
                      <span
                        className={`font-title font-bold ${
                          reg.sexo === 'H' ? 'text-pink-600 dark:text-pink-400' : 'text-[#1067f2] dark:text-[#a0c1df]'
                        }`}
                      >
                        {reg.sexo}
                      </span>
                    </td>
                    <td className="p-4 text-slate-700 dark:text-slate-300">{reg.mortalidad}</td>
                    <td className="p-4 text-slate-700 dark:text-slate-300">{reg.consumo_alimento_kg} kg</td>
                    <td className="p-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-title font-bold border ${
                          reg.estado_sync === 'sincronizado'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                            : reg.estado_sync === 'pendiente'
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                            : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                        }`}
                      >
                        {reg.estado_sync}
                      </span>
                    </td>
                  </tr>
                ))}
                {registros.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500 dark:text-slate-400">
                      No hay registros guardados localmente.
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
