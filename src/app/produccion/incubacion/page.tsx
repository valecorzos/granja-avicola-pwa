'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { dbLocal, type RecepcionProdLocal, type SalidasIncubacionLocal } from '@/lib/db-local';
import { sincronizarDatos } from '@/lib/sync';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface FormState {
  lote_id_local: string;
  fecha: string;
  clasificacion: string;
  cant_cestas: number;
  cant_separadores: number;
  unidades_sueltas: number;
  huevos_por_cesta: number;
  huevos_por_separador: number;
}

type SalidaEnriquecida = SalidasIncubacionLocal & { codigo_lote: string };

const FORM_DEFAULT: FormState = {
  lote_id_local: '',
  fecha: new Date().toISOString().split('T')[0],
  clasificacion: '',
  cant_cestas: 0,
  cant_separadores: 0,
  unidades_sueltas: 0,
  huevos_por_cesta: 360,
  huevos_por_separador: 30,
};

const inputCls =
  'w-full bg-surface-2 border border-theme rounded-xl px-4 py-3 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#1067f2] focus:border-transparent transition-all';
const labelCls =
  'block text-xs font-title font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2';

function SyncBadge({ estado }: { estado: string }) {
  const cls =
    estado === 'sincronizado'
      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
      : estado === 'pendiente'
      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
      : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-title font-bold border ${cls}`}>
      {estado}
    </span>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function SalidasIncubacionPage() {
  const [lotes, setLotes] = useState<RecepcionProdLocal[]>([]);
  const [salidas, setSalidas] = useState<SalidaEnriquecida[]>([]);
  const [form, setForm] = useState<FormState>(FORM_DEFAULT);
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });

  const cargarDatos = useCallback(async () => {
    if (!dbLocal) return;
    try {
      const [listLotes, listSalidas] = await Promise.all([
        dbLocal.recepcion_prod.toArray(),
        dbLocal.salidas_incubacion.toArray(),
      ]);
      setLotes(listLotes);
      const enriched = listSalidas.map((s) => ({
        ...s,
        codigo_lote:
          listLotes.find((l) => l.id_local === s.lote_id_local)?.codigo_lote ?? 'Desconocido',
      }));
      setSalidas(enriched.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()));
    } catch (err) {
      console.error('Error al cargar salidas de incubación:', err);
    }
  }, []);

  useEffect(() => { cargarDatos(); }, [cargarDatos]);

  const mostrarMensaje = (texto: string, tipo: string) => {
    setMensaje({ texto, tipo });
    setTimeout(() => setMensaje({ texto: '', tipo: '' }), 4000);
  };

  // Total en tiempo real
  const totalHuevos =
    form.cant_cestas * form.huevos_por_cesta +
    form.cant_separadores * form.huevos_por_separador +
    form.unidades_sueltas;

  const guardarSalida = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!dbLocal || !form.lote_id_local) {
      mostrarMensaje('Selecciona un lote antes de guardar.', 'error');
      return;
    }
    setLoading(true);
    try {
      const ahora = new Date().toISOString();
      const loteSel = lotes.find((l) => l.id_local === form.lote_id_local);

      await dbLocal.salidas_incubacion.add({
        id_local: crypto.randomUUID(),
        id: null,
        lote_id_local: form.lote_id_local,
        lote_id: loteSel?.id ?? null,
        fecha: form.fecha,
        clasificacion: form.clasificacion,
        cant_cestas: form.cant_cestas,
        cant_separadores: form.cant_separadores,
        unidades_sueltas: form.unidades_sueltas,
        estado_sync: 'pendiente',
        creado_en: ahora,
        actualizado_en: ahora,
      });

      setForm((f) => ({
        ...FORM_DEFAULT,
        lote_id_local: f.lote_id_local,
        fecha: f.fecha,
        huevos_por_cesta: f.huevos_por_cesta,
        huevos_por_separador: f.huevos_por_separador,
      }));

      mostrarMensaje('Salida de incubación registrada.', 'success');
      await cargarDatos();
      if (navigator.onLine) sincronizarDatos();
    } catch (err) {
      console.error('Error al guardar salida:', err);
      mostrarMensaje('Error al guardar el registro.', 'error');
    } finally {
      setLoading(false);
    }
  };

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
            Salida a Incubación
          </h3>
          <p className="text-xs text-muted mb-6">Registro de huevos enviados a la incubadora.</p>

          <form onSubmit={guardarSalida} className="space-y-5">
            {/* Lote y fecha */}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 sm:col-span-1">
                <label className={labelCls}>Lote de Producción *</label>
                <select
                  value={form.lote_id_local}
                  onChange={(e) => setForm({ ...form, lote_id_local: e.target.value })}
                  className={inputCls}
                  required
                >
                  <option value="" disabled>Seleccione un lote...</option>
                  {lotes.map((l) => (
                    <option key={l.id_local} value={l.id_local}>
                      {l.codigo_lote} — G{l.galpon}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Fecha *</label>
                <input
                  type="date"
                  value={form.fecha}
                  onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                  className={inputCls}
                  required
                />
              </div>
            </div>

            <div>
              <label className={labelCls}>Clasificación</label>
              <input
                type="text"
                value={form.clasificacion}
                onChange={(e) => setForm({ ...form, clasificacion: e.target.value })}
                className={inputCls}
                placeholder="Ej. Primera, Jumbo, Estándar..."
              />
            </div>

            {/* Valores por contenedor (editables) */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/20 p-4 space-y-3">
              <span className="text-xs font-title font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Valores por Contenedor
              </span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Huevos / Cesta</label>
                  <input
                    type="number"
                    value={form.huevos_por_cesta}
                    onChange={(e) => setForm({ ...form, huevos_por_cesta: Number(e.target.value) })}
                    className={inputCls}
                    min="1"
                  />
                </div>
                <div>
                  <label className={labelCls}>Huevos / Separador</label>
                  <input
                    type="number"
                    value={form.huevos_por_separador}
                    onChange={(e) => setForm({ ...form, huevos_por_separador: Number(e.target.value) })}
                    className={inputCls}
                    min="1"
                  />
                </div>
              </div>
            </div>

            {/* Cantidades */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>Cestas</label>
                <input
                  type="number"
                  value={form.cant_cestas}
                  onChange={(e) => setForm({ ...form, cant_cestas: Number(e.target.value) })}
                  className={inputCls}
                  min="0"
                />
              </div>
              <div>
                <label className={labelCls}>Separadores</label>
                <input
                  type="number"
                  value={form.cant_separadores}
                  onChange={(e) => setForm({ ...form, cant_separadores: Number(e.target.value) })}
                  className={inputCls}
                  min="0"
                />
              </div>
              <div>
                <label className={labelCls}>Unidades Sueltas</label>
                <input
                  type="number"
                  value={form.unidades_sueltas}
                  onChange={(e) => setForm({ ...form, unidades_sueltas: Number(e.target.value) })}
                  className={inputCls}
                  min="0"
                />
              </div>
            </div>

            {/* Total en tiempo real */}
            {totalHuevos > 0 && (
              <div className="rounded-xl border border-[#1067f2]/30 bg-blue-50/60 dark:bg-blue-950/20 p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-title font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Total a Enviar
                  </span>
                  <span className="text-2xl font-title font-extrabold text-[#1067f2]">
                    {totalHuevos.toLocaleString()} huevos
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="rounded-lg bg-white/60 dark:bg-slate-900/30 border border-theme px-2 py-2">
                    <div className="text-[10px] font-title font-bold text-muted uppercase">Cestas</div>
                    <div className="font-title font-extrabold text-slate-700 dark:text-slate-300">
                      {form.cant_cestas} × {form.huevos_por_cesta} = {form.cant_cestas * form.huevos_por_cesta}
                    </div>
                  </div>
                  <div className="rounded-lg bg-white/60 dark:bg-slate-900/30 border border-theme px-2 py-2">
                    <div className="text-[10px] font-title font-bold text-muted uppercase">Sep.</div>
                    <div className="font-title font-extrabold text-slate-700 dark:text-slate-300">
                      {form.cant_separadores} × {form.huevos_por_separador} = {form.cant_separadores * form.huevos_por_separador}
                    </div>
                  </div>
                  <div className="rounded-lg bg-white/60 dark:bg-slate-900/30 border border-theme px-2 py-2">
                    <div className="text-[10px] font-title font-bold text-muted uppercase">Sueltos</div>
                    <div className="font-title font-extrabold text-slate-700 dark:text-slate-300">
                      {form.unidades_sueltas}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#1067f2] hover:bg-[#0c328f] text-white font-title font-bold rounded-xl transition-all shadow-md shadow-blue-500/20 disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Guardando...' : 'Registrar Salida a Incubación'}
            </button>
          </form>
        </div>

        {/* ── Historial ── */}
        <div className="bg-surface border border-theme rounded-2xl p-6 shadow-xl flex flex-col">
          <h3 className="text-xl font-title font-extrabold text-slate-800 dark:text-slate-100 mb-1">
            Historial de Salidas
          </h3>
          <p className="text-xs text-muted mb-6">{salidas.length} registros en el dispositivo.</p>

          <div className="overflow-x-auto flex-1 rounded-xl border border-theme max-h-[520px] overflow-y-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-surface-2 border-b border-theme sticky top-0">
                  <th className="p-3 font-title font-bold text-slate-600 dark:text-slate-300 text-xs">Fecha</th>
                  <th className="p-3 font-title font-bold text-slate-600 dark:text-slate-300 text-xs">Lote</th>
                  <th className="p-3 font-title font-bold text-slate-600 dark:text-slate-300 text-xs">Clasif.</th>
                  <th className="p-3 font-title font-bold text-slate-600 dark:text-slate-300 text-xs">Cest.</th>
                  <th className="p-3 font-title font-bold text-slate-600 dark:text-slate-300 text-xs">Sep.</th>
                  <th className="p-3 font-title font-bold text-slate-600 dark:text-slate-300 text-xs">Sueltos</th>
                  <th className="p-3 font-title font-bold text-slate-600 dark:text-slate-300 text-xs">Sync</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme">
                {salidas.map((s) => (
                  <tr key={s.id_local} className="hover:bg-surface-2/40 transition-colors">
                    <td className="p-3 text-slate-600 dark:text-slate-400 text-xs">{s.fecha}</td>
                    <td className="p-3 font-title font-bold text-slate-800 dark:text-slate-200 text-xs">{s.codigo_lote}</td>
                    <td className="p-3 text-slate-700 dark:text-slate-300 text-xs">{s.clasificacion || '—'}</td>
                    <td className="p-3 text-slate-700 dark:text-slate-300 text-xs">{s.cant_cestas}</td>
                    <td className="p-3 text-slate-700 dark:text-slate-300 text-xs">{s.cant_separadores}</td>
                    <td className="p-3 text-slate-700 dark:text-slate-300 text-xs">{s.unidades_sueltas}</td>
                    <td className="p-3">
                      <SyncBadge estado={s.estado_sync} />
                    </td>
                  </tr>
                ))}
                {salidas.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500 dark:text-slate-400">
                      No hay salidas registradas.
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
