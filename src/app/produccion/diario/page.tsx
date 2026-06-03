'use client';

import React, { useState, useEffect } from 'react';
import { liveQuery } from 'dexie';
import {
  dbLocal,
  type RecepcionProdLocal,
  type DiarioAvesProdLocal,
  type DiarioHuevosLocal,
} from '@/lib/db-local';
import { sincronizarDatos } from '@/lib/sync';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface SexoFields {
  mortalidad: number;
  descarte: number;
  alimento: number;
  lote_origen_reemplazo: string;
}

interface FormState {
  lote_id_local: string;
  fecha: string;
  hembras: SexoFields;
  machos: SexoFields;
  huevos_recolectados: number;
  comerciales: number;
  descartados: number;
}

interface ModalPeso {
  isOpen: boolean;
  targetSexo: 'H' | 'M';
  pesos: number[];
  inputValue: string;
}

type RegistroEnriquecido = DiarioAvesProdLocal & { codigo_lote: string };

// ─── Defaults ────────────────────────────────────────────────────────────────

const SEXO_DEFAULT: SexoFields = {
  mortalidad: 0,
  descarte: 0,
  alimento: 0,
  lote_origen_reemplazo: '',
};

const FORM_DEFAULT: FormState = {
  lote_id_local: '',
  fecha: new Date().toISOString().split('T')[0],
  hembras: { ...SEXO_DEFAULT },
  machos: { ...SEXO_DEFAULT },
  huevos_recolectados: 0,
  comerciales: 0,
  descartados: 0,
};

// ─── Estilos ──────────────────────────────────────────────────────────────────

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

// ─── Sección por Sexo ─────────────────────────────────────────────────────────

interface SexoSectionProps {
  sexo: 'H' | 'M';
  fields: SexoFields;
  onChange: (patch: Partial<SexoFields>) => void;
}

function SexoSection({ sexo, fields, onChange }: SexoSectionProps) {
  const esFemenino = sexo === 'H';
  const accentCls = esFemenino ? 'text-pink-600 dark:text-pink-400' : 'text-[#1067f2] dark:text-[#a0c1df]';
  const borderAcc = esFemenino ? 'border-pink-300 dark:border-pink-800' : 'border-[#1067f2]/30';
  const bgAcc = esFemenino ? 'bg-pink-50/40 dark:bg-pink-950/10' : 'bg-blue-50/40 dark:bg-blue-950/10';
  const bajas = fields.mortalidad + fields.descarte;

  return (
    <div className={`rounded-xl border ${borderAcc} ${bgAcc} p-4 space-y-4`}>
      <div className="flex items-center justify-between">
        <span className={`font-title font-extrabold text-sm uppercase tracking-wider ${accentCls}`}>
          {esFemenino ? 'Hembras (H)' : 'Machos (M)'}
        </span>
        {bajas > 0 && (
          <span className="text-xs font-title font-bold text-rose-500 bg-rose-500/10 border border-rose-500/20 px-2 py-1 rounded-lg">
            Bajas: {bajas}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Mortalidad (aves)</label>
          <input
            type="number"
            value={fields.mortalidad}
            onChange={(e) => onChange({ mortalidad: Number(e.target.value) })}
            className={inputCls}
            min="0"
          />
        </div>
        <div>
          <label className={labelCls}>Descarte (aves)</label>
          <input
            type="number"
            value={fields.descarte}
            onChange={(e) => onChange({ descarte: Number(e.target.value) })}
            className={inputCls}
            min="0"
          />
        </div>
      </div>

      <div>
        <label className={labelCls}>Alimento (kg)</label>
        <input
          type="number"
          value={fields.alimento}
          onChange={(e) => onChange({ alimento: Number(e.target.value) })}
          className={inputCls}
          min="0"
          step="0.01"
        />
      </div>

      {/* Lote origen reemplazo — solo machos */}
      {sexo === 'M' && (
        <div>
          <label className={labelCls}>Lote Origen Reemplazo</label>
          <input
            type="text"
            value={fields.lote_origen_reemplazo}
            onChange={(e) => onChange({ lote_origen_reemplazo: e.target.value })}
            className={inputCls}
            placeholder="Código del lote de cría (opcional)"
          />
        </div>
      )}
    </div>
  );
}

// ─── Página Principal ─────────────────────────────────────────────────────────

export default function DiarioProdPage() {
  const [lotes, setLotes] = useState<RecepcionProdLocal[]>([]);
  const [registros, setRegistros] = useState<RegistroEnriquecido[]>([]);
  const [form, setForm] = useState<FormState>(FORM_DEFAULT);
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });

  // Suscripción en vivo. Los lotes son persistentes (descargados de la base);
  // los registros de aves son un caché de solo-pendientes que se vacía al
  // sincronizar → el historial queda en blanco sin necesidad de recargar.
  useEffect(() => {
    if (!dbLocal) return;
    const sub = liveQuery(async () => {
      const [listLotes, listRegs] = await Promise.all([
        dbLocal!.recepcion_prod.toArray(),
        dbLocal!.diario_aves_prod.toArray(),
      ]);
      return { listLotes, listRegs };
    }).subscribe({
      next: ({ listLotes, listRegs }) => {
        setLotes(listLotes);
        const enriched = listRegs.map((r) => ({
          ...r,
          codigo_lote:
            listLotes.find((l) => l.id_local === r.lote_id_local)?.codigo_lote ?? 'Desconocido',
        }));
        setRegistros(
          enriched.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
        );
      },
      error: (err) => console.error('liveQuery datos de producción:', err),
    });
    return () => sub.unsubscribe();
  }, []);

  // Al entrar, descargar los lotes que crearon otros usuarios.
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.onLine) sincronizarDatos();
  }, []);

  const mostrarMensaje = (texto: string, tipo: string) => {
    setMensaje({ texto, tipo });
    setTimeout(() => setMensaje({ texto: '', tipo: '' }), 4000);
  };

  // Derivados
  const loteSel = lotes.find((l) => l.id_local === form.lote_id_local);
  const bajasTotales =
    form.hembras.mortalidad + form.hembras.descarte + form.machos.mortalidad + form.machos.descarte;
  const huevosIncubables =
    form.huevos_recolectados - form.comerciales - form.descartados;

  const patchHembras = (patch: Partial<SexoFields>) =>
    setForm((f) => ({ ...f, hembras: { ...f.hembras, ...patch } }));
  const patchMachos = (patch: Partial<SexoFields>) =>
    setForm((f) => ({ ...f, machos: { ...f.machos, ...patch } }));

  const guardarRegistro = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!dbLocal || !form.lote_id_local) {
      mostrarMensaje('Selecciona un lote antes de guardar.', 'error');
      return;
    }
    setLoading(true);
    try {
      const ahora = new Date().toISOString();
      const loteId = loteSel?.id ?? null;

      const baseAves = {
        id: null as null,
        lote_id_local: form.lote_id_local,
        lote_id: loteId,
        fecha: form.fecha,
        estado_sync: 'pendiente' as const,
        creado_en: ahora,
        actualizado_en: ahora,
      };

      const regHembra: DiarioAvesProdLocal = {
        ...baseAves,
        id_local: crypto.randomUUID(),
        sexo: 'H',
        mortalidad: form.hembras.mortalidad,
        descarte: form.hembras.descarte,
        alimento: form.hembras.alimento,
        lote_origen_reemplazo: null,
      };

      const regMacho: DiarioAvesProdLocal = {
        ...baseAves,
        id_local: crypto.randomUUID(),
        sexo: 'M',
        mortalidad: form.machos.mortalidad,
        descarte: form.machos.descarte,
        alimento: form.machos.alimento,
        lote_origen_reemplazo: form.machos.lote_origen_reemplazo || null,
      };

      const regHuevos: DiarioHuevosLocal = {
        id_local: crypto.randomUUID(),
        id: null,
        lote_id_local: form.lote_id_local,
        lote_id: loteId,
        fecha: form.fecha,
        huevos_recolectados: form.huevos_recolectados,
        comerciales: form.comerciales,
        descartados: form.descartados,
        estado_sync: 'pendiente',
        creado_en: ahora,
        actualizado_en: ahora,
      };

      await Promise.all([
        dbLocal.diario_aves_prod.add(regHembra),
        dbLocal.diario_aves_prod.add(regMacho),
        dbLocal.diario_huevos.add(regHuevos),
      ]);

      setForm((f) => ({
        ...f,
        hembras: { ...SEXO_DEFAULT },
        machos: { ...SEXO_DEFAULT },
        huevos_recolectados: 0,
        comerciales: 0,
        descartados: 0,
      }));

      mostrarMensaje('Registro diario guardado (H + M + Huevos).', 'success');
      if (navigator.onLine) sincronizarDatos();
    } catch (err) {
      console.error('Error al guardar:', err);
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
            Registro Diario de Producción
          </h3>
          <p className="text-xs text-muted mb-6">
            Un registro crea 2 filas de aves (H + M) y 1 de huevos por fecha.
          </p>

          <form onSubmit={guardarRegistro} className="space-y-5">
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

            {/* Resumen del lote */}
            {loteSel && (
              <div className="grid grid-cols-3 gap-3">
                <StatChip label="Hembras" value={loteSel.cant_hembras} color="pink" />
                <StatChip label="M. Prod." value={loteSel.machos_produccion} color="blue" />
                <StatChip label="M. Reem." value={loteSel.machos_reemplazo} color="indigo" />
              </div>
            )}

            {bajasTotales > 0 && (
              <div className="flex items-center justify-between rounded-xl border border-rose-200 dark:border-rose-900/40 bg-rose-50/40 dark:bg-rose-950/10 px-4 py-3">
                <span className="text-xs font-title font-bold text-rose-500 uppercase tracking-wider">Bajas del día (H + M)</span>
                <span className="text-lg font-title font-extrabold text-rose-500">{bajasTotales}</span>
              </div>
            )}

            {/* Secciones aves */}
            <SexoSection sexo="H" fields={form.hembras} onChange={patchHembras} />
            <SexoSection sexo="M" fields={form.machos} onChange={patchMachos} />

            {/* ── Sección Huevos ── */}
            <div className="rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50/40 dark:bg-amber-950/10 p-4 space-y-4">
              <span className="font-title font-extrabold text-sm uppercase tracking-wider text-amber-600 dark:text-amber-400">
                Recolección de Huevos
              </span>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={labelCls}>Recolectados</label>
                  <input
                    type="number"
                    value={form.huevos_recolectados}
                    onChange={(e) => setForm({ ...form, huevos_recolectados: Number(e.target.value) })}
                    className={inputCls}
                    min="0"
                  />
                </div>
                <div>
                  <label className={labelCls}>Comerciales</label>
                  <input
                    type="number"
                    value={form.comerciales}
                    onChange={(e) => setForm({ ...form, comerciales: Number(e.target.value) })}
                    className={inputCls}
                    min="0"
                  />
                </div>
                <div>
                  <label className={labelCls}>Descartados</label>
                  <input
                    type="number"
                    value={form.descartados}
                    onChange={(e) => setForm({ ...form, descartados: Number(e.target.value) })}
                    className={inputCls}
                    min="0"
                  />
                </div>
              </div>

              {/* Huevos incubables derivado */}
              {form.huevos_recolectados > 0 && (
                <div className="flex items-center justify-between rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-100/40 dark:bg-amber-950/20 px-4 py-3">
                  <span className="text-xs font-title font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                    Huevos Incubables
                  </span>
                  <span className={`text-lg font-title font-extrabold ${huevosIncubables >= 0 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-500'}`}>
                    {huevosIncubables}
                  </span>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#1067f2] hover:bg-[#0c328f] text-white font-title font-bold rounded-xl transition-all shadow-md shadow-blue-500/20 disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Guardando...' : 'Registrar Día (H + M + Huevos)'}
            </button>
          </form>
        </div>

        {/* ── Historial ── */}
        <div className="bg-surface border border-theme rounded-2xl p-6 shadow-xl flex flex-col">
          <h3 className="text-xl font-title font-extrabold text-slate-800 dark:text-slate-100 mb-1">
            Historial de Aves
          </h3>
          <p className="text-xs text-muted mb-6">{registros.length} registros en el dispositivo.</p>

          <div className="overflow-x-auto flex-1 rounded-xl border border-theme max-h-[520px] overflow-y-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-surface-2 border-b border-theme sticky top-0">
                  <th className="p-3 font-title font-bold text-slate-600 dark:text-slate-300 text-xs">Fecha</th>
                  <th className="p-3 font-title font-bold text-slate-600 dark:text-slate-300 text-xs">Lote</th>
                  <th className="p-3 font-title font-bold text-slate-600 dark:text-slate-300 text-xs">Sexo</th>
                  <th className="p-3 font-title font-bold text-slate-600 dark:text-slate-300 text-xs">Mort.</th>
                  <th className="p-3 font-title font-bold text-slate-600 dark:text-slate-300 text-xs">Desc.</th>
                  <th className="p-3 font-title font-bold text-slate-600 dark:text-slate-300 text-xs">Alim.</th>
                  <th className="p-3 font-title font-bold text-slate-600 dark:text-slate-300 text-xs">Sync</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme">
                {registros.map((reg) => (
                  <tr key={reg.id_local} className="hover:bg-surface-2/40 transition-colors">
                    <td className="p-3 text-slate-600 dark:text-slate-400 text-xs">{reg.fecha}</td>
                    <td className="p-3 font-title font-bold text-slate-800 dark:text-slate-200 text-xs">{reg.codigo_lote}</td>
                    <td className="p-3">
                      <span className={`font-title font-extrabold text-sm ${reg.sexo === 'H' ? 'text-pink-600 dark:text-pink-400' : 'text-[#1067f2] dark:text-[#a0c1df]'}`}>
                        {reg.sexo}
                      </span>
                    </td>
                    <td className="p-3 text-slate-700 dark:text-slate-300 text-xs">{reg.mortalidad}</td>
                    <td className="p-3 text-slate-700 dark:text-slate-300 text-xs">{reg.descarte}</td>
                    <td className="p-3 text-slate-700 dark:text-slate-300 text-xs">{reg.alimento} kg</td>
                    <td className="p-3">
                      <SyncBadge estado={reg.estado_sync} />
                    </td>
                  </tr>
                ))}
                {registros.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500 dark:text-slate-400">
                      No hay registros guardados.
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

// ─── Chip ─────────────────────────────────────────────────────────────────────

function StatChip({ label, value, color }: { label: string; value: number; color: 'pink' | 'blue' | 'indigo' }) {
  const colors = {
    pink: 'bg-pink-50 dark:bg-pink-950/20 text-pink-600 dark:text-pink-400 border-pink-200 dark:border-pink-800',
    blue: 'bg-blue-50 dark:bg-blue-950/20 text-[#1067f2] dark:text-[#a0c1df] border-blue-200 dark:border-blue-800',
    indigo: 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800',
  };
  return (
    <div className={`flex flex-col items-center px-4 py-2 rounded-xl border text-center ${colors[color]}`}>
      <span className="text-[10px] font-title font-bold uppercase tracking-wider opacity-70">{label}</span>
      <span className="text-base font-title font-extrabold">{value.toLocaleString()}</span>
    </div>
  );
}
