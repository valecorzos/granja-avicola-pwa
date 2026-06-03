import { supabase } from './supabase';
import { dbLocal, type RecepcionCriaLocal, type DiarioCriaLocal, type RecepcionProdLocal, type DiarioHuevosLocal, type DiarioAvesProdLocal, type SalidasIncubacionLocal } from './db-local';

export async function sincronizarDatos() {
  if (typeof window === 'undefined' || !navigator.onLine) return;
  if (!dbLocal) return;

  try {
    await syncRecepcionCria();
    await syncDiarioCria();
    await syncRecepcionProd();
    await syncDiarioHuevos();
    await syncDiarioAvesProd();
    await syncSalidasIncubacion();
  } catch (error) {
    console.error('Error general en sincronización:', error);
  }
}

// ─── MÓDULO 1 ─────────────────────────────────────────────────────────────────

async function syncRecepcionCria() {
  if (!dbLocal) return;
  const pendientes = await dbLocal.recepcion_cria.where('estado_sync').equals('pendiente').toArray();

  for (const lote of pendientes) {
    const payload = {
      id_local: lote.id_local,
      fecha: lote.fecha,
      granja: lote.granja,
      galpon: lote.galpon,
      codigo_lote: lote.codigo_lote,
      cant_hembras: lote.cant_hembras,
      cant_machos: lote.cant_machos,
    };

    const result = lote.id
      ? await supabase.from('recepcion_cria').update(payload).eq('id', lote.id).select()
      : await supabase.from('recepcion_cria').insert([payload]).select();

    if (result.error) {
      await dbLocal.recepcion_cria.update(lote.id_local, { estado_sync: 'error' });
    } else if (result.data?.[0]) {
      await dbLocal.recepcion_cria.update(lote.id_local, {
        id: result.data[0].id,
        estado_sync: 'sincronizado',
      });
    }
  }
}

async function syncDiarioCria() {
  if (!dbLocal) return;
  const pendientes = await dbLocal.diario_cria.where('estado_sync').equals('pendiente').toArray();

  for (const reg of pendientes) {
    let loteId = reg.lote_id;
    if (!loteId && reg.lote_id_local) {
      const loteLocal = await dbLocal.recepcion_cria.get(reg.lote_id_local);
      if (loteLocal?.id) {
        loteId = loteLocal.id;
        await dbLocal.diario_cria.update(reg.id_local, { lote_id: loteId });
      } else {
        continue; // lote padre aún no sincronizado
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

    const result = reg.id
      ? await supabase.from('diario_cria').update(payload).eq('id', reg.id).select()
      : await supabase.from('diario_cria').insert([payload]).select();

    if (result.error) {
      await dbLocal.diario_cria.update(reg.id_local, { estado_sync: 'error' });
    } else if (result.data?.[0]) {
      await dbLocal.diario_cria.update(reg.id_local, {
        id: result.data[0].id,
        estado_sync: 'sincronizado',
      });
    }
  }
}

// ─── MÓDULO 2 ─────────────────────────────────────────────────────────────────

async function syncRecepcionProd() {
  if (!dbLocal) return;
  const pendientes = await dbLocal.recepcion_prod.where('estado_sync').equals('pendiente').toArray();

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
    };

    const result = lote.id
      ? await supabase.from('recepcion_prod').update(payload).eq('id', lote.id).select()
      : await supabase.from('recepcion_prod').insert([payload]).select();

    if (result.error) {
      await dbLocal.recepcion_prod.update(lote.id_local, { estado_sync: 'error' });
    } else if (result.data?.[0]) {
      await dbLocal.recepcion_prod.update(lote.id_local, {
        id: result.data[0].id,
        estado_sync: 'sincronizado',
      });
    }
  }
}

async function syncDiarioHuevos() {
  if (!dbLocal) return;
  const pendientes = await dbLocal.diario_huevos.where('estado_sync').equals('pendiente').toArray();

  for (const reg of pendientes) {
    let loteId = reg.lote_id;
    if (!loteId && reg.lote_id_local) {
      const loteLocal = await dbLocal.recepcion_prod.get(reg.lote_id_local);
      if (loteLocal?.id) {
        loteId = loteLocal.id;
        await dbLocal.diario_huevos.update(reg.id_local, { lote_id: loteId });
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

    const result = reg.id
      ? await supabase.from('diario_huevos').update(payload).eq('id', reg.id).select()
      : await supabase.from('diario_huevos').insert([payload]).select();

    if (result.error) {
      await dbLocal.diario_huevos.update(reg.id_local, { estado_sync: 'error' });
    } else if (result.data?.[0]) {
      await dbLocal.diario_huevos.update(reg.id_local, {
        id: result.data[0].id,
        estado_sync: 'sincronizado',
      });
    }
  }
}

async function syncDiarioAvesProd() {
  if (!dbLocal) return;
  const pendientes = await dbLocal.diario_aves_prod.where('estado_sync').equals('pendiente').toArray();

  for (const reg of pendientes) {
    let loteId = reg.lote_id;
    if (!loteId && reg.lote_id_local) {
      const loteLocal = await dbLocal.recepcion_prod.get(reg.lote_id_local);
      if (loteLocal?.id) {
        loteId = loteLocal.id;
        await dbLocal.diario_aves_prod.update(reg.id_local, { lote_id: loteId });
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

    const result = reg.id
      ? await supabase.from('diario_aves_prod').update(payload).eq('id', reg.id).select()
      : await supabase.from('diario_aves_prod').insert([payload]).select();

    if (result.error) {
      await dbLocal.diario_aves_prod.update(reg.id_local, { estado_sync: 'error' });
    } else if (result.data?.[0]) {
      await dbLocal.diario_aves_prod.update(reg.id_local, {
        id: result.data[0].id,
        estado_sync: 'sincronizado',
      });
    }
  }
}

async function syncSalidasIncubacion() {
  if (!dbLocal) return;
  const pendientes = await dbLocal.salidas_incubacion.where('estado_sync').equals('pendiente').toArray();

  for (const reg of pendientes) {
    let loteId = reg.lote_id;
    if (!loteId && reg.lote_id_local) {
      const loteLocal = await dbLocal.recepcion_prod.get(reg.lote_id_local);
      if (loteLocal?.id) {
        loteId = loteLocal.id;
        await dbLocal.salidas_incubacion.update(reg.id_local, { lote_id: loteId });
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

    const result = reg.id
      ? await supabase.from('salidas_incubacion').update(payload).eq('id', reg.id).select()
      : await supabase.from('salidas_incubacion').insert([payload]).select();

    if (result.error) {
      await dbLocal.salidas_incubacion.update(reg.id_local, { estado_sync: 'error' });
    } else if (result.data?.[0]) {
      await dbLocal.salidas_incubacion.update(reg.id_local, {
        id: result.data[0].id,
        estado_sync: 'sincronizado',
      });
    }
  }
}
