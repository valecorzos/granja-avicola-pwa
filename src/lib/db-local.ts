import Dexie, { type Table } from 'dexie';

export interface LoteLocal {
  id_local: string;
  id: string | null;
  codigo_lote: string;
  fecha_registro: string;
  fecha_llegada: string;
  raza: string;
  cantidad_hembras: number;
  cantidad_machos: number;
  ubicacion: string;
  galpon: string;
  estado: string;
  estado_sync: 'sincronizado' | 'pendiente' | 'error';
  creado_en: string;
  actualizado_en: string;
}

export interface CriaLevanteDiarioLocal {
  id_local: string;
  id: string | null;
  lote_id_local: string;
  lote_id: string | null;
  fecha: string;
  semana_ave: number;
  sexo: 'H' | 'M';
  mortalidad: number;
  consumo_alimento_kg: number;
  estado_sync: 'sincronizado' | 'pendiente' | 'error';
  creado_en: string;
  actualizado_en: string;
}

class GranjaAvicolaDatabase extends Dexie {
  lotes!: Table<LoteLocal>;
  cria_levante_diario!: Table<CriaLevanteDiarioLocal>;

  constructor() {
    super('GranjaAvicolaDB');
    this.version(1).stores({
      users: 'id, email',
      lotes: 'id_local, id, codigo_lote, estado_sync',
      cria_levante_diario: 'id_local, id, lote_id_local, lote_id, fecha, sexo, estado_sync'
    });
  }
}

// Instanciar la base de datos de manera segura para SSR (Server-Side Rendering)
export const dbLocal = typeof window !== 'undefined' ? new GranjaAvicolaDatabase() : null;
