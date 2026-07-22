# Campos en pestañas — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convertir la app de un solo campo en una colección de campos independientes navegables por pestañas tipo navegador, con crear-vacío y duplicar.

**Architecture:** El estado duradero (jugadores, orientación, vista, banquillo) pasa de claves sueltas en `localStorage` a un array de objetos `board`. `App.jsx` se convierte en un shell que gestiona la colección (`boards[]` + `activeId`) y renderiza una `TabBar` fija más un `BoardView` del campo activo (con `key={activeId}` para remontaje limpio). Toda la lógica actual del campo se mueve a `BoardView`, que opera sobre su board vía un updater `update(fn)`.

**Tech Stack:** React 18, Vite 6, Tailwind 3. Vitest (nuevo, solo para las funciones puras de `boards.js`).

## Global Constraints

- Idioma de la UI: español (copys existentes se mantienen).
- Siempre debe existir **≥1 pestaña**; no se puede cerrar la última.
- Orientación, vista y banquillo son **por campo** (independientes).
- Duplicar regenera **todos los ids de jugador**.
- Persistencia en `localStorage`: `vb.boards` (array) y `vb.activeId` (string).
- Migración automática desde claves antiguas (`vb.players`, `vb.orientation`, `vb.view`, `vb.benchOpen`) → un board "Campo 1". No borrar las claves antiguas.
- Shape de `player` sin cambios respecto al actual.

---

### Task 1: Módulo de dominio `boards.js` (funciones puras + tests)

**Files:**
- Create: `src/boards.js`
- Create: `src/boards.test.js`
- Modify: `package.json` (añadir `vitest` y script `test`)
- Modify: `vite.config.js` (habilitar entorno de test si hace falta)

**Interfaces:**
- Produces:
  - `makeId(): string` — id único (`Date.now`+contador).
  - `createEmptyBoard(id: string, name: string): Board` — `{ id, name, orientation:'horizontal', view:'full', benchOpen:true, players:[] }`.
  - `nextBoardName(boards: Board[]): string` — devuelve `"Campo N"` con N = menor entero ≥1 no usado con ese patrón (fallback `boards.length+1`).
  - `duplicateBoard(board: Board, name: string, makeIdFn: ()=>string): Board` — copia profunda; cada `player.id` reemplazado por `makeIdFn()`; nuevo `id` de board vía `makeIdFn()`.
  - `getInitialState(): { boards: Board[], activeId: string }` — lee `localStorage`, migra legacy si procede, garantiza ≥1 board y un `activeId` válido.
- Consumes: `migratePlayers` de `./court.js`.

- [ ] **Step 1: Instalar vitest y añadir script**

Run:
```bash
npm install -D vitest
```
Luego editar `package.json` `scripts` para añadir:
```json
"test": "vitest run"
```

- [ ] **Step 2: Escribir el test que falla**

Crear `src/boards.test.js`:
```js
import { describe, it, expect } from 'vitest'
import { createEmptyBoard, nextBoardName, duplicateBoard, makeId } from './boards.js'

describe('createEmptyBoard', () => {
  it('crea un campo sin jugadores con defaults', () => {
    const b = createEmptyBoard('id1', 'Campo 1')
    expect(b).toMatchObject({
      id: 'id1', name: 'Campo 1', orientation: 'horizontal', view: 'full', benchOpen: true,
    })
    expect(b.players).toEqual([])
  })
})

describe('nextBoardName', () => {
  it('devuelve el primer hueco "Campo N" libre', () => {
    const boards = [{ name: 'Campo 1' }, { name: 'Campo 3' }]
    expect(nextBoardName(boards)).toBe('Campo 2')
  })
  it('empieza en Campo 1 si no hay ninguno', () => {
    expect(nextBoardName([])).toBe('Campo 1')
  })
})

describe('duplicateBoard', () => {
  it('copia jugadores con ids nuevos y no comparte referencias', () => {
    const src = {
      id: 'a', name: 'Campo 1', orientation: 'vertical', view: 'a', benchOpen: false,
      players: [{ id: 'p1', name: 'Ana', side: 'a', d: 0.5, s: 0.5 }],
    }
    let n = 0
    const mk = () => `new${++n}`
    const dup = duplicateBoard(src, 'Campo 2', mk)
    expect(dup.id).not.toBe('a')
    expect(dup.name).toBe('Campo 2')
    expect(dup.orientation).toBe('vertical')
    expect(dup.players[0].id).not.toBe('p1')
    expect(dup.players[0].name).toBe('Ana')
    // independencia: mutar copia no afecta original
    dup.players[0].name = 'X'
    expect(src.players[0].name).toBe('Ana')
  })
})

describe('makeId', () => {
  it('genera ids distintos', () => {
    expect(makeId()).not.toBe(makeId())
  })
})
```

- [ ] **Step 3: Ejecutar test y verificar que falla**

Run: `npm test`
Expected: FAIL — `boards.js` no existe / exports indefinidos.

- [ ] **Step 4: Implementar `src/boards.js`**

```js
import { migratePlayers } from './court.js'

let _n = 0
export function makeId() {
  _n += 1
  return `${Date.now().toString(36)}-${_n.toString(36)}`
}

export function createEmptyBoard(id, name) {
  return { id, name, orientation: 'horizontal', view: 'full', benchOpen: true, players: [] }
}

export function nextBoardName(boards) {
  const used = new Set(
    boards
      .map((b) => /^Campo (\d+)$/.exec(b.name || ''))
      .filter(Boolean)
      .map((m) => Number(m[1])),
  )
  let n = 1
  while (used.has(n)) n += 1
  return `Campo ${n}`
}

export function duplicateBoard(board, name, makeIdFn) {
  return {
    id: makeIdFn(),
    name,
    orientation: board.orientation,
    view: board.view,
    benchOpen: board.benchOpen,
    players: (board.players || []).map((p) => ({ ...p, id: makeIdFn() })),
  }
}

// Normaliza un board leído de disco: rellena defaults y migra jugadores antiguos
function ensureBoard(b) {
  const players = Array.isArray(b.players) ? b.players : []
  const needs = players.some((p) => !p.side || typeof p.d !== 'number')
  return {
    id: b.id || makeId(),
    name: b.name || 'Campo 1',
    orientation: b.orientation === 'vertical' ? 'vertical' : 'horizontal',
    view: b.view === 'a' || b.view === 'b' ? b.view : 'full',
    benchOpen: b.benchOpen !== false,
    players: needs ? migratePlayers(players) : players,
  }
}

function readLegacy() {
  try {
    const raw = localStorage.getItem('vb.players')
    if (raw == null) return null
    const players = JSON.parse(raw) || []
    const get = (k, d) => {
      try {
        const v = localStorage.getItem(k)
        return v != null ? JSON.parse(v) : d
      } catch {
        return d
      }
    }
    return ensureBoard({
      id: makeId(),
      name: 'Campo 1',
      orientation: get('vb.orientation', 'horizontal'),
      view: get('vb.view', 'full'),
      benchOpen: get('vb.benchOpen', true),
      players,
    })
  } catch {
    return null
  }
}

function loadBoards() {
  try {
    const raw = localStorage.getItem('vb.boards')
    if (raw) {
      const arr = JSON.parse(raw)
      if (Array.isArray(arr) && arr.length) return arr.map(ensureBoard)
    }
  } catch {
    /* corrupto: caemos abajo */
  }
  const legacy = readLegacy()
  if (legacy) return [legacy]
  return [createEmptyBoard(makeId(), 'Campo 1')]
}

export function getInitialState() {
  const boards = loadBoards()
  let activeId
  try {
    activeId = JSON.parse(localStorage.getItem('vb.activeId'))
  } catch {
    activeId = null
  }
  if (!boards.some((b) => b.id === activeId)) activeId = boards[0].id
  return { boards, activeId }
}
```

- [ ] **Step 5: Ejecutar test y verificar que pasa**

Run: `npm test`
Expected: PASS (4 suites verdes).

- [ ] **Step 6: Commit**

```bash
git add src/boards.js src/boards.test.js package.json package-lock.json vite.config.js
git commit -m "feat: módulo boards con creación, duplicado, nombres y carga/migración

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Extraer `BoardView.jsx` (paridad de un solo campo)

Mover toda la lógica y UI del campo desde `App.jsx` a un nuevo `BoardView.jsx` que recibe `board` + `update`. `App.jsx` queda temporalmente renderizando **un solo board** cargado desde `boards.js`, sin pestañas todavía. Objetivo: la app funciona **idéntica** a hoy.

**Files:**
- Create: `src/BoardView.jsx`
- Modify: `src/App.jsx` (se reduce a shell temporal)

**Interfaces:**
- Consumes: `getInitialState` de `./boards.js`.
- Produces: `BoardView({ board, update })` — componente por defecto. `update(fn: (Board)=>Board): void` aplica un cambio inmutable al board.

- [ ] **Step 1: Crear `src/BoardView.jsx`**

Contenido: copiar el cuerpo actual de `App.jsx` (todo lo de `src/App.jsx:28`–`src/App.jsx:665`, es decir la función `App` y los componentes auxiliares `BenchColumn` y `BenchChip`) a `BoardView.jsx` con estas modificaciones exactas:

1. Copiar tal cual los imports actuales de `App.jsx:1`–`15` **salvo** que ya no se importan `Court`... espera: sí se siguen usando. Mantener todos los imports EXCEPTO añadir/quitar según abajo. Mantener: `Court`, `Piece`, `PlayerModal`, `useElementSize`, `useIdFactory`, y todo lo de `./court.js`. **Quitar** `useLocalStorage` del import de `./hooks.js`.

2. Renombrar la función exportada y cambiar su firma:
```js
export default function BoardView({ board, update }) {
```

3. Sustituir las 4 líneas de estado con `useLocalStorage` (`App.jsx:29`–`32`) por lectura del board + setters derivados:
```js
  const { orientation, view, benchOpen, players } = board
  const setOrientation = (v) =>
    update((b) => ({ ...b, orientation: typeof v === 'function' ? v(b.orientation) : v }))
  const setView = (v) => update((b) => ({ ...b, view: typeof v === 'function' ? v(b.view) : v }))
  const setBenchOpen = (v) =>
    update((b) => ({ ...b, benchOpen: typeof v === 'function' ? v(b.benchOpen) : v }))
  const setPlayers = (v) =>
    update((b) => ({ ...b, players: typeof v === 'function' ? v(b.players) : v }))
```
Todo el resto del cuerpo usa `orientation`, `view`, `benchOpen`, `players`, `setOrientation`, `setView`, `setBenchOpen`, `setPlayers` con la MISMA API (incluyendo updaters funcionales), así que no requiere más cambios.

4. **Eliminar** el `useEffect` de migración de jugadores (`App.jsx:51`–`56`): la migración ya ocurre en `boards.js` al cargar.

5. Envolver el JSX devuelto en un contenedor que llene el espacio bajo la barra de pestañas. Cambiar el `<div>` raíz actual (`App.jsx:349`) de:
```jsx
<div className="flex h-full w-full flex-col bg-ink text-txt">
```
a:
```jsx
<div className="flex min-h-0 flex-1 flex-col bg-ink text-txt">
```

6. Copiar `BenchColumn` y `BenchChip` (y su helper `textColorFor` y `DEFAULT_COLORS` de `App.jsx:17`–`26`) al final de `BoardView.jsx` sin cambios.

- [ ] **Step 2: Reducir `src/App.jsx` al shell temporal**

Reemplazar TODO el contenido de `src/App.jsx` por:
```jsx
import { useEffect, useState } from 'react'
import BoardView from './BoardView.jsx'
import { getInitialState } from './boards.js'

export default function App() {
  const [{ boards: initBoards, activeId: initActive }] = useState(getInitialState)
  const [boards, setBoards] = useState(initBoards)
  const [activeId] = useState(initActive)

  useEffect(() => {
    try {
      localStorage.setItem('vb.boards', JSON.stringify(boards))
    } catch {
      /* noop */
    }
  }, [boards])

  const active = boards.find((b) => b.id === activeId) || boards[0]
  const update = (fn) =>
    setBoards((bs) => bs.map((b) => (b.id === active.id ? fn(b) : b)))

  return (
    <div className="flex h-full w-full flex-col bg-ink text-txt">
      <BoardView key={active.id} board={active} update={update} />
    </div>
  )
}
```

- [ ] **Step 3: Verificar paridad en el navegador**

Run: `npm run dev`
Comprobar manualmente que la app se comporta igual que antes:
- Los jugadores existentes (si los había en `localStorage`) aparecen (migración legacy OK).
- Añadir jugador, añadir balón, mover fichas, banquillo (arrastrar/intercambiar), cambiar Completo/A/B, rotar orientación, borrar todo.
- Recargar la página: el estado persiste (ahora bajo `vb.boards`).
Expected: sin regresiones visuales ni funcionales.

- [ ] **Step 4: Verificar build**

Run: `npm run build`
Expected: build sin errores.

- [ ] **Step 5: Commit**

```bash
git add src/App.jsx src/BoardView.jsx
git commit -m "refactor: extraer BoardView y mover estado del campo a boards

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: `TabBar.jsx` + colección de campos (feature completa)

Añadir la barra de pestañas y las operaciones de colección en `App.jsx`: cambiar, nuevo vacío, duplicar, cerrar (con confirmación y ≥1), renombrar, y persistir `activeId`.

**Files:**
- Create: `src/TabBar.jsx`
- Modify: `src/App.jsx`

**Interfaces:**
- Consumes: `createEmptyBoard`, `duplicateBoard`, `nextBoardName`, `makeId` de `./boards.js`.
- Produces: `TabBar({ boards, activeId, onSelect, onNew, onDuplicate, onClose, onRename })`.
  - `onSelect(id)`, `onNew()`, `onDuplicate()`, `onClose(id)`, `onRename(id, name)`.

- [ ] **Step 1: Crear `src/TabBar.jsx`**

```jsx
import { useEffect, useRef, useState } from 'react'

export default function TabBar({ boards, activeId, onSelect, onNew, onDuplicate, onClose, onRename }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const menuRef = useRef(null)

  useEffect(() => {
    if (!menuOpen) return
    const close = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    window.addEventListener('pointerdown', close)
    return () => window.removeEventListener('pointerdown', close)
  }, [menuOpen])

  return (
    <div className="flex items-stretch gap-1 border-b border-hairline bg-panel/90 px-2 pt-1.5 backdrop-blur">
      <div className="thin-scroll flex min-w-0 flex-1 items-stretch gap-1 overflow-x-auto">
        {boards.map((b) => {
          const active = b.id === activeId
          return (
            <div
              key={b.id}
              onPointerDown={() => onSelect(b.id)}
              onDoubleClick={() => setEditingId(b.id)}
              className={`group flex shrink-0 cursor-pointer items-center gap-1.5 rounded-t-md px-3 py-1.5 text-sm transition-colors ${
                active
                  ? 'bg-ink text-txt ring-1 ring-hairline ring-b-0'
                  : 'bg-elev text-muted hover:bg-elevh hover:text-txt'
              }`}
            >
              {editingId === b.id ? (
                <input
                  autoFocus
                  defaultValue={b.name}
                  onPointerDown={(e) => e.stopPropagation()}
                  onBlur={(e) => {
                    const v = e.target.value.trim()
                    if (v) onRename(b.id, v)
                    setEditingId(null)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') e.currentTarget.blur()
                    if (e.key === 'Escape') setEditingId(null)
                  }}
                  className="w-24 rounded bg-elevh px-1 text-sm text-txt outline-none ring-1 ring-accent"
                />
              ) : (
                <span className="max-w-[140px] truncate">{b.name}</span>
              )}
              {boards.length > 1 && (
                <button
                  onPointerDown={(e) => {
                    e.stopPropagation()
                    onClose(b.id)
                  }}
                  className="flex h-4 w-4 items-center justify-center rounded-full text-[11px] text-muted opacity-60 transition hover:bg-danger hover:text-white hover:opacity-100"
                  aria-label={`Cerrar ${b.name}`}
                >
                  ✕
                </button>
              )}
            </div>
          )
        })}
      </div>

      <div ref={menuRef} className="relative flex items-center">
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="flex h-8 w-8 items-center justify-center rounded bg-elev text-lg text-muted ring-1 ring-hairline transition-colors hover:bg-elevh hover:text-txt"
          title="Nuevo campo"
        >
          +
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-full z-50 mt-1 w-44 overflow-hidden rounded-md bg-panel py-1 shadow-xl ring-1 ring-hairline">
            <button
              onClick={() => {
                setMenuOpen(false)
                onNew()
              }}
              className="block w-full px-3 py-2 text-left text-sm text-txt transition-colors hover:bg-white/5"
            >
              Nuevo vacío
            </button>
            <button
              onClick={() => {
                setMenuOpen(false)
                onDuplicate()
              }}
              className="block w-full px-3 py-2 text-left text-sm text-txt transition-colors hover:bg-white/5"
            >
              Duplicar actual
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
```
Nota: `ring-b-0` no es una clase Tailwind estándar; sustituir por simplemente no cerrar el borde inferior — usar `ring-1 ring-hairline` en la activa y aceptar el borde. Si molesta visualmente, ajustar en verificación. (Mantener el plan simple; el pulido visual es parte del Step 3.)

- [ ] **Step 2: Ampliar `src/App.jsx` con la colección y la TabBar**

Reemplazar TODO el contenido de `src/App.jsx` por:
```jsx
import { useEffect, useState } from 'react'
import TabBar from './TabBar.jsx'
import BoardView from './BoardView.jsx'
import { getInitialState, createEmptyBoard, duplicateBoard, nextBoardName, makeId } from './boards.js'

export default function App() {
  const [initial] = useState(getInitialState)
  const [boards, setBoards] = useState(initial.boards)
  const [activeId, setActiveId] = useState(initial.activeId)

  useEffect(() => {
    try {
      localStorage.setItem('vb.boards', JSON.stringify(boards))
    } catch {
      /* noop */
    }
  }, [boards])

  useEffect(() => {
    try {
      localStorage.setItem('vb.activeId', JSON.stringify(activeId))
    } catch {
      /* noop */
    }
  }, [activeId])

  const active = boards.find((b) => b.id === activeId) || boards[0]

  const update = (fn) => setBoards((bs) => bs.map((b) => (b.id === active.id ? fn(b) : b)))

  const newBoard = () => {
    const b = createEmptyBoard(makeId(), nextBoardName(boards))
    setBoards((bs) => [...bs, b])
    setActiveId(b.id)
  }

  const duplicate = () => {
    const b = duplicateBoard(active, nextBoardName(boards), makeId)
    setBoards((bs) => [...bs, b])
    setActiveId(b.id)
  }

  const closeBoard = (id) => {
    if (boards.length <= 1) return
    const b = boards.find((x) => x.id === id)
    if (b && b.players.length > 0 && !window.confirm(`¿Cerrar "${b.name}"? Se perderán sus jugadores.`)) return
    setBoards((bs) => {
      const idx = bs.findIndex((x) => x.id === id)
      const rest = bs.filter((x) => x.id !== id)
      if (id === activeId) {
        const next = rest[idx] || rest[idx - 1] || rest[0]
        setActiveId(next.id)
      }
      return rest
    })
  }

  const rename = (id, name) => setBoards((bs) => bs.map((b) => (b.id === id ? { ...b, name } : b)))

  return (
    <div className="flex h-full w-full flex-col bg-ink text-txt">
      <TabBar
        boards={boards}
        activeId={active.id}
        onSelect={setActiveId}
        onNew={newBoard}
        onDuplicate={duplicate}
        onClose={closeBoard}
        onRename={rename}
      />
      <BoardView key={active.id} board={active} update={update} />
    </div>
  )
}
```

- [ ] **Step 3: Verificar la feature en el navegador**

Run: `npm run dev`
Recorrer manualmente:
- Arrancar: aparece 1 pestaña "Campo 1" con los datos migrados.
- `+` → **Nuevo vacío**: nueva pestaña "Campo 2" sin jugadores, activa.
- Añadir jugadores en Campo 2; volver a Campo 1: cada uno mantiene los suyos (independencia).
- `+` → **Duplicar actual**: copia con los mismos jugadores en posiciones idénticas; mover una ficha en la copia NO afecta al original (ids independientes).
- Doble clic en el nombre → renombrar → Enter guarda, Esc cancela.
- Cambiar orientación/vista en una pestaña no afecta a las demás.
- Cerrar `✕`: con jugadores pide confirmación; sin jugadores cierra directo; la última pestaña no muestra `✕`.
- Recargar: se restauran todas las pestañas y la activa.
Expected: todo según lo descrito, sin errores en consola.

- [ ] **Step 4: Verificar build y tests**

Run: `npm run build && npm test`
Expected: build OK, tests verdes.

- [ ] **Step 5: Commit**

```bash
git add src/App.jsx src/TabBar.jsx
git commit -m "feat: barra de pestañas con crear/duplicar/cerrar/renombrar campos

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Notas de verificación final

- Confirmar que las claves antiguas (`vb.players`, etc.) siguen existiendo tras la migración (no se borran) y que `vb.boards`/`vb.activeId` se escriben.
- Confirmar que no queda ninguna referencia a `useLocalStorage` en `BoardView.jsx`.
