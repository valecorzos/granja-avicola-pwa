'use client';

import React, { useState, useEffect } from 'react';
import { dbLocal, type RecepcionProdLocal } from '@/lib/db-local';
import { sincronizarDatos } from '@/lib/sync';

interface FormState {
  fecha: string;
  galpon: string;
  codigo_lote: string;
  cant_hembras: number;
  machos_produccion: number;
  machos_reemplazo: number;
}

const FORM_DEFAULT: FormState = {
  fecha: new Date().toISOString().split('T')[0],
  galpon: '',
  codigo_lote: '',
  cant_hembras: 0,
  machos_produccion: 0,
  machos_reemplazo: 0,
};

const inputCls =
  'w-full bg-surface-2 border border-theme rounded-xl px-4 py-3 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#1067f2] focus:border-transparent transition-all';
const labelCls =
  'block text-xs font-title font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2';

function SyncBadge({ estado }: { estado: string }) {
  const styles =
    estado === 'sincronizado'
      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
      : estado === 'pendiente'
      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
      : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-title font-bold border ${styles}`}>
      {estado}
    </span>
  );
}

export default function RecepcionProdPage() {
  const [lotes, setLotes] = useState<RecepcionProdLocal[]>([]);
  const [form, setForm] = useState<FormState>(FORM_DEFAULT);
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });

  const cargarLotes = async () => {
    if (!dbLocal) return;
    try {
      const list = await dbLocal.recepcion_prod.toArray();
      setLotes(list.sort((a, b) => new Date(b.creado_en).getTime() - new Date(a.creado_en).getTime()));
    } catch (err) {
      console.error('Error al cargar lotes de producción:', err);
    }
  };

  const mostrarMensaje = (texto: string, tipo: string) => {
    setMensaje({ texto, tipo });
    setTimeout(() => setMensaje({ texto: '', tipo: '' }), 4000);
  };

  const guardarLote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dbLocal) return;
    setLoading(true);
    try {
      const ahora = new Date().toISOString();
      await dbLocal.recepcion_prod.add({
        id_local: crypto.randomUUID(),
        id: null,
        fecha: form.fecha,
        galpon: form.galpon,
        codigo_lote: form.codigo_lote,
        cant_hembras: Number(form.cant_hembras) || 0,
        machos_produccion: Number(form.machos_produccion) || 0,
        machos_reemplazo: Number(form.machos_reemplazo) || 0,
        estado_sync: 'pendiente',
        creado_en: ahora,
        actualizado_en: ahora,
      });
      setForm(FORM_DEFAULT);
      mostrarMensaje('Lote de producción registrado.', 'success');
      await cargarLotes();
      if (navigator.onLine) sincronizarDatos();
    } catch (err: any) {
      const msg =
        err?.message?.includes('unique') || err?.message?.includes('Key already exists')
          ? 'Ya existe un lote con ese código.'
          : 'Error al guardar el lote.';
      mostrarMensaje(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargarLotes(); }, []);

  const totalMachos = (Number(form.machos_produccion) || 0) + (Number(form.machos_reemplazo) || 0);
  const totalAves = (Number(form.cant_hembras) || 0) + totalMachos;

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
        {/* ── Formulario ── */}
        <div className="bg-surface border border-theme rounded-2xl p-6 shadow-xl">
          <h3 className="text-xl font-title font-extrabold text-slate-800 dark:text-slate-100 mb-1">
            Recepción de Producción
          </h3>
          <p className="text-xs text-muted mb-6">Registro de llegada de un lote al galpón de postura.</p>

          <form onSubmit={guardarLote} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Fecha de Llegada *</label>
                <input
                  type="date"
                  value={form.fecha}
                  onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                  className={inputCls}
                  required
                />
              </div>
              <div>
                <label className={labelCls}>Galpón *</label>
                <input
                  type="text"
                  value={form.galpon}
                  onChange={(e) => setForm({ ...form, galpon: e.target.value })}
                  className={inputCls}
                  placeholder="Ej. 2B"
                  required
                />
              </div>
            </div>

            <div>
              <label className={labelCls}>Código del Lote *</label>
              <input
                type="text"
                value={form.codigo_lote}
                onChange={(e) => setForm({ ...form, codigo_lote: e.target.value })}
                className={inputCls}
                placeholder="Ej. PROD-2026-A"
                required
              />
            </div>

            <div>
              <label className={labelCls}>Hembras Alojadas *</label>
              <input
                type="number"
                value={form.cant_hembras}
                onChange={(e) => setForm({ ...form, cant_hembras: Number(e.target.value) })}
                className={inputCls}
                min="0"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Machos Producción *</label>
                <input
                  type="number"
                  value={form.machos_produccion}
                  onChange={(e) => setForm({ ...form, machos_produccion: Number(e.target.value) })}
                  className={inputCls}
                  min="0"
                  required
                />
              </div>
              <div>
                <label className={labelCls}>Machos Reemplazo *</label>
                <input
                  type="number"
                  value={form.machos_reemplazo}
                  onChange={(e) => setForm({ ...form, machos_reemplazo: Number(e.target.value) })}
                  className={inputCls}
                  min="0"
                  required
                />
              </div>
            </div>

            {/* Cálculos en tiempo real */}
            {totalAves > 0 && (
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col items-center px-3 py-2 rounded-xl border border-pink-200 dark:border-pink-800 bg-pink-50/40 dark:bg-pink-950/10 text-center">
                  <span className="text-[10px] font-title font-bold uppercase tracking-wider text-pink-500/70">Hembras</span>
                  <span className="text-base font-title font-extrabold text-pink-600 dark:text-pink-400">{(Number(form.cant_hembras) || 0).toLocaleString()}</span>
                </div>
                <div className="flex flex-col items-center px-3 py-2 rounded-xl border border-[#1067f2]/30 bg-blue-50/40 dark:bg-blue-950/10 text-center">
                  <span className="text-[10px] font-title font-bold uppercase tracking-wider text-[#1067f2]/70">Machos</span>
                  <span className="text-base font-title font-extrabold text-[#1067f2]">{totalMachos.toLocaleString()}</span>
                </div>
                <div className="flex flex-col items-center px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/20 text-center">
                  <span className="text-[10px] font-title font-bold uppercase tracking-wider text-slate-400">Total</span>
                  <span className="text-base font-title font-extrabold text-[#1067f2]">{totalAves.toLocaleString()}</span>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 mt-2 bg-[#1067f2] hover:bg-[#0c328f] text-white font-title font-bold rounded-xl transition-all shadow-md shadow-blue-500/20 disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Guardando...' : 'Registrar Lote de Producción'}
            </button>
          </form>
        </div>

        {/* ── Tabla ── */}
        <div className="bg-surface border border-theme rounded-2xl p-6 shadow-xl flex flex-col">
          <h3 className="text-xl font-title font-extrabold text-slate-800 dark:text-slate-100 mb-1">
            Lotes de Producción
          </h3>
          <p className="text-xs text-muted mb-6">{lotes.length} lotes registrados en el dispositivo.</p>

          <div className="overflow-x-auto flex-1 rounded-xl border border-theme max-h-[460px] overflow-y-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-surface-2 border-b border-theme">
                  <th className="p-4 font-title font-bold text-slate-600 dark:text-slate-300">Lote / Galpón</th>
                  <th className="p-4 font-title font-bold text-slate-600 dark:text-slate-300">Fecha</th>
                  <th className="p-4 font-title font-bold text-slate-600 dark:text-slate-300">H / Prod / Reem</th>
                  <th className="p-4 font-title font-bold text-slate-600 dark:text-slate-300">Sync</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme">
                {lotes.map((lote) => (
                  <tr key={lote.id_local} className="hover:bg-surface-2/40 transition-colors">
                    <td className="p-4">
                      <div className="font-title font-bold text-slate-800 dark:text-slate-200">{lote.codigo_lote}</div>
                      <div className="text-xs text-muted">Galpón {lote.galpon}</div>
                    </td>
                    <td className="p-4 text-slate-700 dark:text-slate-300 text-xs">{lote.fecha}</td>
                    <td className="p-4 text-xs">
                      <span className="text-pink-600 dark:text-pink-400 font-bold">{lote.cant_hembras}</span>
                      <span className="text-slate-400 mx-1">/</span>
                      <span className="text-[#1067f2] font-bold">{lote.machos_produccion}</span>
                      <span className="text-slate-400 mx-1">/</span>
                      <span className="text-indigo-500 font-bold">{lote.machos_reemplazo}</span>
                    </td>
                    <td className="p-4">
                      <SyncBadge estado={lote.estado_sync} />
                    </td>
                  </tr>
                ))}
                {lotes.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-500 dark:text-slate-400">
                      No hay lotes registrados.
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
