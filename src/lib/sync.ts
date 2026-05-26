import { supabase } from './supabase';
import { dbLocal } from './db-local';

export async function sincronizarDatos() {
  if (typeof window === 'undefined' || !navigator.onLine) {
    console.log('Sincronización omitida: Sin conexión o entorno de servidor.');
    return;
  }

  if (!dbLocal) {
    console.error('Base de datos local no inicializada.');
    return;
  }

  console.log('Iniciando motor de sincronización Next.js...');

  try {
    // 1. SINCRONIZAR MAESTRO DE LOTES
    const lotesPendientes = await dbLocal.lotes.where('estado_sync').equals('pendiente').toArray();

    for (const lote of lotesPendientes) {
      console.log(`Sincronizando lote: ${lote.codigo_lote}`);

      const payload = {
        id_local: lote.id_local,
        codigo_lote: lote.codigo_lote,
        fecha_registro: lote.fecha_registro,
        fecha_llegada: lote.fecha_llegada,
        raza: lote.raza,
        cantidad_hembras: lote.cantidad_hembras,
        cantidad_machos: lote.cantidad_machos,
        ubicacion: lote.ubicacion,
        galpon: lote.galpon,
        estado: lote.estado
      };

      let result;
      if (lote.id) {
        result = await supabase.from('lotes').update(payload).eq('id', lote.id).select();
      } else {
        result = await supabase.from('lotes').insert([payload]).select();
      }

      if (result.error) {
        console.error(`Error al subir lote ${lote.codigo_lote}:`, result.error);
        await dbLocal.lotes.update(lote.id_local, { estado_sync: 'error' });
      } else if (result.data && result.data.length > 0) {
        const rowSubido = result.data[0];
        await dbLocal.lotes.update(lote.id_local, {
          id: rowSubido.id,
          estado_sync: 'sincronizado'
        });
        console.log(`Lote ${lote.codigo_lote} sincronizado con éxito. ID: ${rowSubido.id}`);
      }
    }

    // 2. SINCRONIZAR REGISTROS DIARIOS DE CRÍA Y LEVANTE
    const criaPendientes = await dbLocal.cria_levante_diario.where('estado_sync').equals('pendiente').toArray();

    for (const registro of criaPendientes) {
      console.log(`Sincronizando registro diario: fecha ${registro.fecha}, sexo ${registro.sexo}`);

      let finalLoteId = registro.lote_id;

      // Resolver ID real si es nulo
      if (!finalLoteId && registro.lote_id_local) {
        const loteLocal = await dbLocal.lotes.get(registro.lote_id_local);
        if (loteLocal && loteLocal.id) {
          finalLoteId = loteLocal.id;
          await dbLocal.cria_levante_diario.update(registro.id_local, { lote_id: finalLoteId });
        } else {
          console.warn(`Lote local ${registro.lote_id_local} aún no tiene ID de servidor. Se pospone.`);
          continue;
        }
      }

      const payload = {
        id_local: registro.id_local,
        lote_id: finalLoteId,
        fecha: registro.fecha,
        semana_ave: registro.semana_ave,
        sexo: registro.sexo,
        mortalidad: registro.mortalidad,
        consumo_alimento_kg: registro.consumo_alimento_kg
      };

      let result;
      if (registro.id) {
        result = await supabase.from('cria_levante_diario').update(payload).eq('id', registro.id).select();
      } else {
        result = await supabase.from('cria_levante_diario').insert([payload]).select();
      }

      if (result.error) {
        console.error('Error al subir registro diario de cría:', result.error);
        await dbLocal.cria_levante_diario.update(registro.id_local, { estado_sync: 'error' });
      } else if (result.data && result.data.length > 0) {
        const rowSubido = result.data[0];
        await dbLocal.cria_levante_diario.update(registro.id_local, {
          id: rowSubido.id,
          estado_sync: 'sincronizado'
        });
        console.log(`Registro diario cría sincronizado con éxito. ID: ${rowSubido.id}`);
      }
    }
  } catch (error) {
    console.error('Error general en sincronización:', error);
  }
}
