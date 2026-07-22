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
