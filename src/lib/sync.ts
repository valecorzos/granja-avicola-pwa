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
    // 1) Subir lo que este dispositivo tiene pendiente.
    await syncRecepcionCria();
    await syncDiarioCria();
    await syncRecepcionProd();
    await syncDiarioHuevos();
    await syncDiarioAvesProd();
    await syncSalidasIncubacion();
    // 2) Descargar lo que otros usuarios subieron → todos ven todo.
    await descargarDatos();
    return 'ok';
  } catch (error) {
    console.error('Error general en sincronización:', error);
    return 'error';
  }
}

/**
 * Descarga (pull) desde Supabase hacia la base local. Gracias a RLS, cualquier
 * usuario autenticado ve TODAS las filas, así que cada dispositivo termina con
 * el conjunto completo de registros, sin importar quién los creó.
 *
 * SOLO se descargan las RECEPCIONES de lotes (pocos registros, todos deben
 * verlos para poder seleccionarlos al hacer un diario). Los DIARIOS NO se
 * descargan: son alto volumen y funcionan como caché de solo-pendientes que se
 * vacía al sincronizar.
 *
 * Regla de mezcla: nunca pisamos un registro local que esté 'pendiente' o
 * 'error' (cambios aún sin subir). Solo escribimos filas nuevas o que ya
 * estaban 'sincronizado' localmente.
 */
export async function descargarDatos(): Promise<ResultadoSync> {
  if (typeof window === 'undefined' || !navigator.onLine) return 'sin-conexion';
  if (!dbLocal) return 'error';
  if (!(await asegurarSesion())) return 'sin-sesion';

  try {
    await pullRecepcionCria();
    await pullRecepcionProd();
    return 'ok';
  } catch (error) {
    console.error('Error general en descarga:', error);
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

/**
 * ¿Es seguro sobrescribir el registro local con la versión remota?
 * Solo cuando NO existe localmente o ya estaba 'sincronizado'. Si está
 * 'pendiente'/'error', tiene cambios locales sin subir que no debemos pisar.
 */
function puedeSobrescribir(local: ConSync | undefined): boolean {
  return !local || local.estado_sync === 'sincronizado';
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
      activo: lote.activo ?? true,
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
      // Caché de solo-pendientes: una vez en la base, se borra del dispositivo.
      await db.diario_cria.delete(reg.id_local);
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
      // Caché de solo-pendientes: una vez en la base, se borra del dispositivo.
      await db.diario_huevos.delete(reg.id_local);
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
      // Caché de solo-pendientes: una vez en la base, se borra del dispositivo.
      await db.diario_aves_prod.delete(reg.id_local);
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
      // Caché de solo-pendientes: una vez en la base, se borra del dispositivo.
      await db.salidas_incubacion.delete(reg.id_local);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  DESCARGA (PULL): Supabase → base local. Hace que todos vean todo.
// ═══════════════════════════════════════════════════════════════════════════

const ahoraISO = () => new Date().toISOString();

// ─── MÓDULO 1: CRÍA Y LEVANTE ────────────────────────────────────────────────

async function pullRecepcionCria() {
  const db = dbLocal;
  if (!db) return;
  const { data, error } = await supabase.from('recepcion_cria').select('*');
  if (error) {
    console.error('pull recepcion_cria:', error.message);
    return;
  }

  for (const row of data ?? []) {
    const local = await db.recepcion_cria.get(row.id_local);
    if (!puedeSobrescribir(local)) continue;
    await db.recepcion_cria.put({
      id_local: row.id_local,
      id: row.id,
      fecha: row.fecha,
      granja: row.granja ?? '',
      galpon: row.galpon ?? '',
      codigo_lote: row.codigo_lote ?? '',
      cant_hembras: row.cant_hembras ?? 0,
      cant_machos: row.cant_machos ?? 0,
      usuario_email: row.usuario_email ?? '',
      activo: row.activo ?? true,
      estado_sync: 'sincronizado',
      creado_en: row.creado_en ?? local?.creado_en ?? ahoraISO(),
      actualizado_en: local?.actualizado_en ?? row.creado_en ?? ahoraISO(),
    });
  }
}

// ─── MÓDULO 2: PRODUCCIÓN ─────────────────────────────────────────────────────

async function pullRecepcionProd() {
  const db = dbLocal;
  if (!db) return;
  const { data, error } = await supabase.from('recepcion_prod').select('*');
  if (error) {
    console.error('pull recepcion_prod:', error.message);
    return;
  }

  for (const row of data ?? []) {
    const local = await db.recepcion_prod.get(row.id_local);
    if (!puedeSobrescribir(local)) continue;
    await db.recepcion_prod.put({
      id_local: row.id_local,
      id: row.id,
      fecha: row.fecha,
      granja: row.granja ?? '',
      galpon: row.galpon ?? '',
      codigo_lote: row.codigo_lote ?? '',
      cant_hembras: row.cant_hembras ?? 0,
      machos_produccion: row.machos_produccion ?? 0,
      machos_reemplazo: row.machos_reemplazo ?? 0,
      usuario_email: row.usuario_email ?? '',
      estado_sync: 'sincronizado',
      creado_en: row.creado_en ?? local?.creado_en ?? ahoraISO(),
      actualizado_en: local?.actualizado_en ?? row.creado_en ?? ahoraISO(),
    });
  }
}

