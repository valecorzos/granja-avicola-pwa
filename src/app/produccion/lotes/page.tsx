'use client';

import React, { useState, useEffect } from 'react';
import { dbLocal, type RecepcionProdLocal } from '@/lib/db-local';
import { sincronizarDatos } from '@/lib/sync';
import { MAESTRO_GRANJAS } from '@/lib/granjas-config';
import DatePickerVE from '@/components/DatePickerVE';
import { useAuth } from '@/context/AuthContext';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatVE(ymd: string): string {
  if (!ymd) return '';
  const [y, m, d] = ymd.split('-');
  return `${d}/${m}/${y}`;
}

function getInitials(email: string): string {
  const name = email.split('@')[0];
  const parts = name.split(/[._-]/);
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface FormState {
  fecha: string;
  granja: string;
  galpon: string;
  numero_lote: string;
  cant_hembras: string;
  machos_produccion: string;
  machos_reemplazo: string;
}

const FORM_DEFAULT: FormState = {
  fecha: new Date().toISOString().split('T')[0],
  granja: '',
  galpon: '',
  numero_lote: '',
  cant_hembras: '',
  machos_produccion: '',
  machos_reemplazo: '',
};

const inputCls =
  'w-full bg-surface-2 border border-theme rounded-xl px-4 py-3 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#1067f2] focus:border-transparent transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none';
const selectCls =
  'w-full bg-surface-2 border border-theme rounded-xl px-4 py-3 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#1067f2] focus:border-transparent transition-all';
const labelCls =
  'block text-xs font-title font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2';

function StatusDot({ estado }: { estado: 'sincronizado' | 'pendiente' | 'error' }) {
  const cls =
    estado === 'sincronizado'
      ? 'bg-emerald-500 shadow-[0_0_6px_#10b981]'
      : estado === 'pendiente'
      ? 'bg-amber-400 shadow-[0_0_6px_#f59e0b]'
      : 'bg-rose-500 shadow-[0_0_6px_#ef4444] animate-pulse';
  return <span className={`inline-block w-2.5 h-2.5 rounded-full flex-shrink-0 ${cls}`} title={estado} />;
}

function LoteCard({ lote }: { lote: RecepcionProdLocal }) {
  const initials = lote.usuario_email ? getInitials(lote.usuario_email) : '??';
  const total = lote.cant_hembras + lote.machos_produccion + lote.machos_reemplazo;

  return (
    <div className="relative bg-surface-2 border border-theme rounded-2xl p-4 hover:border-[#1067f2]/30 transition-all">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-title font-bold text-slate-500 dark:text-slate-400">
            {formatVE(lote.fecha)}
          </span>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-title font-extrabold bg-[#1067f2]/10 text-[#1067f2] dark:bg-[#1067f2]/20 dark:text-[#a0c1df] border border-[#1067f2]/20">
            Lote #{lote.codigo_lote}
          </span>
        </div>
        <StatusDot estado={lote.estado_sync} />
      </div>

      <div className="text-sm font-title font-bold text-slate-700 dark:text-slate-200 mb-2.5">
        {lote.granja || '—'}
        <span className="text-slate-400 mx-1.5">·</span>
        <span className="text-slate-500 dark:text-slate-400 font-semibold">{lote.galpon}</span>
      </div>

      <div className="flex items-center gap-3 flex-wrap text-sm">
        <span className="font-title font-extrabold text-pink-600 dark:text-pink-400">
          ♀ {lote.cant_hembras.toLocaleString()}
        </span>
        <span className="font-title font-extrabold text-[#1067f2] dark:text-[#a0c1df]">
          ♂P {lote.machos_produccion.toLocaleString()}
        </span>
        <span className="font-title font-extrabold text-indigo-500 dark:text-indigo-400">
          ♂R {lote.machos_reemplazo.toLocaleString()}
        </span>
        <div className="ml-auto flex items-center gap-1">
          <span className="text-[10px] font-title font-bold uppercase tracking-wider text-slate-400">Total</span>
          <span className="font-title font-extrabold text-slate-700 dark:text-slate-300">{total.toLocaleString()}</span>
        </div>
      </div>

      <div
        className="absolute bottom-3 right-3 w-7 h-7 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 text-white flex items-center justify-center text-[10px] font-title font-extrabold shadow-sm"
        title={lote.usuario_email}
      >
        {initials}
      </div>
    </div>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function RecepcionProdPage() {
  const { user } = useAuth();
  const [lotes, setLotes] = useState<RecepcionProdLocal[]>([]);
  const [form, setForm] = useState<FormState>(FORM_DEFAULT);
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });

  const granjaSeleccionada = MAESTRO_GRANJAS.find((g) => g.id === form.granja);
  const galpones = granjaSeleccionada?.galpones ?? [];

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
    if (!form.granja || !form.galpon) {
      mostrarMensaje('Selecciona granja y galpón.', 'error');
      return;
    }
    const numLote = parseInt(form.numero_lote, 10);
    if (isNaN(numLote) || numLote <= 0) {
      mostrarMensaje('El número de lote debe ser un entero positivo.', 'error');
      return;
    }

    setLoading(true);
    try {
      const ahora = new Date().toISOString();
      await dbLocal.recepcion_prod.add({
        id_local: crypto.randomUUID(),
        id: null,
        fecha: form.fecha,
        granja: granjaSeleccionada?.nombre ?? '',
        galpon: galpones.find((g) => g.id === form.galpon)?.nombre ?? form.galpon,
        codigo_lote: String(numLote),
        cant_hembras: Number(form.cant_hembras) || 0,
        machos_produccion: Number(form.machos_produccion) || 0,
        machos_reemplazo: Number(form.machos_reemplazo) || 0,
        usuario_email: user?.email ?? '',
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
          ? 'Ya existe un lote con ese número.'
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
    <div className="flex flex-col gap-4 lg:h-[calc(100dvh-5rem)]">
      {mensaje.texto && (
        <div
          className={`flex-shrink-0 p-4 rounded-xl text-sm font-semibold border ${
            mensaje.tipo === 'success'
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
          }`}
        >
          {mensaje.texto}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0 items-stretch">

        {/* ── Formulario ── */}
        <div className="bg-surface border border-theme rounded-2xl p-6 shadow-xl flex flex-col">
          <h3 className="text-xl font-title font-extrabold text-slate-800 dark:text-slate-100 mb-1 flex-shrink-0">
            Recepción de Producción
          </h3>
          <p className="text-xs text-muted mb-6 flex-shrink-0">
            Registro de llegada de un lote al galpón de postura.
          </p>

          <form onSubmit={guardarLote} className="flex flex-col gap-4 flex-1 overflow-y-auto pr-1">

            <div>
              <label className={labelCls}>Fecha de Llegada *</label>
              <DatePickerVE
                value={form.fecha}
                onChange={(v) => setForm({ ...form, fecha: v })}
                required
              />
            </div>

            <div>
              <label className={labelCls}>Granja *</label>
              <select
                value={form.granja}
                onChange={(e) => setForm({ ...form, granja: e.target.value, galpon: '' })}
                className={selectCls}
                required
              >
                <option value="" disabled>Seleccione una granja...</option>
                {MAESTRO_GRANJAS.map((g) => (
                  <option key={g.id} value={g.id}>{g.nombre}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelCls}>Galpón *</label>
              <select
                value={form.galpon}
                onChange={(e) => setForm({ ...form, galpon: e.target.value })}
                className={selectCls}
                required
                disabled={!form.granja}
              >
                <option value="" disabled>
                  {form.granja ? 'Seleccione un galpón...' : 'Primero seleccione una granja'}
                </option>
                {galpones.map((g) => (
                  <option key={g.id} value={g.id}>{g.nombre}</option>
                ))}
              </select>
            </div>

            <div className="w-40">
              <label className={labelCls}>N° de Lote *</label>
              <input
                type="number"
                value={form.numero_lote}
                onChange={(e) => setForm({ ...form, numero_lote: e.target.value })}
                className={inputCls}
                placeholder="Ej. 12"
                min="1"
                step="1"
                required
              />
            </div>

            <div>
              <label className={labelCls}>Hembras Alojadas *</label>
              <input
                type="number"
                value={form.cant_hembras}
                onChange={(e) => setForm({ ...form, cant_hembras: e.target.value })}
                className={inputCls}
                placeholder="0"
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
                  onChange={(e) => setForm({ ...form, machos_produccion: e.target.value })}
                  className={inputCls}
                  placeholder="0"
                  min="0"
                  required
                />
              </div>
              <div>
                <label className={labelCls}>Machos Reemplazo *</label>
                <input
                  type="number"
                  value={form.machos_reemplazo}
                  onChange={(e) => setForm({ ...form, machos_reemplazo: e.target.value })}
                  className={inputCls}
                  placeholder="0"
                  min="0"
                  required
                />
              </div>
            </div>

            {totalAves > 0 && (
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col items-center px-3 py-2 rounded-xl border border-pink-200 dark:border-pink-800 bg-pink-50/40 dark:bg-pink-950/10 text-center">
                  <span className="text-[10px] font-title font-bold uppercase tracking-wider text-pink-500/70">Hembras</span>
                  <span className="text-base font-title font-extrabold text-pink-600 dark:text-pink-400">
                    {(Number(form.cant_hembras) || 0).toLocaleString()}
                  </span>
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

            <div className="flex-1" />

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#1067f2] hover:bg-[#0c328f] text-white font-title font-bold rounded-xl transition-all shadow-md shadow-blue-500/20 disabled:opacity-50 cursor-pointer flex-shrink-0"
            >
              {loading ? 'Guardando...' : 'Registrar Lote de Producción'}
            </button>
          </form>
        </div>

        {/* ── Tarjetas historial ── */}
        <div className="bg-surface border border-theme rounded-2xl p-6 shadow-xl flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-1 flex-shrink-0">
            <h3 className="text-xl font-title font-extrabold text-slate-800 dark:text-slate-100">
              Lotes de Producción
            </h3>
            <span className="text-xs font-title font-bold text-muted bg-surface-2 border border-theme px-2.5 py-1 rounded-lg">
              {lotes.length}
            </span>
          </div>
          <p className="text-xs text-muted mb-5 flex-shrink-0">Historial de recepciones de producción.</p>

          <div className="flex items-center gap-4 mb-4 flex-shrink-0 text-[10px] font-title font-bold uppercase tracking-wider text-muted">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />Sincronizado</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />Pendiente</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />Error</span>
          </div>

          <div className="flex-1 overflow-y-auto min-h-0">
            {lotes.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                <div className="w-14 h-14 rounded-2xl bg-surface-2 border border-theme flex items-center justify-center mb-3">
                  <svg className="w-7 h-7 text-slate-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                  </svg>
                </div>
                <p className="text-sm font-title font-bold text-slate-400 dark:text-slate-500">No hay lotes registrados.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-2 pr-1">
                {lotes.map((lote) => (
                  <LoteCard key={lote.id_local} lote={lote} />
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
