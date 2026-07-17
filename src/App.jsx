import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Court from './Court.jsx'
import Piece from './Piece.jsx'
import PlayerModal from './PlayerModal.jsx'
import { useElementSize, useIdFactory, useLocalStorage } from './hooks.js'
import {
  clamp01,
  courtAspect,
  displayPos,
  fromFull,
  migratePlayers,
  sideFromFull,
  sideLabels,
  updatePos,
} from './court.js'

const DEFAULT_COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#8b5cf6', '#f97316', '#ec4899', '#06b6d4']

function textColorFor(hex) {
  if (!hex) return '#fff'
  const c = hex.replace('#', '')
  const r = parseInt(c.substring(0, 2), 16)
  const g = parseInt(c.substring(2, 4), 16)
  const b = parseInt(c.substring(4, 6), 16)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6 ? '#111827' : '#ffffff'
}

export default function App() {
  const [orientation, setOrientation] = useLocalStorage('vb.orientation', 'horizontal')
  const [view, setView] = useLocalStorage('vb.view', 'full') // 'full' | 'a' | 'b'
  const [players, setPlayers] = useLocalStorage('vb.players', [])
  const [benchOpen, setBenchOpen] = useLocalStorage('vb.benchOpen', true)
  const [selectedId, setSelectedId] = useState(null)
  const [benchSelId, setBenchSelId] = useState(null)
  const [modal, setModal] = useState(null)
  const [notice, setNotice] = useState('')
  const newId = useIdFactory()

  const [courtHot, setCourtHot] = useState(false) // campo resaltado al arrastrar un chip del banquillo
  const [benchColHot, setBenchColHot] = useState(null) // columna destino resaltada: 'a' | 'b' | null
  const [courtMenu, setCourtMenu] = useState(null) // popover "añadir aquí": { fx, fy, side }
  const [pendingPos, setPendingPos] = useState(null) // posición exacta para el próximo jugador: { side, d, s }
  const [areaRef, area] = useElementSize()
  const courtElRef = useRef(null)
  const benchRef = useRef(null)
  const benchColRefs = useRef({ a: null, b: null })
  const noticeTimer = useRef(null)

  const labels = sideLabels(orientation)

  useEffect(() => {
    setPlayers((prev) => {
      const needs = prev.some((p) => !p.side || typeof p.d !== 'number')
      return needs ? migratePlayers(prev) : prev
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const flash = useCallback((msg) => {
    setNotice(msg)
    if (noticeTimer.current) clearTimeout(noticeTimer.current)
    noticeTimer.current = setTimeout(() => setNotice(''), 2200)
  }, [])

  const { courtW, courtH } = useMemo(() => {
    const ar = courtAspect(orientation, view)
    const availW = Math.max(0, area.width)
    const availH = Math.max(0, area.height)
    if (!availW || !availH) return { courtW: 0, courtH: 0 }
    let w = availW
    let h = w / ar
    if (h > availH) {
      h = availH
      w = h * ar
    }
    return { courtW: Math.floor(w), courtH: Math.floor(h) }
  }, [orientation, view, area.width, area.height])

  const pieceSize = Math.max(32, Math.min(60, Math.min(courtW, courtH) * 0.13))
  const getCourtRect = useCallback(() => courtElRef.current?.getBoundingClientRect() ?? null, [])
  const getBenchRect = useCallback(() => benchRef.current?.getBoundingClientRect() ?? null, [])
  // Columna del banquillo bajo el puntero según la mitad del pie (izquierda='a', derecha='b')
  const benchSideAt = useCallback(
    (cx, cy) => {
      const r = getBenchRect()
      if (!r || cx < r.left || cx > r.right || cy < r.top || cy > r.bottom) return null
      return cx < (r.left + r.right) / 2 ? 'a' : 'b'
    },
    [getBenchRect],
  )

  const onCourt = useMemo(() => players.filter((p) => !p.bench), [players])
  const visible = useMemo(
    () => (view === 'full' ? onCourt : onCourt.filter((p) => p.side === view)),
    [onCourt, view],
  )
  const benchSel = players.find((p) => p.id === benchSelId && p.bench) || null
  const benchCount = useMemo(() => players.filter((p) => p.bench).length, [players])

  const handleMove = useCallback(
    (id, frac) => {
      setPlayers((prev) =>
        prev.map((p) => {
          if (p.id !== id) return p
          // Vista completa: la ficha se mueve libre y adopta el campo donde cae.
          if (view === 'full') {
            const side = sideFromFull(frac.x, frac.y, orientation)
            const { d, s } = fromFull(side, frac.x, frac.y, orientation)
            return { ...p, side, d, s }
          }
          // Media pista: solo hay una mitad visible, el lado se conserva.
          const { d, s } = updatePos(p.side, frac.x, frac.y, orientation, view)
          return { ...p, d, s }
        }),
      )
    },
    [setPlayers, orientation, view],
  )

  // Intercambio banquillo <-> campo (mismo lado); la ficha entrante toma la posición
  const swap = (benchId, courtId) => {
    setPlayers((prev) => {
      const court = prev.find((p) => p.id === courtId)
      if (!court) return prev
      return prev.map((p) => {
        if (p.id === courtId) return { ...p, bench: true }
        if (p.id === benchId) return { ...p, bench: false, side: court.side, d: court.d, s: court.s }
        return p
      })
    })
    setBenchSelId(null)
    setSelectedId(null)
  }

  const sendToBench = (id, side) => {
    setPlayers((prev) => prev.map((p) => (p.id === id ? { ...p, bench: true, side: side ?? p.side } : p)))
    setSelectedId(null)
  }

  // Intercambio campo <-> campo (mismo campo o distinto). Se llama en un toque
  // limpio; el arrastre nunca llega aquí.
  const swapCourt = (aId, bId) => {
    setPlayers((prev) => {
      const a = prev.find((p) => p.id === aId)
      const b = prev.find((p) => p.id === bId)
      if (!a || !b) return prev
      return prev.map((p) => {
        if (p.id === aId) return { ...p, side: b.side, d: b.d, s: b.s }
        if (p.id === bId) return { ...p, side: a.side, d: a.d, s: a.s }
        return p
      })
    })
    setSelectedId(null)
  }

  const inRect = (r, cx, cy) => !!r && cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom

  // Columna del banquillo bajo el puntero ('a' | 'b' | null)
  const benchColAt = useCallback((cx, cy) => {
    for (const s of ['a', 'b']) {
      if (inRect(benchColRefs.current[s]?.getBoundingClientRect(), cx, cy)) return s
    }
    return null
  }, [])

  // Arrastrar un chip del banquillo: hacia el campo o hacia la otra columna
  const benchDragMove = useCallback(
    (cx, cy, fromSide) => {
      if (inRect(getCourtRect(), cx, cy)) {
        setCourtHot(true)
        setBenchColHot(null)
        return
      }
      setCourtHot(false)
      const col = benchColAt(cx, cy)
      setBenchColHot(col && col !== fromSide ? col : null)
    },
    [getCourtRect, benchColAt],
  )

  const benchDragEnd = useCallback(
    (id, cx, cy, fromSide) => {
      setCourtHot(false)
      setBenchColHot(null)
      const r = getCourtRect()
      // Soltada en el campo -> colocar ahí
      if (inRect(r, cx, cy)) {
        const fx = clamp01((cx - r.left) / r.width)
        const fy = clamp01((cy - r.top) / r.height)
        const side = view === 'full' ? sideFromFull(fx, fy, orientation) : view
        const { d, s } = updatePos(side, fx, fy, orientation, view)
        setPlayers((prev) => prev.map((p) => (p.id === id ? { ...p, bench: false, side, d, s } : p)))
        setBenchSelId(null)
        return
      }
      // Soltada en la otra columna -> mover de banquillo (cambia de lado)
      const col = benchColAt(cx, cy)
      if (col && col !== fromSide) {
        setPlayers((prev) => prev.map((p) => (p.id === id ? { ...p, bench: true, side: col } : p)))
        setBenchSelId(null)
      }
      // En cualquier otro caso: se queda donde estaba
    },
    [getCourtRect, benchColAt, view, orientation, setPlayers],
  )

  // Toque limpio sobre una ficha del campo (no arrastre)
  const handleTapCourt = (id) => {
    setCourtMenu(null)
    // Flujo banquillo -> campo: la ficha entrante adopta el lado del jugador que sale
    if (benchSelId && benchSelId !== id) {
      swap(benchSelId, id)
      return
    }

    // Con otra ficha ya armada: intentar intercambio jugador <-> jugador
    if (selectedId && selectedId !== id) {
      const sel = players.find((p) => p.id === selectedId)
      const tgt = players.find((p) => p.id === id)
      if (sel && tgt && !sel.isBall && !tgt.isBall) {
        swapCourt(sel.id, tgt.id)
        return
      }
      // Un balón está implicado: no se intercambia, solo se selecciona lo tocado
      setSelectedId(id)
      return
    }

    // Sin nada armado (o se toca la misma): alternar selección
    setSelectedId((prev) => (prev === id ? null : id))
  }

  // Toque en el fondo del campo: colocar ficha del banquillo, deseleccionar, o menú "añadir aquí"
  const handleCourtBackground = (e) => {
    const rect = getCourtRect()
    if (!rect) return
    const fx = clamp01((e.clientX - rect.left) / rect.width)
    const fy = clamp01((e.clientY - rect.top) / rect.height)
    const side = view === 'full' ? sideFromFull(fx, fy, orientation) : view

    // Con una ficha del banquillo elegida: colocarla aquí (adopta el lado)
    if (benchSelId && benchSel) {
      e.stopPropagation()
      const { d, s } = updatePos(side, fx, fy, orientation, view)
      setPlayers((prev) => prev.map((p) => (p.id === benchSelId ? { ...p, bench: false, side, d, s } : p)))
      setBenchSelId(null)
      return
    }

    // Con una ficha del campo seleccionada: un toque en vacío la deselecciona
    if (selectedId) {
      setSelectedId(null)
      setCourtMenu(null)
      return
    }

    // Sin nada armado: alternar el menú "añadir jugador aquí" en el punto tocado
    setCourtMenu((cur) => (cur ? null : { fx, fy, side }))
  }

  // Abrir el formulario para crear un jugador en el punto exacto del campo tocado
  const addPlayerAt = (menu) => {
    const { d, s } = updatePos(menu.side, menu.fx, menu.fy, orientation, view)
    setPendingPos({ side: menu.side, d, s })
    setCourtMenu(null)
    setModal({ mode: 'add', defaults: { placement: 'court', side: menu.side } })
  }

  const openAdd = (defaults) => {
    setPendingPos(null)
    setCourtMenu(null)
    setModal({ mode: 'add', defaults })
  }
  const openEdit = (player) => setModal({ mode: 'edit', player })

  const handleSave = (data) => {
    if (modal?.mode === 'edit') {
      setPlayers((prev) => prev.map((p) => (p.id === modal.player.id ? { ...p, ...data } : p)))
      setModal(null)
      return
    }
    const side = data.side
    const goBench = data.bench
    const color = data.color || DEFAULT_COLORS[players.length % DEFAULT_COLORS.length]
    let s, d
    if (!goBench && pendingPos && pendingPos.side === side) {
      // Colocación exacta desde el clic en el campo
      s = pendingPos.s
      d = pendingPos.d
    } else {
      // Reparto automático dentro del campo
      const sameSide = onCourt.filter((p) => p.side === side).length
      s = Math.min(0.92, Math.max(0.08, 0.5 + ((sameSide % 3) - 1) * 0.22))
      d = Math.min(0.92, Math.max(0.08, 0.45 + Math.floor(sameSide / 3) * 0.14))
    }
    setPlayers((prev) => [
      ...prev,
      {
        id: newId(),
        name: data.name,
        label: data.label,
        color,
        photo: data.photo,
        position: data.position || '',
        side,
        bench: goBench,
        s,
        d,
      },
    ])
    setPendingPos(null)
    setModal(null)
  }

  const addBall = () => {
    const side = view === 'a' ? 'a' : 'b'
    setPlayers((prev) => [
      ...prev,
      { id: newId(), name: '', label: '', color: '#fde047', photo: null, isBall: true, side, bench: false, s: 0.5, d: 0.12 },
    ])
  }

  const handleDelete = (id) => {
    setPlayers((prev) => prev.filter((p) => p.id !== id))
    setSelectedId(null)
    if (benchSelId === id) setBenchSelId(null)
  }

  const handleClear = () => {
    if (players.length === 0) return
    if (window.confirm('¿Borrar todos los jugadores y fichas del tablero?')) {
      setPlayers([])
      setSelectedId(null)
      setBenchSelId(null)
    }
  }

  const SegBtn = ({ active, onClick, children }) => (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 text-sm font-medium transition-colors ${
        active ? 'bg-accent/15 text-accent' : 'text-muted hover:bg-white/5 hover:text-txt'
      }`}
    >
      {children}
    </button>
  )

  return (
    <div className="flex h-full w-full flex-col bg-ink text-txt">
      {/* Barra superior */}
      <header className="flex flex-wrap items-center gap-2 border-b border-hairline bg-panel/80 px-3 py-2.5 backdrop-blur">
        <h1 className="mr-2 flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-accent/15 text-accent ring-1 ring-accent/30">🏐</span>
          <span className="font-display hidden text-[15px] font-semibold tracking-tight text-txt sm:inline">
            Pizarra Vóley
          </span>
        </h1>

        <div className="flex overflow-hidden rounded bg-elev p-0.5 ring-1 ring-hairline">
          <SegBtn active={view === 'full'} onClick={() => setView('full')}>Completo</SegBtn>
          <SegBtn active={view === 'a'} onClick={() => setView('a')}>{labels.a}</SegBtn>
          <SegBtn active={view === 'b'} onClick={() => setView('b')}>{labels.b}</SegBtn>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setOrientation((o) => (o === 'vertical' ? 'horizontal' : 'vertical'))}
            className="flex items-center gap-1.5 rounded bg-elev px-3 py-1.5 text-sm font-medium text-txt ring-1 ring-hairline transition-colors hover:bg-elevh"
            title="Rotar el campo"
          >
            <span className="text-muted">⟳</span>
            <span>{orientation === 'vertical' ? 'Vertical' : 'Horizontal'}</span>
          </button>
          <button
            onClick={() => openAdd()}
            className="rounded bg-accent px-3.5 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-accenth"
          >
            + Jugador
          </button>
          <button
            onClick={addBall}
            className="rounded bg-elev px-3 py-1.5 text-sm font-medium text-txt ring-1 ring-hairline transition-colors hover:bg-elevh"
            title="Añadir balón"
          >
            + Balón
          </button>
          <button
            onClick={handleClear}
            className="rounded bg-elev px-3 py-1.5 text-sm font-medium text-muted ring-1 ring-hairline transition-colors hover:bg-danger/90 hover:text-white"
            title="Borrar todo"
          >
            🗑
          </button>
        </div>
      </header>

      {/* Área del campo */}
      <main ref={areaRef} className="relative flex flex-1 items-center justify-center overflow-hidden p-2 sm:p-4">
        {courtW > 0 && (
          <div
            className={`relative rounded-md transition-shadow ${courtHot ? 'ring-2 ring-accent' : ''}`}
            style={{ width: courtW, height: courtH }}
          >
            <Court ref={courtElRef} orientation={orientation} view={view} width={courtW} height={courtH} />
            <div className="absolute inset-0" onPointerDown={handleCourtBackground}>
              {visible.map((p) => {
                const pos = displayPos(p, orientation, view)
                return (
                  <Piece
                    key={p.id}
                    player={p}
                    x={pos.fx}
                    y={pos.fy}
                    size={p.isBall ? pieceSize * 0.62 : pieceSize}
                    courtWidth={courtW}
                    courtHeight={courtH}
                    selected={selectedId === p.id}
                    onMove={handleMove}
                    onSelect={setSelectedId}
                    onTap={handleTapCourt}
                    onEdit={openEdit}
                    onDelete={handleDelete}
                    onBench={sendToBench}
                    getCourtRect={getCourtRect}
                    benchSideAt={benchSideAt}
                    onBenchHover={setBenchColHot}
                  />
                )
              })}
            </div>

            {/* Popover: añadir jugador en el punto tocado */}
            {courtMenu && (
              <div
                className="absolute z-40"
                style={{
                  left: courtMenu.fx * courtW,
                  top: courtMenu.fy * courtH,
                  transform: `translate(-50%, ${courtMenu.fy < 0.22 ? '12px' : 'calc(-100% - 12px)'})`,
                }}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => addPlayerAt(courtMenu)}
                  className="whitespace-nowrap rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white shadow-xl ring-1 ring-black/20 transition-colors hover:bg-accenth"
                >
                  + Añadir jugador aquí
                </button>
              </div>
            )}
          </div>
        )}

        {benchSel && (
          <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded-full border border-accent/40 bg-panel/95 px-4 py-2 text-center text-sm font-medium text-txt shadow-xl backdrop-blur">
            Intercambiando <b className="text-accent">{benchSel.name || 'ficha'}</b> · toca un jugador o una posición del campo
          </div>
        )}

        {courtHot && (
          <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded-full border border-accent/40 bg-panel/95 px-4 py-2 text-center text-sm font-medium text-txt shadow-xl backdrop-blur">
            Suelta para colocar en el campo
          </div>
        )}

        {notice && (
          <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border-l-2 border-accent bg-panel/95 px-4 py-2 text-center text-sm font-medium text-txt shadow-xl backdrop-blur">
            {notice}
          </div>
        )}

        {players.length === 0 && (
          <div className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full border border-hairline bg-panel/80 px-4 py-2 text-center text-sm text-muted backdrop-blur">
            Pulsa <b className="text-txt">+ Jugador</b> para empezar · arrastra las fichas
          </div>
        )}
      </main>

      {/* Banquillos separados por campo (plegables) */}
      <footer ref={benchRef} className="border-t border-hairline bg-panel shadow-panel">
        {/* Barra de control */}
        <div className="flex items-center justify-center px-3 py-1.5">
          <button
            onClick={() => setBenchOpen((v) => !v)}
            className="flex items-center gap-1.5 rounded bg-accent px-4 py-1 text-xs font-semibold text-white transition-colors hover:bg-accenth"
            title={benchOpen ? 'Esconder banquillo' : 'Mostrar banquillo'}
          >
            <span>{benchOpen ? 'Esconder banquillo' : 'Mostrar banquillo'}</span>
            {benchCount > 0 && (
              <span className="rounded-full bg-white/25 px-1.5 text-[11px] tabular-nums">{benchCount}</span>
            )}
            <span
              className="inline-block transition-transform"
              style={{ transform: benchOpen ? 'rotate(0deg)' : 'rotate(180deg)' }}
            >
              ▾
            </span>
          </button>
        </div>

        {/* Columnas (colapsables con animación suave) */}
        <div
          className="overflow-hidden transition-all duration-300 ease-spectrum"
          style={{ maxHeight: benchOpen ? 240 : 0, opacity: benchOpen ? 1 : 0 }}
        >
          <div className="grid grid-cols-2 divide-x divide-hairline border-t border-hairline">
            <BenchColumn
              title={labels.a}
              side="a"
              hot={benchColHot === 'a'}
              columnRef={(el) => (benchColRefs.current.a = el)}
              players={players.filter((p) => p.bench && p.side === 'a')}
              benchSelId={benchSelId}
              onSelect={setBenchSelId}
              onDelete={handleDelete}
              onAdd={openAdd}
              getCourtRect={getCourtRect}
              onDragMove={benchDragMove}
              onDragEnd={benchDragEnd}
            />
            <BenchColumn
              title={labels.b}
              side="b"
              hot={benchColHot === 'b'}
              columnRef={(el) => (benchColRefs.current.b = el)}
              players={players.filter((p) => p.bench && p.side === 'b')}
              benchSelId={benchSelId}
              onSelect={setBenchSelId}
              onDelete={handleDelete}
              onAdd={openAdd}
              getCourtRect={getCourtRect}
              onDragMove={benchDragMove}
              onDragEnd={benchDragEnd}
            />
          </div>
        </div>
      </footer>

      {modal && (
        <PlayerModal
          initial={modal.mode === 'edit' ? modal.player : null}
          defaults={modal.defaults}
          labels={labels}
          onSave={handleSave}
          onClose={() => {
            setModal(null)
            setPendingPos(null)
          }}
        />
      )}
    </div>
  )
}

function BenchColumn({ title, side, hot, columnRef, players, benchSelId, onSelect, onDelete, onAdd, getCourtRect, onDragMove, onDragEnd }) {
  return (
    <div
      ref={columnRef}
      className={`min-w-0 px-3 py-2.5 transition-colors ${hot ? 'bg-accent/15 ring-2 ring-inset ring-accent' : ''}`}
    >
      <div className="font-display mb-1.5 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.12em] text-muted">
        <span className="truncate">{title}</span>
      </div>
      <div className="thin-scroll flex h-[84px] items-center gap-2 overflow-x-auto px-1 pb-1">
        {players.length === 0 ? (
          <button
            onClick={() => onAdd({ placement: 'bench', side })}
            className="rounded bg-accent px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-accenth"
          >
            + Jugador
          </button>
        ) : (
          players.map((p) => (
            <BenchChip
              key={p.id}
              player={p}
              selected={benchSelId === p.id}
              onSelect={() => onSelect((cur) => (cur === p.id ? null : p.id))}
              onDelete={() => onDelete(p.id)}
              getCourtRect={getCourtRect}
              onDragMove={onDragMove}
              onDragEnd={onDragEnd}
            />
          ))
        )}
      </div>
    </div>
  )
}

function BenchChip({ player, selected, onSelect, onDelete, getCourtRect, onDragMove, onDragEnd }) {
  const dragging = useRef(false)
  const moved = useRef(false)
  const startPt = useRef({ x: 0, y: 0 })
  const DRAG_THRESHOLD = 6

  const down = (e) => {
    if (!getCourtRect) return
    e.currentTarget.setPointerCapture(e.pointerId)
    dragging.current = true
    moved.current = false
    startPt.current = { x: e.clientX, y: e.clientY }
  }
  const move = (e) => {
    if (!dragging.current) return
    if (!moved.current) {
      if (Math.hypot(e.clientX - startPt.current.x, e.clientY - startPt.current.y) < DRAG_THRESHOLD) return
      moved.current = true
    }
    onDragMove?.(e.clientX, e.clientY, player.side)
  }
  const up = (e) => {
    if (!dragging.current) return
    dragging.current = false
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      /* noop */
    }
    if (moved.current) onDragEnd?.(player.id, e.clientX, e.clientY, player.side)
    else onSelect()
  }

  return (
    <div
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      style={{ touchAction: 'none' }}
      className={`relative flex shrink-0 cursor-grab flex-col items-center rounded-md px-2 py-1.5 transition ${
        selected ? 'bg-accent/15 ring-1 ring-accent' : 'ring-1 ring-transparent hover:bg-white/5'
      }`}
    >
      <button
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation()
          onDelete()
        }}
        className="absolute -right-0.5 -top-0.5 z-10 flex h-4 w-4 items-center justify-center rounded-full bg-danger text-[10px] text-white shadow ring-1 ring-ink"
        aria-label="Eliminar"
      >
        ✕
      </button>
      <div
        className="font-display flex h-11 w-11 items-center justify-center overflow-hidden rounded-full font-bold ring-1 ring-black/30"
        style={{
          background: player.photo ? '#000' : player.color,
          backgroundImage: player.photo ? `url(${player.photo})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          color: textColorFor(player.color),
          fontSize: 15,
          boxShadow: '0 2px 5px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.25)',
        }}
      >
        {!player.photo && (player.label || (player.isBall ? '🏐' : ''))}
      </div>
      <span className="mt-1 max-w-[64px] truncate text-[11px] text-muted">
        {player.name || (player.isBall ? 'Balón' : '—')}
      </span>
    </div>
  )
}
