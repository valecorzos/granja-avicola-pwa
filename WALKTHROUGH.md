# Walkthrough de cambios en la barra de navegación

Este documento resume los cambios realizados para completar la implementación del nuevo `AppShell` y la navegación principal en la aplicación.

## 1. Integración del `AppShell`

- El componente `src/components/AppShell.tsx` gestiona:
  - el layout principal de la app,
  - la navegación fija en desktop (sidebar de 64px),
  - la cabecera móvil fija superior,
  - la barra de navegación inferior móvil,
  - el estado online/offline,
  - el menú de usuario con avatar, indicador de conexión y acciones.
- `AppShell` se integra en `src/components/AuthGate.tsx` para que solo las rutas protegidas rendericen el shell con la navegación.

## 2. Control de estado de conexión

- `AppShell` usa `navigator.onLine` y escucha los eventos `online` y `offline`.
- Cuando vuelve a estar online se dispara `sincronizarDatos()`.
- El estado se muestra con un indicador visual en el avatar y en el menú desplegable.

## 3. Diseño del sidebar desktop

- Sidebar fijo en `md:` y superior izquierdo con:
  - logo en la parte superior,
  - items de navegación en el centro,
  - avatar y estado de conexión en la parte inferior.
- El ancho es de `w-16` (64px) para mantener un diseño compacto.

## 4. Diseño de cabecera móvil

- Cabecera superior móvil fija con:
  - logo a la izquierda,
  - avatar y punto de conexión a la derecha.
- Dropdown móvil con estado de usuario, estado de conexión, cambio de tema y cierre de sesión.

## 5. Barra de navegación inferior móvil

- Barra fija inferior en móvil con 3 ítems principales:
  - Inicio,
  - Maestro Lotes,
  - Cría y Levante.
- Cada ítem incluye icono y texto compacto para uso rápido en dispositivos pequeños.

## 6. Ajustes en `src/app/page.tsx`

- Se eliminó la importación innecesaria de `logout` en `src/app/page.tsx`.
- Esto evita código muerto en la página principal del dashboard.

## 7. Estilos globales adicionales en `src/app/globals.css`

- Se añadieron utilidades CSS para soportar áreas seguras en móviles:
  - `.pb-safe` → `padding-bottom: env(safe-area-inset-bottom, 0px);`
  - `.pt-safe` → `padding-top: env(safe-area-inset-top, 0px);`
- Esto mejora el comportamiento de la UI en dispositivos con notch o barras de navegación del sistema.

## 8. Validación de compilación

- Se ejecutó `npx tsc --noEmit` y la compilación TypeScript pasó sin errores.

---

### Archivos clave modificados

- `src/components/AppShell.tsx`
- `src/components/AuthGate.tsx`
- `src/app/page.tsx`
- `src/app/globals.css`

### Resultado

El nuevo `AppShell` está integrado, la navegación funciona en desktop y móvil, el estado online/offline está controlado, y la app compila correctamente.
