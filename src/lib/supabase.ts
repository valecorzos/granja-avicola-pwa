import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
	throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in environment');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    // Persistir el "carnet" (JWT + refresh token) en el navegador y
    // refrescarlo automáticamente para que sobreviva a recargas y a ratos
    // offline. Imprescindible para el flujo offline-first de la PWA.
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// En desarrollo, exponer el cliente en window para depurar desde la consola:
//   await window.supabase.auth.getSession()
//   await window.supabase.from('recepcion_cria').select()
if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
  (window as unknown as { supabase: typeof supabase }).supabase = supabase;
}

/**
 * Despierta y valida la sesión de Supabase. Si el token caducó mientras la
 * tablet estaba offline, usa el refresh token para emitir uno nuevo.
 * Devuelve true solo si hay una sesión válida lista para autorizar escrituras.
 */
export async function asegurarSesion(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    console.error('Error al recuperar la sesión de Supabase:', error.message);
    return false;
  }
  return !!data.session;
}
