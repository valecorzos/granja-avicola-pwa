'use client';

import React, { useState, useEffect } from 'react';
import { liveQuery } from 'dexie';
import { dbLocal, type RecepcionCriaLocal } from '@/lib/db-local';
import { sincronizarDatos } from '@/lib/sync';
import type { GranjaConfig } from '@/lib/granjas-config';
import { useMaestroGranjas } from '@/lib/maestro';
import DatePickerVE from '@/components/DatePickerVE';
import SelectVE from '@/components/SelectVE';
import Tooltip from '@/components/Tooltip';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';

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
  cant_machos: string;
}

const FORM_DEFAULT: FormState = {
  fecha: new Date().toISOString().split('T')[0],
  granja: '',
  galpon: '',
  numero_lote: '',
  cant_hembras: '',
  cant_machos: '',
};

// ─── Estilos ──────────────────────────────────────────────────────────────────

// fix #8: sin overflow-clip lateral → el ring de focus no se corta
const inputCls =
  'w-full bg-[#F4F4F4] dark:bg-slate-800/40 border border-theme rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#1067f2] focus:border-transparent transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none';
const labelCls =
  'block text-xs font-title font-bold text-slate-500 dark:text-slate-400 mb-1.5';

// ─── Indicador de sincronización ──────────────────────────────────────────────
// Ícono de nube (no un simple punto) para que NO se confunda con el estado del
// lote (Activo/Inactivo). Comunica claramente "subida a la base de datos".

const SYNC_META: Record<
  'sincronizado' | 'pendiente' | 'error',
  { color: string; label: string; path: string; pulse?: boolean }
> = {
  sincronizado: {
    color: 'text-emerald-500',
    label: 'Sincronizado con la base',
    // nube con check
    path: 'M9 12.75 11.25 15 15 9.75M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z',
  },
  pendiente: {
    color: 'text-amber-500',
    label: 'Pendiente de subir',
    // nube con flecha arriba
    path: 'M12 16V9m0 0-2.5 2.5M12 9l2.5 2.5M7 18a4 4 0 0 1-.88-7.9 5 5 0 0 1 9.75-1.06A3.5 3.5 0 1 1 17 18H7z',
  },
  error: {
    color: 'text-rose-500',
    label: 'Error al sincronizar',
    // nube con exclamación
    path: 'M12 9.5v3m0 2.5h.01M7 18a4 4 0 0 1-.88-7.9 5 5 0 0 1 9.75-1.06A3.5 3.5 0 1 1 17 18H7z',
    pulse: true,
  },
};

function SyncIndicator({ estado }: { estado: 'sincronizado' | 'pendiente' | 'error' }) {
  const meta = SYNC_META[estado] ?? SYNC_META.pendiente;
  return (
    <Tooltip label={meta.label}>
      <svg
        className={`w-4 h-4 ${meta.color} ${meta.pulse ? 'animate-pulse' : ''} flex-shrink-0`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        aria-label={meta.label}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d={meta.path} />
      </svg>
    </Tooltip>
  );
}

// ─── Chip de estado del lote (Activo / Inactivo) ──────────────────────────────

/** Backward-compat: registros viejos sin el campo se consideran Activos. */
function esActivo(lote: RecepcionCriaLocal): boolean {
  return lote.activo !== false;
}

function EstadoLoteChip({ activo }: { activo: boolean }) {
  return (
    <span
      className={`px-2 py-0.5 rounded-full text-[11px] font-title font-extrabold border inline-flex items-center gap-1.5 flex-shrink-0 ${
        activo
          ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/40'
          : 'bg-slate-100 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${activo ? 'bg-emerald-500' : 'bg-slate-400'}`} />
      {activo ? 'Activo' : 'Inactivo'}
    </span>
  );
}

// ─── Tarjeta de Lote ──────────────────────────────────────────────────────────

interface LoteCardProps {
  lote: RecepcionCriaLocal;
  onEdit: (lote: RecepcionCriaLocal) => void;
  onDelete: (id: string) => void;
}

function LoteCard({ lote, onEdit, onDelete }: LoteCardProps) {
  const initials = lote.usuario_email ? getInitials(lote.usuario_email) : '??';
  const total = lote.cant_hembras + lote.cant_machos;
  const activo = esActivo(lote);

  return (
    // Inactivos: atenuados (transparencia + saturación baja) y van al final.
    <div
      className={`bg-[#F4F4F4] dark:bg-slate-800/30 border border-theme rounded-xl px-4 py-3 hover:border-[#1067f2]/30 transition-all ${
        activo ? '' : 'opacity-55 saturate-50 hover:opacity-80'
      }`}
    >

      {/* Fila 1: fecha · lote badge · estado · avatar · sync · acciones */}
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-xs font-title font-bold text-slate-400 dark:text-slate-500 flex-shrink-0">
          {formatVE(lote.fecha)}
        </span>

        {/* fix #4: sin #, azul más sutil */}
        <span className="px-2 py-0.5 rounded-full text-[11px] font-title font-extrabold bg-blue-50 dark:bg-blue-950/30 text-blue-500/80 dark:text-blue-400/80 border border-blue-100 dark:border-blue-900/40 flex-shrink-0">
          Lote {lote.codigo_lote}
        </span>

        {/* Estado del lote (Activo / Inactivo) — concepto distinto del sync */}
        <EstadoLoteChip activo={activo} />

        <div className="flex-1" />

        {/* Avatar del autor */}
        <Tooltip label={lote.usuario_email || 'Sin autor'}>
          <span className="w-6 h-6 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 text-white flex items-center justify-center text-[9px] font-title font-extrabold shadow-sm flex-shrink-0">
            {initials}
          </span>
        </Tooltip>

        <SyncIndicator estado={lote.estado_sync} />

        {/* fix #5: botones editar / borrar */}
        <Tooltip label="Editar lote">
          <button
            type="button"
            onClick={() => onEdit(lote)}
            className="w-6 h-6 flex items-center justify-center rounded-lg text-slate-400 hover:text-[#1067f2] hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-colors cursor-pointer flex-shrink-0"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
        </Tooltip>

        <Tooltip label="Eliminar lote">
          <button
            type="button"
            onClick={() => onDelete(lote.id_local)}
            className="w-6 h-6 flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors cursor-pointer flex-shrink-0"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </Tooltip>
      </div>

      {/* Fila 2: Granja · Galpón */}
      <div className="text-sm font-title font-bold text-slate-700 dark:text-slate-200 mb-2">
        {lote.granja || '—'}
        <span className="text-slate-300 dark:text-slate-600 mx-1.5">·</span>
        <span className="text-slate-500 dark:text-slate-400 font-semibold">{lote.galpon}</span>
      </div>

      {/* Fila 3: conteos */}
      <div className="flex items-center gap-4 text-sm">
        <span className="font-title font-extrabold text-pink-600 dark:text-pink-400">
          ♀ {lote.cant_hembras.toLocaleString()}
        </span>
        <span className="font-title font-extrabold text-[#1067f2] dark:text-[#a0c1df]">
          ♂ {lote.cant_machos.toLocaleString()}
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="text-[10px] font-title font-bold uppercase tracking-wider text-slate-400">Total</span>
          <span className="text-sm font-title font-extrabold text-slate-700 dark:text-slate-300">
            {total.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Modal de Confirmación de Borrado ─────────────────────────────────────────

function DeleteConfirmModal({
  lote,
  onConfirm,
  onCancel,
}: {
  lote: RecepcionCriaLocal;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-sm bg-surface border border-theme rounded-2xl shadow-2xl p-6">
        <h4 className="font-title font-extrabold text-slate-800 dark:text-slate-100 mb-2">
          ¿Eliminar lote?
        </h4>
        <p className="text-sm text-muted mb-5">
          Se eliminará el lote <strong className="text-slate-700 dark:text-slate-200">{lote.codigo_lote}</strong> del{' '}
          {formatVE(lote.fecha)} ({lote.granja}). Esta acción no se puede deshacer.
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 border border-theme rounded-xl font-title font-bold text-slate-600 dark:text-slate-400 hover:bg-surface-2 transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-title font-bold rounded-xl transition-colors cursor-pointer"
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal de Edición ─────────────────────────────────────────────────────────

function EditModal({
  lote,
  granjas,
  onSave,
  onCancel,
}: {
  lote: RecepcionCriaLocal;
  granjas: GranjaConfig[];
  onSave: (data: Partial<RecepcionCriaLocal>) => void;
  onCancel: () => void;
}) {
  const granjaId =
    granjas.find((g) => g.nombre === lote.granja)?.id ?? '';
  const galponId =
    granjas.find((g) => g.nombre === lote.granja)
      ?.galpones.find((gp) => gp.nombre === lote.galpon)?.id ?? '';

  const [form, setForm] = useState({
    fecha: lote.fecha,
    granja: granjaId,
    galpon: galponId,
    numero_lote: lote.codigo_lote,
    cant_hembras: String(lote.cant_hembras),
    cant_machos: String(lote.cant_machos),
    activo: lote.activo !== false,
  });

  const granjaSeleccionada = granjas.find((g) => g.id === form.granja);
  const galpones = granjaSeleccionada?.galpones ?? [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      fecha: form.fecha,
      granja: granjaSeleccionada?.nombre ?? lote.granja,
      galpon: galpones.find((g) => g.id === form.galpon)?.nombre ?? lote.galpon,
      codigo_lote: form.numero_lote,
      cant_hembras: Number(form.cant_hembras) || 0,
      cant_machos: Number(form.cant_machos) || 0,
      activo: form.activo,
      estado_sync: 'pendiente',
      actualizado_en: new Date().toISOString(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-md bg-surface border border-theme rounded-2xl shadow-2xl p-6 max-h-[90dvh] overflow-y-auto">
        <h4 className="font-title font-extrabold text-slate-800 dark:text-slate-100 mb-5">
          Editar Lote
        </h4>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className={labelCls}>Fecha *</label>
            <DatePickerVE value={form.fecha} onChange={(v) => setForm({ ...form, fecha: v })} required />
          </div>
          <div>
            <label className={labelCls}>Granja *</label>
            <SelectVE
              value={form.granja}
              onChange={(v) => setForm({ ...form, granja: v, galpon: '' })}
              options={granjas.map((g) => ({ value: g.id, label: g.nombre }))}
              placeholder="Buscar granja..."
              searchable
            />
          </div>
          <div>
            <label className={labelCls}>Galpón *</label>
            <SelectVE
              value={form.galpon}
              onChange={(v) => setForm({ ...form, galpon: v })}
              options={galpones.map((g) => ({ value: g.id, label: g.nombre }))}
              placeholder={form.granja ? 'Buscar galpón...' : 'Primero seleccione una granja'}
              disabled={!form.granja}
            />
          </div>
          <div className="w-40">
            <label className={labelCls}>N° de Lote *</label>
            <input
              type="number"
              value={form.numero_lote}
              onChange={(e) => setForm({ ...form, numero_lote: e.target.value })}
              className={inputCls}
              placeholder="Ej. 47"
              min="1"
              step="1"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Hembras *</label>
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
            <div>
              <label className={labelCls}>Machos *</label>
              <input
                type="number"
                value={form.cant_machos}
                onChange={(e) => setForm({ ...form, cant_machos: e.target.value })}
                className={inputCls}
                placeholder="0"
                min="0"
                required
              />
            </div>
          </div>

          {/* Estado del lote en Cría y Levante — control segmentado */}
          <div>
            <label className={labelCls}>Estado del Lote</label>
            <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-[#F4F4F4] dark:bg-slate-800/40 border border-theme">
              <button
                type="button"
                onClick={() => setForm({ ...form, activo: true })}
                className={`py-2 rounded-lg text-sm font-title font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  form.activo
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-slate-700/40'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${form.activo ? 'bg-white' : 'bg-emerald-500'}`} />
                Activo
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, activo: false })}
                className={`py-2 rounded-lg text-sm font-title font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  !form.activo
                    ? 'bg-slate-500 text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-slate-700/40'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${!form.activo ? 'bg-white' : 'bg-slate-400'}`} />
                Inactivo
              </button>
            </div>
            <p className="text-[11px] text-muted mt-1.5">
              Marca <strong>Inactivo</strong> cuando el lote cierre su fase de Cría y Levante.
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-2.5 border border-theme rounded-xl font-title font-bold text-slate-600 dark:text-slate-400 hover:bg-surface-2 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 bg-[#1067f2] hover:bg-[#0c328f] text-white font-title font-bold rounded-xl transition-colors cursor-pointer"
            >
              Guardar Cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Página Principal ─────────────────────────────────────────────────────────

export default function RecepcionCriaPage() {
  const { user } = useAuth();
  const toast = useToast();
  const { granjas } = useMaestroGranjas();
  const [lotes, setLotes] = useState<RecepcionCriaLocal[]>([]);
  const [form, setForm] = useState<FormState>(FORM_DEFAULT);
  const [loading, setLoading] = useState(false);

  // fix #5: estado para edición y borrado
  const [editLote, setEditLote] = useState<RecepcionCriaLocal | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Filtros del listado
  const [granjasFiltro, setGranjasFiltro] = useState<string[]>([]);
  const [showFilter, setShowFilter] = useState(false);

  const granjaSeleccionada = granjas.find((g) => g.id === form.granja);
  const galpones = granjaSeleccionada?.galpones ?? [];

  const mostrarMensaje = (texto: string, tipo: 'success' | 'error' | 'info' | 'warning') => {
    toast.notify(texto, tipo);
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
      await dbLocal.recepcion_cria.add({
        id_local: crypto.randomUUID(),
        id: null,
        fecha: form.fecha,
        granja: granjaSeleccionada?.nombre ?? '',
        galpon: galpones.find((g) => g.id === form.galpon)?.nombre ?? form.galpon,
        codigo_lote: String(numLote),
        cant_hembras: Number(form.cant_hembras) || 0,
        cant_machos: Number(form.cant_machos) || 0,
        usuario_email: user?.email ?? '',
        activo: true,
        estado_sync: 'pendiente',
        creado_en: ahora,
        actualizado_en: ahora,
      });
      setForm(FORM_DEFAULT);
      mostrarMensaje('Lote de cría registrado.', 'success');
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

  // fix #5: guardar edición
  const handleEditSave = async (data: Partial<RecepcionCriaLocal>) => {
    if (!dbLocal || !editLote) return;
    try {
      await dbLocal.recepcion_cria.update(editLote.id_local, data);
      setEditLote(null);
      mostrarMensaje('Lote actualizado.', 'success');
      if (navigator.onLine) sincronizarDatos();
    } catch {
      mostrarMensaje('Error al actualizar el lote.', 'error');
    }
  };

  // fix #5: confirmar borrado
  const handleDeleteConfirm = async () => {
    if (!dbLocal || !deleteId) return;
    try {
      // Borrar también los registros diarios hijos para no dejar huérfanos.
      await dbLocal.diario_cria.where('lote_id_local').equals(deleteId).delete();
      await dbLocal.recepcion_cria.delete(deleteId);
      setDeleteId(null);
      mostrarMensaje('Lote eliminado.', 'success');
    } catch {
      mostrarMensaje('Error al eliminar el lote.', 'error');
    }
  };

  // Suscripción en vivo: cualquier cambio en Dexie (incluido el estado_sync que
  // actualiza el botón de sincronización) re-renderiza la lista al instante,
  // sin necesidad de refrescar la página.
  useEffect(() => {
    if (!dbLocal) return;
    const sub = liveQuery(() => dbLocal!.recepcion_cria.toArray()).subscribe({
      next: (list) =>
        setLotes(
          [...list].sort(
            (a, b) => new Date(b.creado_en).getTime() - new Date(a.creado_en).getTime()
          )
        ),
      error: (err) => console.error('liveQuery lotes de cría:', err),
    });
    return () => sub.unsubscribe();
  }, []);

  // Al entrar, traer del servidor los lotes que crearon otros usuarios.
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      sincronizarDatos();
    }
  }, []);

  const totalAlojadas = (Number(form.cant_hembras) || 0) + (Number(form.cant_machos) || 0);
  const loteParaDelete = lotes.find((l) => l.id_local === deleteId) ?? null;

  // Granjas únicas presentes en los registros (para los chips de filtro)
  const granjasDisponibles = Array.from(new Set(lotes.map((l) => l.granja).filter(Boolean))).sort();

  // Aplica filtro de granja y ordena: ACTIVOS primero, INACTIVOS al final;
  // dentro de cada grupo, por N° de lote DESC.
  const lotesVisibles = lotes
    .filter((l) => granjasFiltro.length === 0 || granjasFiltro.includes(l.granja))
    .sort((a, b) => {
      const aActivo = esActivo(a);
      const bActivo = esActivo(b);
      if (aActivo !== bActivo) return aActivo ? -1 : 1; // activos arriba
      const na = parseInt(a.codigo_lote, 10);
      const nb = parseInt(b.codigo_lote, 10);
      if (isNaN(na) && isNaN(nb)) return a.codigo_lote.localeCompare(b.codigo_lote);
      if (isNaN(na)) return 1;
      if (isNaN(nb)) return -1;
      return nb - na;
    });

  const toggleGranja = (g: string) =>
    setGranjasFiltro((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));

  return (
    <>
      {editLote && (
        <EditModal
          lote={editLote}
          granjas={granjas}
          onSave={handleEditSave}
          onCancel={() => setEditLote(null)}
        />
      )}
      {loteParaDelete && (
        <DeleteConfirmModal
          lote={loteParaDelete}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteId(null)}
        />
      )}

      {/* Page wrapper — full height usando todo el espacio del viewport */}
      <div className="flex flex-col gap-4 md:h-[calc(100dvh-3rem)]">

        {/* Grid 2:1 — form ancho, listado más estrecho (como el mockup) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 flex-1 min-h-0">

          {/* ── Columna izquierda (2/3): título + card + botón ── */}
          <div className="lg:col-span-2 flex flex-col min-h-0 self-start w-full">

            {/* Título y subtítulo FUERA del card */}
            <div className="mb-5 px-1">
              <h3 className="text-2xl font-title font-extrabold text-slate-800 dark:text-slate-100 mb-1">
                Recepción de Cría
              </h3>
              <p className="text-sm text-muted">
                Registra la llegada de un nuevo lote al galpón.
              </p>
            </div>

            {/* Form envuelve todo; el card es un div interior */}
            <form onSubmit={guardarLote} className="flex flex-col">

              {/* Card blanco — altura ajustada al contenido */}
              <div className="bg-surface border border-theme rounded-2xl p-6 md:p-8 shadow-sm flex flex-col gap-5">

              {/* Fila 1: Fecha · N° Lote */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className={labelCls}>Fecha de Llegada:</label>
                  <DatePickerVE
                    value={form.fecha}
                    onChange={(v) => setForm({ ...form, fecha: v })}
                    required
                  />
                </div>
                <div>
                  <label className={labelCls}>N° de Lote:</label>
                  <input
                    type="number"
                    value={form.numero_lote}
                    onChange={(e) => setForm({ ...form, numero_lote: e.target.value })}
                    className={inputCls}
                    placeholder="Ej. 47"
                    min="1"
                    step="1"
                    required
                  />
                </div>
              </div>

              {/* Fila 2: Granja · Galpón */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className={labelCls}>Granja:</label>
                  <SelectVE
                    value={form.granja}
                    onChange={(v) => setForm({ ...form, granja: v, galpon: '' })}
                    options={granjas.map((g) => ({ value: g.id, label: g.nombre }))}
                    placeholder="Buscar granja..."
                    searchable
                  />
                </div>
                <div>
                  <label className={labelCls}>Galpón:</label>
                  <SelectVE
                    value={form.galpon}
                    onChange={(v) => setForm({ ...form, galpon: v })}
                    options={galpones.map((g) => ({ value: g.id, label: g.nombre }))}
                    placeholder={form.granja ? 'Buscar galpón...' : 'Primero seleccione una granja'}
                    disabled={!form.granja}
                  />
                </div>
              </div>

              {/* Fila 3: Hembras · Machos */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className={labelCls}>Hembras Alojadas:</label>
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
                <div>
                  <label className={labelCls}>Machos Alojados:</label>
                  <input
                    type="number"
                    value={form.cant_machos}
                    onChange={(e) => setForm({ ...form, cant_machos: e.target.value })}
                    className={inputCls}
                    placeholder="0"
                    min="0"
                    required
                  />
                </div>
              </div>

              {totalAlojadas > 0 && (
                <div className="flex items-center justify-between rounded-xl border border-[#1067f2]/20 bg-blue-50/40 dark:bg-blue-950/20 px-4 py-3">
                  <span className="text-xs font-title font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Total aves a alojar
                  </span>
                  <span className="text-lg font-title font-extrabold text-[#1067f2]">
                    {totalAlojadas.toLocaleString()}
                  </span>
                </div>
              )}

              </div>
              {/* /Card */}

              {/* Botón FUERA del card — full width en móvil, derecha en desktop */}
              <div className="flex md:justify-end mt-5 px-1">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full md:w-auto px-6 py-2.5 bg-[#1067f2] hover:bg-[#0c328f] text-white font-title font-bold rounded-xl transition-all shadow-md shadow-blue-500/20 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? 'Guardando...' : 'Registrar Lote'}
                </button>
              </div>
            </form>

          </div>

          {/* ── Lotes registrados (1/3 del ancho) ── */}
          <div className="bg-surface border border-theme rounded-2xl p-6 shadow-sm flex flex-col min-h-0">

            {/* Header */}
            <div className="flex items-center justify-between mb-1 flex-shrink-0 gap-2">
              <h3 className="text-lg font-title font-extrabold text-slate-800 dark:text-slate-100">
                Lotes Registrados
              </h3>
              <div className="flex items-center gap-2">
                {/* Botón de filtro */}
                <button
                  type="button"
                  onClick={() => setShowFilter((s) => !s)}
                  className={`relative w-8 h-8 flex items-center justify-center rounded-lg border transition-all cursor-pointer
                    ${showFilter || granjasFiltro.length > 0
                      ? 'bg-blue-50 dark:bg-blue-950/30 border-[#1067f2]/30 text-[#1067f2] dark:text-[#a0c1df]'
                      : 'bg-[#F4F4F4] dark:bg-slate-800/40 border-theme text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                  title="Filtrar por granja"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                  {granjasFiltro.length > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-[#1067f2] text-white text-[9px] font-title font-extrabold flex items-center justify-center shadow-sm">
                      {granjasFiltro.length}
                    </span>
                  )}
                </button>
                <span className="text-xs font-title font-bold text-muted bg-[#F4F4F4] dark:bg-slate-800/40 border border-theme px-2.5 py-0.5 rounded-lg">
                  {lotesVisibles.length}
                  {granjasFiltro.length > 0 && <span className="text-slate-400">/{lotes.length}</span>}
                </span>
              </div>
            </div>
            <p className="text-xs text-muted mb-4 flex-shrink-0">
              Ordenados por N° de lote (mayor a menor).
            </p>

            {/* Panel de filtro por granja */}
            {showFilter && (
              <div className="mb-3 p-3 rounded-xl bg-[#F4F4F4] dark:bg-slate-800/40 border border-theme flex-shrink-0">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-title font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Filtrar por granja
                  </span>
                  {granjasFiltro.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setGranjasFiltro([])}
                      className="text-[10px] font-title font-bold text-[#1067f2] hover:underline cursor-pointer"
                    >
                      Limpiar
                    </button>
                  )}
                </div>
                {granjasDisponibles.length === 0 ? (
                  <p className="text-xs text-muted">Sin granjas para filtrar.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {granjasDisponibles.map((g) => {
                      const active = granjasFiltro.includes(g);
                      return (
                        <button
                          key={g}
                          type="button"
                          onClick={() => toggleGranja(g)}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-title font-bold border transition-all cursor-pointer
                            ${active
                              ? 'bg-[#1067f2] text-white border-[#1067f2] shadow-sm'
                              : 'bg-white dark:bg-slate-900/40 text-slate-600 dark:text-slate-300 border-theme hover:border-[#1067f2]/40'}`}
                        >
                          {active && (
                            <svg className="inline w-3 h-3 mr-1 -mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                          {g}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Leyenda de SINCRONIZACIÓN (íconos de nube) — distinta del estado del lote */}
            <div className="flex items-center gap-3 mb-4 flex-shrink-0 text-[10px] font-title font-bold uppercase tracking-wider text-muted flex-wrap">
              <span className="text-slate-400 dark:text-slate-500 normal-case">Sincronización:</span>
              {(['sincronizado', 'pendiente', 'error'] as const).map((e) => (
                <span key={e} className="flex items-center gap-1.5">
                  <svg
                    className={`w-3.5 h-3.5 ${SYNC_META[e].color}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d={SYNC_META[e].path} />
                  </svg>
                  {e}
                </span>
              ))}
            </div>

            {/* Galería con scroll independiente */}
            <div className="flex-1 overflow-y-auto min-h-0 pr-1">
              {lotes.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-[#F4F4F4] dark:bg-slate-800/40 border border-theme flex items-center justify-center mb-3">
                    <svg className="w-7 h-7 text-slate-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <p className="text-sm font-title font-bold text-slate-400 dark:text-slate-500">
                    No hay lotes registrados.
                  </p>
                  <p className="text-xs text-muted mt-1">Los lotes aparecerán aquí al crearlos.</p>
                </div>
              ) : lotesVisibles.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                  <p className="text-sm font-title font-bold text-slate-400 dark:text-slate-500">
                    Sin coincidencias.
                  </p>
                  <p className="text-xs text-muted mt-1">Ajusta o limpia el filtro.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2 pb-1">
                  {lotesVisibles.map((lote) => (
                    <LoteCard
                      key={lote.id_local}
                      lote={lote}
                      onEdit={setEditLote}
                      onDelete={setDeleteId}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
