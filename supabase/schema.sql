-- ============================================================================
--  Granja Avícola PWA — Esquema completo de Supabase
-- ----------------------------------------------------------------------------
--  Cómo usar:
--    1. Abre Supabase → SQL Editor → New query.
--    2. Pega TODO este archivo y ejecútalo (Run).
--    3. Es idempotente: puedes volver a ejecutarlo sin romper nada.
--
--  Qué hace:
--    • Crea las tablas MAESTRAS (granjas, galpones) con datos semilla.
--    • (Re)crea las tablas OPERATIVAS con el esquema correcto que espera la app.
--    • Activa RLS y permite todo a usuarios autenticados (login Supabase).
-- ============================================================================

-- ─── Extensiones ────────────────────────────────────────────────────────────
create extension if not exists "pgcrypto";   -- para gen_random_uuid()

-- ============================================================================
--  1. TABLAS MAESTRAS
-- ============================================================================

create table if not exists public.granjas (
  id          text primary key,                 -- ej. 'granja-1'
  nombre      text not null,
  activo      boolean not null default true,
  creado_en   timestamptz not null default now()
);

create table if not exists public.galpones (
  id          text primary key,                 -- ej. 'g1-1'
  granja_id   text not null references public.granjas(id) on delete cascade,
  nombre      text not null,
  activo      boolean not null default true,
  creado_en   timestamptz not null default now()
);

create index if not exists idx_galpones_granja on public.galpones(granja_id);

-- ─── Datos semilla (coinciden con src/lib/granjas-config.ts) ─────────────────
insert into public.granjas (id, nombre) values
  ('granja-1', 'Granja La Principal'),
  ('granja-2', 'Granja La Esperanza')
on conflict (id) do update set nombre = excluded.nombre;

insert into public.galpones (id, granja_id, nombre) values
  ('g1-1', 'granja-1', 'Galpón 1'),
  ('g1-2', 'granja-1', 'Galpón 2'),
  ('g1-3', 'granja-1', 'Galpón 3'),
  ('g1-4', 'granja-1', 'Galpón 4'),
  ('g2-1', 'granja-2', 'Galpón A'),
  ('g2-2', 'granja-2', 'Galpón B'),
  ('g2-3', 'granja-2', 'Galpón C')
on conflict (id) do update
  set granja_id = excluded.granja_id, nombre = excluded.nombre;

-- ============================================================================
--  2. TABLAS OPERATIVAS — MÓDULO 1: CRÍA Y LEVANTE
-- ============================================================================

create table if not exists public.recepcion_cria (
  id            uuid primary key default gen_random_uuid(),
  id_local      text unique not null,
  fecha         date not null,
  granja        text,
  galpon        text,
  codigo_lote   text,
  cant_hembras  integer not null default 0,
  cant_machos   integer not null default 0,
  usuario_email text,
  activo        boolean not null default true,   -- Activo / Inactivo en Cría y Levante
  creado_en     timestamptz not null default now()
);

create table if not exists public.diario_cria (
  id                     uuid primary key default gen_random_uuid(),
  id_local               text unique not null,
  lote_id                uuid references public.recepcion_cria(id) on delete cascade,
  fecha                  date not null,
  sexo                   text check (sexo in ('H','M')),
  mortalidad             integer not null default 0,
  peso_promedio          numeric,
  porcentaje_uniformidad numeric,
  descarte               integer not null default 0,
  alimento               numeric not null default 0,
  creado_en              timestamptz not null default now()
);

-- ============================================================================
--  3. TABLAS OPERATIVAS — MÓDULO 2: PRODUCCIÓN
-- ============================================================================

create table if not exists public.recepcion_prod (
  id                uuid primary key default gen_random_uuid(),
  id_local          text unique not null,
  fecha             date not null,
  granja            text,
  galpon            text,
  codigo_lote       text,
  cant_hembras      integer not null default 0,
  machos_produccion integer not null default 0,
  machos_reemplazo  integer not null default 0,
  usuario_email     text,
  creado_en         timestamptz not null default now()
);

create table if not exists public.diario_huevos (
  id                  uuid primary key default gen_random_uuid(),
  id_local            text unique not null,
  lote_id             uuid references public.recepcion_prod(id) on delete cascade,
  fecha               date not null,
  huevos_recolectados integer not null default 0,
  comerciales         integer not null default 0,
  descartados         integer not null default 0,
  creado_en           timestamptz not null default now()
);

create table if not exists public.diario_aves_prod (
  id                    uuid primary key default gen_random_uuid(),
  id_local              text unique not null,
  lote_id               uuid references public.recepcion_prod(id) on delete cascade,
  fecha                 date not null,
  sexo                  text check (sexo in ('H','M')),
  mortalidad            integer not null default 0,
  descarte              integer not null default 0,
  alimento              numeric not null default 0,
  lote_origen_reemplazo text,
  creado_en             timestamptz not null default now()
);

create table if not exists public.salidas_incubacion (
  id                uuid primary key default gen_random_uuid(),
  id_local          text unique not null,
  lote_id           uuid references public.recepcion_prod(id) on delete cascade,
  fecha             date not null,
  clasificacion     text,
  cant_cestas       integer not null default 0,
  cant_separadores  integer not null default 0,
  unidades_sueltas  integer not null default 0,
  creado_en         timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
--  Reparación: si las tablas ya existían con un esquema viejo, añade columnas
--  faltantes sin perder datos. (Seguro de re-ejecutar.)
-- ----------------------------------------------------------------------------
alter table public.recepcion_cria  add column if not exists granja        text;
alter table public.recepcion_cria  add column if not exists galpon        text;
alter table public.recepcion_cria  add column if not exists codigo_lote   text;
alter table public.recepcion_cria  add column if not exists usuario_email text;
alter table public.recepcion_cria  add column if not exists activo        boolean not null default true;

-- ----------------------------------------------------------------------------
--  Restricción UNIQUE en id_local (imprescindible para el upsert/onConflict).
--  Si la tabla ya existía con un esquema viejo, puede faltarle. El índice único
--  es idempotente y PostgREST lo usa para resolver ON CONFLICT.
--  Nota: si una tabla tuviera id_local duplicados, primero hay que limpiarlos.
-- ----------------------------------------------------------------------------
create unique index if not exists recepcion_cria_id_local_key      on public.recepcion_cria(id_local);
create unique index if not exists diario_cria_id_local_key         on public.diario_cria(id_local);
create unique index if not exists recepcion_prod_id_local_key      on public.recepcion_prod(id_local);
create unique index if not exists diario_huevos_id_local_key       on public.diario_huevos(id_local);
create unique index if not exists diario_aves_prod_id_local_key    on public.diario_aves_prod(id_local);
create unique index if not exists salidas_incubacion_id_local_key  on public.salidas_incubacion(id_local);

-- ============================================================================
--  4. ROW LEVEL SECURITY
--     La app inicia sesión con Supabase Auth → los usuarios logueados tienen
--     rol 'authenticated'. Les damos acceso total; el rol 'anon' no entra.
-- ============================================================================
do $$
declare t text;
begin
  foreach t in array array[
    'granjas','galpones',
    'recepcion_cria','diario_cria',
    'recepcion_prod','diario_huevos','diario_aves_prod','salidas_incubacion'
  ]
  loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists "auth_all_%1$s" on public.%1$I;', t);
    execute format(
      'create policy "auth_all_%1$s" on public.%1$I
         for all to authenticated using (true) with check (true);', t);
  end loop;
end $$;

-- Listo. ✅
