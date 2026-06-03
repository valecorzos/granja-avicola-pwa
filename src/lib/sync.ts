import type { Table } from 'dexie';
import { supabase, asegurarSesion } from './supabase';
import { dbLocal } from './db-local';

interface ConSync {
  estado_sync: 'sincronizado' | 'pendiente' | 'error';
}

export type ResultadoSync = 'ok' | 'sin-conexion' | 'sin-sesion' | 'error';

export async function sincronizarDatos(): Promise<ResultadoSync> {
  if (typeof window === 'undefined' || !navigator.onLine) return 'sin-conexion';
  if (!dbLocal) return 'error';

  // Regla 3: despertar la sesión ANTES de escribir. Si caducó offline, el
  // refresh token genera un JWT nuevo; si no hay sesión, abortamos (evita 401).
  if (!(await asegurarSesion())) {
    console.warn('Sincronización abortada: no hay sesión de Supabase válida.');
    return 'sin-sesion';
  }

  try {
    await syncRecepcionCria();
    await syncDiarioCria();
    await syncRecepcionProd();
    await syncDiarioHuevos();
    await syncDiarioAvesProd();
    await syncSalidasIncubacion();
    return 'ok';
  } catch (error) {
    console.error('Error general en sincronización:', error);
    return 'error';
  }
}

/** Tablas operativas que llevan estado_sync. */
const TABLAS_SYNC = [
  'recepcion_cria',
  'diario_cria',
  'recepcion_prod',
  'diario_huevos',
  'diario_aves_prod',
  'salidas_incubacion',
] as const;

/** Cuenta registros pendientes o con error en todas las tablas. */
export async function contarPendientes(): Promise<number> {
  const db = dbLocal;
  if (!db) return 0;
  const conteos = await Promise.all(
    TABLAS_SYNC.map((t) =>
      db[t].where('estado_sync').anyOf('pendiente', 'error').count()
    )
  );
  return conteos.reduce((a, b) => a + b, 0);
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Devuelve registros que faltan por subir: pendientes Y los que fallaron. */
async function porSubir<T extends ConSync>(tabla: Table<T>): Promise<T[]> {
  return tabla.where('estado_sync').anyOf('pendiente', 'error').toArray();
}

// ─── MÓDULO 1: CRÍA Y LEVANTE ────────────────────────────────────────────────

async function syncRecepcionCria() {
  const db = dbLocal;
  if (!db) return;
  const pendientes = await porSubir(db.recepcion_cria);

  for (const lote of pendientes) {
    const payload = {
      id_local: lote.id_local,
      fecha: lote.fecha,
      granja: lote.granja,
      galpon: lote.galpon,
      codigo_lote: lote.codigo_lote,
      cant_hembras: lote.cant_hembras,
      cant_machos: lote.cant_machos,
      usuario_email: lote.usuario_email,
    };

    // upsert por id_local → idempotente: inserta o actualiza sin duplicar.
    const result = await supabase
      .from('recepcion_cria')
      .upsert(payload, { onConflict: 'id_local' })
      .select();

    if (result.error) {
      console.error('sync recepcion_cria:', result.error.message);
      await db.recepcion_cria.update(lote.id_local, { estado_sync: 'error' });
    } else if (result.data?.[0]) {
      await db.recepcion_cria.update(lote.id_local, {
        id: result.data[0].id,
        estado_sync: 'sincronizado',
      });
    }
  }
}

async function syncDiarioCria() {
  const db = dbLocal;
  if (!db) return;
  const pendientes = await porSubir(db.diario_cria);

  for (const reg of pendientes) {
    let loteId = reg.lote_id;
    if (!loteId && reg.lote_id_local) {
      const loteLocal = await db.recepcion_cria.get(reg.lote_id_local);
      if (loteLocal?.id) {
        loteId = loteLocal.id;
        await db.diario_cria.update(reg.id_local, { lote_id: loteId });
      } else if (!loteLocal) {
        // Huérfano: el lote padre fue borrado → este registro ya no sirve.
        await db.diario_cria.delete(reg.id_local);
        continue;
      } else {
        continue; // el padre existe pero aún no se ha sincronizado
      }
    }

    const payload = {
      id_local: reg.id_local,
      lote_id: loteId,
      fecha: reg.fecha,
      sexo: reg.sexo,
      mortalidad: reg.mortalidad,
      peso_promedio: reg.peso_promedio,
      porcentaje_uniformidad: reg.porcentaje_uniformidad,
      descarte: reg.descarte,
      alimento: reg.alimento,
    };

    const result = await supabase
      .from('diario_cria')
      .upsert(payload, { onConflict: 'id_local' })
      .select();

    if (result.error) {
      console.error('sync diario_cria:', result.error.message);
      await db.diario_cria.update(reg.id_local, { estado_sync: 'error' });
    } else if (result.data?.[0]) {
      await db.diario_cria.update(reg.id_local, {
        id: result.data[0].id,
        estado_sync: 'sincronizado',
      });
    }
  }
}

// ─── MÓDULO 2: PRODUCCIÓN ─────────────────────────────────────────────────────

async function syncRecepcionProd() {
  const db = dbLocal;
  if (!db) return;
  const pendientes = await porSubir(db.recepcion_prod);

  for (const lote of pendientes) {
    const payload = {
      id_local: lote.id_local,
      fecha: lote.fecha,
      granja: lote.granja,
      galpon: lote.galpon,
      codigo_lote: lote.codigo_lote,
      cant_hembras: lote.cant_hembras,
      machos_produccion: lote.machos_produccion,
      machos_reemplazo: lote.machos_reemplazo,
      usuario_email: lote.usuario_email,
    };

    const result = await supabase
      .from('recepcion_prod')
      .upsert(payload, { onConflict: 'id_local' })
      .select();

    if (result.error) {
      console.error('sync recepcion_prod:', result.error.message);
      await db.recepcion_prod.update(lote.id_local, { estado_sync: 'error' });
    } else if (result.data?.[0]) {
      await db.recepcion_prod.update(lote.id_local, {
        id: result.data[0].id,
        estado_sync: 'sincronizado',
      });
    }
  }
}

async function syncDiarioHuevos() {
  const db = dbLocal;
  if (!db) return;
  const pendientes = await porSubir(db.diario_huevos);

  for (const reg of pendientes) {
    let loteId = reg.lote_id;
    if (!loteId && reg.lote_id_local) {
      const loteLocal = await db.recepcion_prod.get(reg.lote_id_local);
      if (loteLocal?.id) {
        loteId = loteLocal.id;
        await db.diario_huevos.update(reg.id_local, { lote_id: loteId });
      } else if (!loteLocal) {
        await db.diario_huevos.delete(reg.id_local);
        continue;
      } else {
        continue;
      }
    }

    const payload = {
      id_local: reg.id_local,
      lote_id: loteId,
      fecha: reg.fecha,
      huevos_recolectados: reg.huevos_recolectados,
      comerciales: reg.comerciales,
      descartados: reg.descartados,
    };

    const result = await supabase
      .from('diario_huevos')
      .upsert(payload, { onConflict: 'id_local' })
      .select();

    if (result.error) {
      console.error('sync diario_huevos:', result.error.message);
      await db.diario_huevos.update(reg.id_local, { estado_sync: 'error' });
    } else if (result.data?.[0]) {
      await db.diario_huevos.update(reg.id_local, {
        id: result.data[0].id,
        estado_sync: 'sincronizado',
      });
    }
  }
}

async function syncDiarioAvesProd() {
  const db = dbLocal;
  if (!db) return;
  const pendientes = await porSubir(db.diario_aves_prod);

  for (const reg of pendientes) {
    let loteId = reg.lote_id;
    if (!loteId && reg.lote_id_local) {
      const loteLocal = await db.recepcion_prod.get(reg.lote_id_local);
      if (loteLocal?.id) {
        loteId = loteLocal.id;
        await db.diario_aves_prod.update(reg.id_local, { lote_id: loteId });
      } else if (!loteLocal) {
        await db.diario_aves_prod.delete(reg.id_local);
        continue;
      } else {
        continue;
      }
    }

    const payload = {
      id_local: reg.id_local,
      lote_id: loteId,
      fecha: reg.fecha,
      sexo: reg.sexo,
      mortalidad: reg.mortalidad,
      descarte: reg.descarte,
      alimento: reg.alimento,
      lote_origen_reemplazo: reg.lote_origen_reemplazo,
    };

    const result = await supabase
      .from('diario_aves_prod')
      .upsert(payload, { onConflict: 'id_local' })
      .select();

    if (result.error) {
      console.error('sync diario_aves_prod:', result.error.message);
      await db.diario_aves_prod.update(reg.id_local, { estado_sync: 'error' });
    } else if (result.data?.[0]) {
      await db.diario_aves_prod.update(reg.id_local, {
        id: result.data[0].id,
        estado_sync: 'sincronizado',
      });
    }
  }
}

async function syncSalidasIncubacion() {
  const db = dbLocal;
  if (!db) return;
  const pendientes = await porSubir(db.salidas_incubacion);

  for (const reg of pendientes) {
    let loteId = reg.lote_id;
    if (!loteId && reg.lote_id_local) {
      const loteLocal = await db.recepcion_prod.get(reg.lote_id_local);
      if (loteLocal?.id) {
        loteId = loteLocal.id;
        await db.salidas_incubacion.update(reg.id_local, { lote_id: loteId });
      } else if (!loteLocal) {
        await db.salidas_incubacion.delete(reg.id_local);
        continue;
      } else {
        continue;
      }
    }

    const payload = {
      id_local: reg.id_local,
      lote_id: loteId,
      fecha: reg.fecha,
      clasificacion: reg.clasificacion,
      cant_cestas: reg.cant_cestas,
      cant_separadores: reg.cant_separadores,
      unidades_sueltas: reg.unidades_sueltas,
    };

    const result = await supabase
      .from('salidas_incubacion')
      .upsert(payload, { onConflict: 'id_local' })
      .select();

    if (result.error) {
      console.error('sync salidas_incubacion:', result.error.message);
      await db.salidas_incubacion.update(reg.id_local, { estado_sync: 'error' });
    } else if (result.data?.[0]) {
      await db.salidas_incubacion.update(reg.id_local, {
        id: result.data[0].id,
        estado_sync: 'sincronizado',
      });
    }
  }
}
