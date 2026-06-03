'use client';

import React, { useState, useEffect, useRef } from 'react';
import { liveQuery } from 'dexie';
import { dbLocal, type RecepcionCriaLocal, type DiarioCriaLocal } from '@/lib/db-local';
import { sincronizarDatos } from '@/lib/sync';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface SexoFields {
  mortalidad: number;
  descarte: number;
  peso_promedio: number | null;
  porcentaje_uniformidad: number | null;
  alimento: number;
}

interface FormState {
  lote_id_local: string;
  fecha: string;
  hembras: SexoFields;
  machos: SexoFields;
}

interface ModalPeso {
  isOpen: boolean;
  targetSexo: 'H' | 'M';
  pesos: number[];
  inputValue: string;
}

type DiarioCriaEnriquecido = DiarioCriaLocal & { codigo_lote: string };

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SEXO_FIELDS_DEFAULT: SexoFields = {
  mortalidad: 0,
  descarte: 0,
  peso_promedio: null,
  porcentaje_uniformidad: null,
  alimento: 0,
};

const FORM_DEFAULT: FormState = {
  lote_id_local: '',
  fecha: new Date().toISOString().split('T')[0],
  hembras: { ...SEXO_FIELDS_DEFAULT },
  machos: { ...SEXO_FIELDS_DEFAULT },
};

const MODAL_DEFAULT: ModalPeso = {
  isOpen: false,
  targetSexo: 'H',
  pesos: [],
  inputValue: '',
};

function calcularUniformidad(pesos: number[]): number {
  if (pesos.length < 2) return 100;
  const promedio = pesos.reduce((a, b) => a + b, 0) / pesos.length;
  const rango = promedio * 0.1;
  const dentro = pesos.filter((p) => Math.abs(p - promedio) <= rango).length;
  return Math.round((dentro / pesos.length) * 100);
}

function calcularPromedio(pesos: number[]): number {
  if (pesos.length === 0) return 0;
  return Math.round((pesos.reduce((a, b) => a + b, 0) / pesos.length) * 10) / 10;
}

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

const inputCls =
  'w-full bg-surface-2 border border-theme rounded-xl px-4 py-3 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#1067f2] focus:border-transparent transition-all';
const labelCls =
  'block text-xs font-title font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2';

// ─── Modal de Pesaje ──────────────────────────────────────────────────────────

interface ModalProps {
  modal: ModalPeso;
  onClose: () => void;
  onGuardar: (sexo: 'H' | 'M', promedio: number, uniformidad: number) => void;
  onUpdateModal: (patch: Partial<ModalPeso>) => void;
}

function ModalPesaje({ modal, onClose, onGuardar, onUpdateModal }: ModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const promedio = calcularPromedio(modal.pesos);
  const uniformidad = calcularUniformidad(modal.pesos);
  const esFemenino = modal.targetSexo === 'H';

  useEffect(() => {
    if (modal.isOpen) inputRef.current?.focus();
  }, [modal.isOpen]);

  const agregarPeso = () => {
    const val = parseFloat(modal.inputValue.replace(',', '.'));
    if (isNaN(val) || val <= 0) return;
    onUpdateModal({ pesos: [...modal.pesos, val], inputValue: '' });
    inputRef.current?.focus();
  };

  const eliminarPeso = (idx: number) => {
    onUpdateModal({ pesos: modal.pesos.filter((_, i) => i !== idx) });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); agregarPeso(); }
  };

  if (!modal.isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative w-full max-w-md bg-surface border border-theme rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-theme">
          <div>
            <h4 className="font-title font-extrabold text-slate-800 dark:text-slate-100">
              Muestreo de Pesos
            </h4>
            <p className={`text-xs font-title font-bold mt-0.5 ${esFemenino ? 'text-pink-500' : 'text-[#1067f2]'}`}>
              {esFemenino ? 'Hembras (H)' : 'Machos (M)'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Input agregar */}
        <div className="p-5 border-b border-theme">
          <label className={labelCls}>Peso del Ave (g)</label>
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="number"
              value={modal.inputValue}
              onChange={(e) => onUpdateModal({ inputValue: e.target.value })}
              onKeyDown={handleKeyDown}
              className={`${inputCls} flex-1`}
              placeholder="Ej. 2450"
              min="0"
              step="0.1"
            />
            <button
              type="button"
              onClick={agregarPeso}
              className="px-4 py-3 bg-[#1067f2] hover:bg-[#0c328f] text-white font-title font-bold rounded-xl transition-all shadow-sm shadow-blue-500/20 cursor-pointer whitespace-nowrap"
            >
              + Agregar
            </button>
          </div>
        </div>

        {/* Lista de pesos */}
        <div className="flex-1 overflow-y-auto p-5">
          {modal.pesos.length === 0 ? (
            <p className="text-center text-sm text-muted py-6">
              Ingresa pesos para calcular el promedio y la uniformidad.
            </p>
          ) : (
            <ul className="space-y-2">
              {modal.pesos.map((p, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between px-4 py-2.5 bg-surface-2 border border-theme rounded-xl"
                >
                  <span className="text-sm font-title font-bold text-slate-700 dark:text-slate-300">
                    #{i + 1} — {p} g
                  </span>
                  <button
                    type="button"
                    onClick={() => eliminarPeso(i)}
                    className="text-rose-400 hover:text-rose-600 transition-colors cursor-pointer"
                    aria-label="Eliminar"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Resultados en tiempo real */}
        {modal.pesos.length > 0 && (
          <div className="px-5 pb-3 grid grid-cols-3 gap-3">
            <div className="bg-surface-2 border border-theme rounded-xl p-3 text-center">
              <div className="text-[10px] font-title font-bold text-muted uppercase tracking-wider">Muestras</div>
              <div className="text-lg font-title font-extrabold text-slate-800 dark:text-slate-100">{modal.pesos.length}</div>
            </div>
            <div className="bg-surface-2 border border-theme rounded-xl p-3 text-center">
              <div className="text-[10px] font-title font-bold text-muted uppercase tracking-wider">Promedio</div>
              <div className="text-lg font-title font-extrabold text-[#1067f2]">{promedio} g</div>
            </div>
            <div className="bg-surface-2 border border-theme rounded-xl p-3 text-center">
              <div className="text-[10px] font-title font-bold text-muted uppercase tracking-wider">Uniformidad</div>
              <div className={`text-lg font-title font-extrabold ${uniformidad >= 80 ? 'text-emerald-500' : uniformidad >= 60 ? 'text-amber-500' : 'text-rose-500'}`}>
                {uniformidad}%
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-5 border-t border-theme flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 border border-theme rounded-xl font-title font-bold text-slate-600 dark:text-slate-400 hover:bg-surface-2 transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={modal.pesos.length === 0}
            onClick={() => {
              onGuardar(modal.targetSexo, promedio, uniformidad);
              onClose();
            }}
            className="flex-1 py-3 bg-[#1067f2] hover:bg-[#0c328f] text-white font-title font-bold rounded-xl transition-all shadow-md shadow-blue-500/20 disabled:opacity-50 cursor-pointer"
          >
            Guardar y Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Sección por sexo ─────────────────────────────────────────────────────────

interface SexoSectionProps {
  sexo: 'H' | 'M';
  fields: SexoFields;
  onChange: (patch: Partial<SexoFields>) => void;
  onAbrirModal: () => void;
}

function SexoSection({ sexo, fields, onChange, onAbrirModal }: SexoSectionProps) {
  const esFemenino = sexo === 'H';
  const accentCls = esFemenino ? 'text-pink-600 dark:text-pink-400' : 'text-[#1067f2] dark:text-[#a0c1df]';
  const borderAcc = esFemenino ? 'border-pink-300 dark:border-pink-800' : 'border-[#1067f2]/30';
  const bgAcc = esFemenino ? 'bg-pink-50/40 dark:bg-pink-950/10' : 'bg-blue-50/40 dark:bg-blue-950/10';
  const bajas = fields.mortalidad + fields.descarte;

  return (
    <div className={`rounded-xl border ${borderAcc} ${bgAcc} p-4 space-y-4`}>
      {/* Encabezado sección */}
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

      {/* Peso promedio — abre modal */}
      <div>
        <label className={labelCls}>Peso Promedio</label>
        <button
          type="button"
          onClick={onAbrirModal}
          className={`w-full bg-surface-2 border border-theme rounded-xl px-4 py-3 text-left transition-all hover:ring-2 hover:ring-[#1067f2] focus:outline-none focus:ring-2 focus:ring-[#1067f2] cursor-pointer flex items-center justify-between`}
        >
          <span className={fields.peso_promedio !== null ? 'font-title font-bold text-slate-800 dark:text-slate-100' : 'text-slate-400 dark:text-slate-500 text-sm'}>
            {fields.peso_promedio !== null ? `${fields.peso_promedio} g` : 'Tomar muestras...'}
          </span>
          <span className={`text-xs font-title font-semibold ${accentCls}`}>
            {fields.porcentaje_uniformidad !== null ? `${fields.porcentaje_uniformidad}% unif.` : ''}
          </span>
          <svg className="w-4 h-4 text-slate-400 ml-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
          </svg>
        </button>
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
    </div>
  );
}

// ─── Página Principal ─────────────────────────────────────────────────────────

export default function CriaLevantePage() {
  const [lotes, setLotes] = useState<RecepcionCriaLocal[]>([]);
  const [registros, setRegistros] = useState<DiarioCriaEnriquecido[]>([]);
  const [form, setForm] = useState<FormState>(FORM_DEFAULT);
  const [modal, setModal] = useState<ModalPeso>(MODAL_DEFAULT);
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });

  // Suscripción en vivo. Los lotes son persistentes (descargados de la base);
  // los registros diarios son un caché de solo-pendientes que se vacía al
  // sincronizar → el historial queda en blanco sin necesidad de recargar.
  useEffect(() => {
    if (!dbLocal) return;
    const sub = liveQuery(async () => {
      const [listLotes, listRegs] = await Promise.all([
        dbLocal!.recepcion_cria.toArray(),
        dbLocal!.diario_cria.toArray(),
      ]);
      return { listLotes, listRegs };
    }).subscribe({
      next: ({ listLotes, listRegs }) => {
        setLotes(listLotes);
        const enriched = listRegs.map((r) => ({
          ...r,
          codigo_lote:
            listLotes.find((l) => l.id_local === r.lote_id_local || (l.id && l.id === r.lote_id))
              ?.codigo_lote ?? 'Desconocido',
        }));
        setRegistros(
          enriched.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
        );
      },
      error: (err) => console.error('liveQuery datos de cría:', err),
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

  // Cálculos derivados en tiempo real
  const loteSel = lotes.find((l) => l.id_local === form.lote_id_local);
  const totalAlojadas = loteSel ? loteSel.cant_hembras + loteSel.cant_machos : null;
  const bajasTotales =
    form.hembras.mortalidad + form.hembras.descarte + form.machos.mortalidad + form.machos.descarte;

  // Handlers del formulario
  const patchHembras = (patch: Partial<SexoFields>) =>
    setForm((f) => ({ ...f, hembras: { ...f.hembras, ...patch } }));
  const patchMachos = (patch: Partial<SexoFields>) =>
    setForm((f) => ({ ...f, machos: { ...f.machos, ...patch } }));

  // Modal
  const abrirModal = (sexo: 'H' | 'M') =>
    setModal({ isOpen: true, targetSexo: sexo, pesos: [], inputValue: '' });
  const cerrarModal = () => setModal(MODAL_DEFAULT);
  const guardarPesaje = (sexo: 'H' | 'M', promedio: number, uniformidad: number) => {
    const patch = { peso_promedio: promedio, porcentaje_uniformidad: uniformidad };
    if (sexo === 'H') patchHembras(patch);
    else patchMachos(patch);
  };

  // Submit: crea DOS registros (uno por sexo) de forma simultánea
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

      const base = {
        id: null as null,
        lote_id_local: form.lote_id_local,
        lote_id: loteId,
        fecha: form.fecha,
        estado_sync: 'pendiente' as const,
        creado_en: ahora,
        actualizado_en: ahora,
      };

      const regHembra: DiarioCriaLocal = {
        ...base,
        id_local: crypto.randomUUID(),
        sexo: 'H',
        mortalidad: form.hembras.mortalidad,
        peso_promedio: form.hembras.peso_promedio,
        porcentaje_uniformidad: form.hembras.porcentaje_uniformidad,
        descarte: form.hembras.descarte,
        alimento: form.hembras.alimento,
      };

      const regMacho: DiarioCriaLocal = {
        ...base,
        id_local: crypto.randomUUID(),
        sexo: 'M',
        mortalidad: form.machos.mortalidad,
        peso_promedio: form.machos.peso_promedio,
        porcentaje_uniformidad: form.machos.porcentaje_uniformidad,
        descarte: form.machos.descarte,
        alimento: form.machos.alimento,
      };

      await Promise.all([
        dbLocal.diario_cria.add(regHembra),
        dbLocal.diario_cria.add(regMacho),
      ]);

      setForm((f) => ({
        ...f,
        hembras: { ...SEXO_FIELDS_DEFAULT },
        machos: { ...SEXO_FIELDS_DEFAULT },
      }));

      mostrarMensaje('Registro diario de cría guardado (H + M).', 'success');
      if (navigator.onLine) sincronizarDatos();
    } catch (err) {
      console.error('Error al guardar registro diario:', err);
      mostrarMensaje('Error al guardar el registro.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Modal de pesaje — fuera del flujo del formulario */}
      <ModalPesaje
        modal={modal}
        onClose={cerrarModal}
        onGuardar={guardarPesaje}
        onUpdateModal={(p) => setModal((m) => ({ ...m, ...p }))}
      />

      <div className="space-y-6">
        {/* Toast */}
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
              Registro Diario de Cría
            </h3>
            <p className="text-xs text-muted mb-6">Un registro por fecha crea dos filas en BD (H y M).</p>

            <form onSubmit={guardarRegistro} className="space-y-5">
              {/* Lote y fecha */}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <label className={labelCls}>Lote de Cría *</label>
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

              {/* Resumen del lote seleccionado */}
              {loteSel && (
                <div className="flex flex-wrap gap-3">
                  <StatChip label="Hembras alojadas" value={loteSel.cant_hembras} color="pink" />
                  <StatChip label="Machos alojados" value={loteSel.cant_machos} color="blue" />
                  {totalAlojadas !== null && (
                    <StatChip label="Total alojadas" value={totalAlojadas} color="slate" />
                  )}
                  {bajasTotales > 0 && (
                    <StatChip label="Bajas del día" value={bajasTotales} color="rose" />
                  )}
                </div>
              )}

              {/* Sección Hembras */}
              <SexoSection
                sexo="H"
                fields={form.hembras}
                onChange={patchHembras}
                onAbrirModal={() => abrirModal('H')}
              />

              {/* Sección Machos */}
              <SexoSection
                sexo="M"
                fields={form.machos}
                onChange={patchMachos}
                onAbrirModal={() => abrirModal('M')}
              />

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-[#1067f2] hover:bg-[#0c328f] text-white font-title font-bold rounded-xl transition-all shadow-md shadow-blue-500/20 disabled:opacity-50 cursor-pointer"
              >
                {loading ? 'Guardando...' : 'Registrar Día (H + M)'}
              </button>
            </form>
          </div>

          {/* ── Historial ── */}
          <div className="bg-surface border border-theme rounded-2xl p-6 shadow-xl flex flex-col">
            <h3 className="text-xl font-title font-extrabold text-slate-800 dark:text-slate-100 mb-1">
              Historial de Cría
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
                    <th className="p-3 font-title font-bold text-slate-600 dark:text-slate-300 text-xs">Peso</th>
                    <th className="p-3 font-title font-bold text-slate-600 dark:text-slate-300 text-xs">Sync</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-theme">
                  {registros.map((reg) => (
                    <tr key={reg.id_local} className="hover:bg-surface-2/40 transition-colors">
                      <td className="p-3 text-slate-600 dark:text-slate-400 text-xs">{reg.fecha}</td>
                      <td className="p-3 font-title font-bold text-slate-800 dark:text-slate-200 text-xs">
                        {reg.codigo_lote}
                      </td>
                      <td className="p-3">
                        <span
                          className={`font-title font-extrabold text-sm ${
                            reg.sexo === 'H' ? 'text-pink-600 dark:text-pink-400' : 'text-[#1067f2] dark:text-[#a0c1df]'
                          }`}
                        >
                          {reg.sexo}
                        </span>
                      </td>
                      <td className="p-3 text-slate-700 dark:text-slate-300 text-xs">{reg.mortalidad}</td>
                      <td className="p-3 text-slate-700 dark:text-slate-300 text-xs">{reg.descarte}</td>
                      <td className="p-3 text-xs">
                        {reg.peso_promedio != null ? (
                          <div>
                            <span className="font-bold text-slate-700 dark:text-slate-300">{reg.peso_promedio} g</span>
                            {reg.porcentaje_uniformidad != null && (
                              <div className="text-[10px] text-muted">{reg.porcentaje_uniformidad}% unif.</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
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
    </>
  );
}

// ─── Chip de estadística ──────────────────────────────────────────────────────

function StatChip({ label, value, color }: { label: string; value: number; color: 'pink' | 'blue' | 'slate' | 'rose' }) {
  const colors = {
    pink: 'bg-pink-50 dark:bg-pink-950/20 text-pink-600 dark:text-pink-400 border-pink-200 dark:border-pink-800',
    blue: 'bg-blue-50 dark:bg-blue-950/20 text-[#1067f2] dark:text-[#a0c1df] border-blue-200 dark:border-blue-800',
    slate: 'bg-slate-50 dark:bg-slate-800/30 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700',
    rose: 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800',
  };
  return (
    <div className={`flex flex-col items-center px-4 py-2 rounded-xl border text-center ${colors[color]}`}>
      <span className="text-[10px] font-title font-bold uppercase tracking-wider opacity-70">{label}</span>
      <span className="text-base font-title font-extrabold">{value.toLocaleString()}</span>
    </div>
  );
}
