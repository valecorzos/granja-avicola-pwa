import { useEffect, useState, useCallback } from 'react';
import { supabase, asegurarSesion } from './supabase';
import { dbLocal } from './db-local';
import { MAESTRO_GRANJAS, type GranjaConfig } from './granjas-config';

// El maestro de granjas/galpones vive en Supabase (tablas `granjas` y
// `galpones`). Para que la app funcione offline, se cachea en Dexie. El
// formulario lee siempre del caché; si está vacío (primer arranque sin red)
// cae a la semilla hardcodeada de granjas-config.ts.

/** Arma el árbol granja→galpones a partir del caché de Dexie. */
async function leerMaestroLocal(): Promise<GranjaConfig[]> {
  if (!dbLocal) return MAESTRO_GRANJAS;
  const [granjas, galpones] = await Promise.all([
    dbLocal.granjas.toArray(),
    dbLocal.galpones.toArray(),
  ]);
  if (granjas.length === 0) return MAESTRO_GRANJAS;

  return granjas
    .filter((g) => g.activo)
    .map((g) => ({
      id: g.id,
      nombre: g.nombre,
      galpones: galpones
        .filter((gp) => gp.granja_id === g.id && gp.activo)
        .map((gp) => ({ id: gp.id, nombre: gp.nombre })),
    }));
}

/** Descarga el maestro desde Supabase y refresca el caché de Dexie. */
export async function sincronizarMaestro(): Promise<boolean> {
  const db = dbLocal;
  if (typeof window === 'undefined' || !navigator.onLine || !db) return false;

  // El maestro también está protegido por RLS (authenticated). Sin sesión,
  // no insistimos: la app sigue con la semilla local.
  if (!(await asegurarSesion())) return false;

  const [gRes, gpRes] = await Promise.all([
    supabase.from('granjas').select('id, nombre, activo'),
    supabase.from('galpones').select('id, granja_id, nombre, activo'),
  ]);

  const err = gRes.error ?? gpRes.error;
  if (err || !gRes.data || !gpRes.data) {
    console.error('Error al sincronizar maestro:', {
      message: err?.message,
      code: err?.code,
      details: err?.details,
      hint: err?.hint,
      raw: JSON.stringify(err),
    });
    return false;
  }

  await db.transaction('rw', db.granjas, db.galpones, async () => {
    await db.granjas.clear();
    await db.galpones.clear();
    await db.granjas.bulkPut(
      gRes.data.map((g) => ({ id: g.id, nombre: g.nombre, activo: g.activo ?? true }))
    );
    await db.galpones.bulkPut(
      gpRes.data.map((gp) => ({
        id: gp.id,
        granja_id: gp.granja_id,
        nombre: gp.nombre,
        activo: gp.activo ?? true,
      }))
    );
  });

  return true;
}

/**
 * Hook que entrega el maestro de granjas listo para los `<SelectVE>`.
 * Lee del caché local al montar e intenta refrescar desde Supabase si hay red.
 */
export function useMaestroGranjas() {
  const [granjas, setGranjas] = useState<GranjaConfig[]>(MAESTRO_GRANJAS);

  const recargar = useCallback(async () => {
    const local = await leerMaestroLocal();
    setGranjas(local);
  }, []);

  useEffect(() => {
    (async () => {
      await recargar();
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        const ok = await sincronizarMaestro();
        if (ok) await recargar();
      }
    })();
  }, [recargar]);

  return { granjas, recargar };
}
