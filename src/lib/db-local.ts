import Dexie, { type Table } from 'dexie';

// ─── MÓDULO 1: CRÍA Y LEVANTE ────────────────────────────────────────────────

export interface RecepcionCriaLocal {
  id_local: string;
  id: string | null;
  fecha: string;
  granja: string;
  galpon: string;
  codigo_lote: string;
  cant_hembras: number;
  cant_machos: number;
  usuario_email: string;
  /** Estado del lote en la fase de Cría y Levante. true = Activo, false = Inactivo (cerrado). */
  activo: boolean;
  estado_sync: 'sincronizado' | 'pendiente' | 'error';
  creado_en: string;
  actualizado_en: string;
}

export interface DiarioCriaLocal {
  id_local: string;
  id: string | null;
  lote_id_local: string;
  lote_id: string | null;
  fecha: string;
  sexo: 'H' | 'M';
  mortalidad: number;
  peso_promedio: number | null;
  porcentaje_uniformidad: number | null;
  descarte: number;
  alimento: number;
  estado_sync: 'sincronizado' | 'pendiente' | 'error';
  creado_en: string;
  actualizado_en: string;
}

// ─── MÓDULO 2: PRODUCCIÓN ─────────────────────────────────────────────────────

export interface RecepcionProdLocal {
  id_local: string;
  id: string | null;
  fecha: string;
  granja: string;
  galpon: string;
  codigo_lote: string;
  cant_hembras: number;
  machos_produccion: number;
  machos_reemplazo: number;
  usuario_email: string;
  estado_sync: 'sincronizado' | 'pendiente' | 'error';
  creado_en: string;
  actualizado_en: string;
}

export interface DiarioHuevosLocal {
  id_local: string;
  id: string | null;
  lote_id_local: string;
  lote_id: string | null;
  fecha: string;
  huevos_recolectados: number;
  comerciales: number;
  descartados: number;
  estado_sync: 'sincronizado' | 'pendiente' | 'error';
  creado_en: string;
  actualizado_en: string;
}

export interface DiarioAvesProdLocal {
  id_local: string;
  id: string | null;
  lote_id_local: string;
  lote_id: string | null;
  fecha: string;
  sexo: 'H' | 'M';
  mortalidad: number;
  descarte: number;
  alimento: number;
  lote_origen_reemplazo: string | null;
  estado_sync: 'sincronizado' | 'pendiente' | 'error';
  creado_en: string;
  actualizado_en: string;
}

export interface SalidasIncubacionLocal {
  id_local: string;
  id: string | null;
  lote_id_local: string;
  lote_id: string | null;
  fecha: string;
  clasificacion: string;
  cant_cestas: number;
  cant_separadores: number;
  unidades_sueltas: number;
  estado_sync: 'sincronizado' | 'pendiente' | 'error';
  creado_en: string;
  actualizado_en: string;
}

// ─── MAESTRO: GRANJAS Y GALPONES (caché local del maestro de Supabase) ───────

export interface GranjaLocal {
  id: string;
  nombre: string;
  activo: boolean;
}

export interface GalponLocal {
  id: string;
  granja_id: string;
  nombre: string;
  activo: boolean;
}

class GranjaAvicolaDatabase extends Dexie {
  recepcion_cria!: Table<RecepcionCriaLocal>;
  diario_cria!: Table<DiarioCriaLocal>;
  recepcion_prod!: Table<RecepcionProdLocal>;
  diario_huevos!: Table<DiarioHuevosLocal>;
  diario_aves_prod!: Table<DiarioAvesProdLocal>;
  salidas_incubacion!: Table<SalidasIncubacionLocal>;
  granjas!: Table<GranjaLocal>;
  galpones!: Table<GalponLocal>;

  constructor() {
    super('GranjaAvicolaDB');

    // v1 declarada para que Dexie ejecute la migración y elimine tablas antiguas
    this.version(1).stores({
      users: 'id, email',
      lotes: 'id_local, id, codigo_lote, estado_sync',
      cria_levante_diario: 'id_local, id, lote_id_local, lote_id, fecha, sexo, estado_sync',
    });

    this.version(2).stores({
      users: null,
      lotes: null,
      cria_levante_diario: null,
      recepcion_cria: 'id_local, id, codigo_lote, galpon, estado_sync',
      diario_cria: 'id_local, id, lote_id_local, lote_id, fecha, sexo, estado_sync',
      recepcion_prod: 'id_local, id, codigo_lote, galpon, estado_sync',
      diario_huevos: 'id_local, id, lote_id_local, lote_id, fecha, estado_sync',
      diario_aves_prod: 'id_local, id, lote_id_local, lote_id, fecha, sexo, estado_sync',
      salidas_incubacion: 'id_local, id, lote_id_local, lote_id, fecha, estado_sync',
    });

    // v3: caché local del maestro de granjas/galpones
    this.version(3).stores({
      granjas: 'id, nombre',
      galpones: 'id, granja_id, nombre',
    });
  }
}

export const dbLocal = typeof window !== 'undefined' ? new GranjaAvicolaDatabase() : null;
