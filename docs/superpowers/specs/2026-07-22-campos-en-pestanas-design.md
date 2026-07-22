# Campos en pestañas (tipo navegador) — Diseño

Fecha: 2026-07-22

## Objetivo

Permitir trabajar con **varios campos de vóley independientes** dentro de la misma app,
navegables mediante una **barra de pestañas tipo Chrome**. Cada pestaña es un campo
completamente independiente (jugadores, orientación, vista y banquillo propios). Al
cambiar de pestaña solo se intercambia el campo; la barra de pestañas permanece fija.

Se puede **crear un campo vacío** (sin jugadores) o **duplicar** el campo actual.

## Estado actual

App de una sola página (React + Vite + Tailwind). Todo el estado del campo vive en
`src/App.jsx` y se persiste en `localStorage` con claves sueltas:

- `vb.orientation` — `'horizontal' | 'vertical'`
- `vb.view` — `'full' | 'a' | 'b'`
- `vb.players` — array de jugadores/balones
- `vb.benchOpen` — booleano

Un "campo" = ese conjunto de estado.

## Modelo de datos

Un campo se representa como un único objeto:

```js
board = {
  id: string,          // id único
  name: string,        // "Campo 1", editable
  orientation: 'horizontal' | 'vertical',
  view: 'full' | 'a' | 'b',
  benchOpen: boolean,
  players: Player[],   // mismo shape que hoy
}
```

Estado global de la app:

```js
boards: Board[]     // al menos 1 siempre
activeId: string    // id del campo activo
```

Persistencia en `localStorage` con claves nuevas versionadas:

- `vb.boards` — array de boards
- `vb.activeId` — id activo

## Migración

Al arrancar, si no existe `vb.boards` pero existen las claves antiguas (`vb.players`,
`vb.orientation`, `vb.view`, `vb.benchOpen`), se construye un único board "Campo 1"
con esos valores (aplicando la migración de jugadores ya existente, `migratePlayers`).
Si no hay nada, se arranca con un board vacío "Campo 1". Así no se pierde el trabajo
actual del usuario. Las claves antiguas pueden quedar como están (se ignoran una vez
migradas) o limpiarse; se dejarán intactas para no romper una posible vuelta atrás.

## Arquitectura de componentes

Separación limpia por responsabilidad:

### `App.jsx` — shell / gestor de la colección
- Mantiene `boards` y `activeId` (persistidos).
- Operaciones de pestaña:
  - `newBoard()` → crea campo vacío y lo activa.
  - `duplicateBoard(id)` → copia profunda del board con **ids de jugadores regenerados**
    y nombre "Copia de …" o "… (2)"; lo activa.
  - `closeBoard(id)` → cierra con confirmación si tiene jugadores; garantiza ≥1 board.
  - `renameBoard(id, name)` → renombra.
  - `setActive(id)` → cambia de pestaña.
  - `updateBoard(id, fn)` → aplica un updater al board (usado por BoardView).
- Renderiza `<TabBar>` (fija) + `<BoardView key={activeId}>` del board activo.

### `TabBar.jsx` (nuevo)
- Lista de pestañas con nombre y botón `✕`.
- Pestaña activa resaltada; clic cambia de campo.
- Doble clic en el nombre → edición inline (input) → Enter/blur confirma, Esc cancela.
- Botón `+` con menú desplegable: **Nuevo vacío** / **Duplicar actual**.
- Contador opcional de jugadores por pestaña (nice-to-have, no bloqueante).

### `BoardView.jsx` (nuevo)
- Recibe `board` y `update(fn)` (updater ligado al board activo).
- Contiene **todo lo que hoy vive en `main` + `footer` + acciones de campo** de App:
  - Barra de acciones del campo: segmentado Completo/A/B, botón orientación,
    `+ Jugador`, `+ Balón`, `🗑` (borrar todo el campo).
  - Área del campo (`<Court>` + fichas `<Piece>`), popover "añadir aquí".
  - Banquillos por lado (`BenchColumn` / `BenchChip`) — se mueven aquí desde App.
- Mantiene su **estado de UI local**: `selectedId`, `benchSelId`, `modal`, `notice`,
  `courtMenu`, `pendingPos`, estados "hot" de arrastre, refs de medición.
- Deriva `setPlayers(updater)` a partir de `update` para reutilizar la lógica actual
  (`handleMove`, `swap`, `swapCourt`, `benchDrag*`, etc.) casi sin cambios.
- Al remontarse por cambio de `key={activeId}`, su estado de UI local se resetea limpio;
  los jugadores persisten porque viven en `boards` (en App).

Layout de arriba a abajo:
1. `TabBar` (global, fija)
2. Barra de acciones del campo (dentro de BoardView)
3. Campo
4. Banquillo

## Flujo de datos

- El estado duradero (jugadores, orientación, vista, banquillo) vive en `App.boards`.
- `BoardView` nunca guarda estado duradero propio: todo cambio pasa por `update(fn)`,
  que en App hace `setBoards(bs => bs.map(b => b.id === activeId ? fn(b) : b))`.
- El estado efímero de interacción (selección, arrastre, modal) es local a `BoardView`.

## Operaciones clave (detalle)

- **Nuevo vacío**: `{ id, name: siguiente "Campo N", orientation: 'horizontal',
  view: 'full', benchOpen: true, players: [] }`.
- **Duplicar**: copia profunda del board activo; cada player recibe un `id` nuevo;
  se conservan posiciones, colores, fotos, banquillo y ajustes. Nombre derivado.
- **Cerrar**: si `players.length > 0`, `window.confirm`. Nunca deja `boards` vacío;
  si se cierra el activo, se activa el vecino.
- **Renombrar**: nombre no vacío; si vacío, se revierte al anterior.

## Generación de ids

Se reutiliza `useIdFactory` (o un helper equivalente) para ids de board y para
regenerar ids de jugadores al duplicar. Debe garantizar unicidad dentro de la sesión.

## Manejo de errores / bordes

- `localStorage` no disponible o corrupto → se cae a un board vacío por defecto
  (igual que hoy `useLocalStorage` ignora errores).
- `activeId` que no existe en `boards` (datos corruptos) → se activa el primer board.
- Cerrar la última pestaña está deshabilitado / no permitido.

## Testing / verificación

El proyecto no tiene framework de tests instalado. Estrategia:

- **Verificación manual** en el dev server (`npm run dev`) recorriendo: crear vacío,
  duplicar, cambiar entre pestañas, renombrar, cerrar con/sin jugadores, recargar
  (persistencia + migración desde claves antiguas).
- **Tests unitarios ligeros opcionales** para funciones puras nuevas (migración
  legacy→boards y duplicado con regeneración de ids) si se decide añadir un runner
  mínimo; no bloquean la entrega.

## Fuera de alcance (YAGNI)

- Reordenar pestañas por arrastre.
- Pestañas reales del navegador (window.open / URLs por campo).
- Sincronización entre múltiples ventanas/dispositivos.
- Import/export de campos a fichero.
