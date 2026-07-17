import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Court from './Court.jsx'
import Piece from './Piece.jsx'
import PlayerModal from './PlayerModal.jsx'
import { useElementSize, useIdFactory, useLocalStorage } from './hooks.js'
import {
  clamp01,
  courtAspect,
  displayPos,
  migratePlayers,
  sideLabels,
  updatePos,
} from './court.js'

const DEFAULT_COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#8b5cf6', '#f97316', '#ec4899', '#06b6d4']
const MAX_PER_SIDE = 6 // máximo de jugadores (no balones) por campo

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

  const [areaRef, area] = useElementSize()
  const courtElRef = useRef(null)
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

  const onCourt = useMemo(() => players.filter((p) => !p.bench), [players])
  const visible = useMemo(
    () => (view === 'full' ? onCourt : onCourt.filter((p) => p.side === view)),
    [onCourt, view],
  )
  const benchSel = players.find((p) => p.id === benchSelId && p.bench) || null
  const benchCount = useMemo(() => players.filter((p) => p.bench).length, [players])

  // Jugadores (sin balones) en el campo por lado
  const countSide = useCallback(
    (side) => players.filter((p) => !p.bench && !p.isBall && p.side === side).length,
    [players],
  )

  const handleMove = useCallback(
    (id, frac) => {
      setPlayers((prev) =>
        prev.map((p) => {
          if (p.id !== id) return p
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

  const sendToBench = (id) => {
    setPlayers((prev) => prev.map((p) => (p.id === id ? { ...p, bench: true } : p)))
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

  // Toque limpio sobre una ficha del campo (no arrastre)
  const handleTapCourt = (id) => {
    // Flujo banquillo -> campo (mismo lado)
    if (benchSelId && benchSelId !== id) {
      const target = players.find((p) => p.id === id)
      if (target && target.side === benchSel?.side) {
        swap(benchSelId, id)
      } else {
        flash('Solo puedes intercambiar con un jugador del mismo campo')
      }
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

  // Tocar una posición vacía con una ficha del banquillo elegida -> colocarla ahí
  const handleCourtBackground = (e) => {
    if (!benchSelId) {
      setSelectedId(null)
      return
    }
    e.stopPropagation()
    const rect = getCourtRect()
    if (!rect || !benchSel) return
    const fx = clamp01((e.clientX - rect.left) / rect.width)
    const fy = clamp01((e.clientY - rect.top) / rect.height)
    let side = view
    if (view === 'full') {
      side = orientation === 'vertical' ? (fy < 0.5 ? 'a' : 'b') : fx < 0.5 ? 'a' : 'b'
    }
    if (side !== benchSel.side) {
      flash(`Esa ficha es del campo "${labels[benchSel.side]}"`)
      return
    }
    if (!benchSel.isBall && countSide(side) >= MAX_PER_SIDE) {
      flash(`El campo "${labels[side]}" ya tiene ${MAX_PER_SIDE} jugadores`)
      return
    }
    const { d, s } = updatePos(side, fx, fy, orientation, view)
    setPlayers((prev) => prev.map((p) => (p.id === benchSelId ? { ...p, bench: false, side, d, s } : p)))
    setBenchSelId(null)
  }

  const openAdd = () => setModal({ mode: 'add' })
  const openEdit = (player) => setModal({ mode: 'edit', player })

  const handleSave = (data) => {
    if (modal?.mode === 'edit') {
      setPlayers((prev) => prev.map((p) => (p.id === modal.player.id ? { ...p, ...data } : p)))
      setModal(null)
      return
    }
    const side = data.side
    const full = countSide(side) >= MAX_PER_SIDE
    // Va al banquillo si se ha elegido así, o si el campo está lleno
    const goBench = data.bench || full
    const sameSide = onCourt.filter((p) => p.side === side).length
    const color = data.color || DEFAULT_COLORS[players.length % DEFAULT_COLORS.length]
    const s = 0.5 + ((sameSide % 3) - 1) * 0.22
    const d = 0.45 + Math.floor(sameSide / 3) * 0.14
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
        s: Math.min(0.92, Math.max(0.08, s)),
        d: Math.min(0.92, Math.max(0.08, d)),
      },
    ])
    if (!data.bench && full) flash(`El campo "${labels[side]}" está lleno (${MAX_PER_SIDE}). Añadido al banquillo`)
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
            onClick={openAdd}
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
          <div className="relative" style={{ width: courtW, height: courtH }}>
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
                  />
                )
              })}
            </div>
          </div>
        )}

        {benchSel && (
          <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded-full border border-accent/40 bg-panel/95 px-4 py-2 text-center text-sm font-medium text-txt shadow-xl backdrop-blur">
            Intercambiando <b className="text-accent">{benchSel.name || 'ficha'}</b> · toca un jugador de{' '}
            <b className="text-accent">{labels[benchSel.side]}</b> o una posición
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
      <footer className="border-t border-hairline bg-panel shadow-panel">
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
              count={countSide('a')}
              players={players.filter((p) => p.bench && p.side === 'a')}
              benchSelId={benchSelId}
              onSelect={setBenchSelId}
              onDelete={handleDelete}
            />
            <BenchColumn
              title={labels.b}
              count={countSide('b')}
              players={players.filter((p) => p.bench && p.side === 'b')}
              benchSelId={benchSelId}
              onSelect={setBenchSelId}
              onDelete={handleDelete}
            />
          </div>
        </div>
      </footer>

      {modal && (
        <PlayerModal
          initial={modal.mode === 'edit' ? modal.player : null}
          labels={labels}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}

function BenchColumn({ title, count, players, benchSelId, onSelect, onDelete }) {
  return (
    <div className="min-w-0 px-3 py-2.5">
      <div className="font-display mb-1.5 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.12em] text-muted">
        <span className="truncate">{title}</span>
        <span className={`ml-auto shrink-0 tabular-nums ${count >= MAX_PER_SIDE ? 'text-accent' : 'text-muted/70'}`}>
          {count}/{MAX_PER_SIDE} en campo
        </span>
      </div>
      <div className="thin-scroll flex min-h-[56px] items-center gap-2 overflow-x-auto pb-1">
        {players.length === 0 && <span className="text-sm text-muted/60">Vacío</span>}
        {players.map((p) => (
          <BenchChip
            key={p.id}
            player={p}
            selected={benchSelId === p.id}
            onSelect={() => onSelect((cur) => (cur === p.id ? null : p.id))}
            onDelete={() => onDelete(p.id)}
          />
        ))}
      </div>
    </div>
  )
}

function BenchChip({ player, selected, onSelect, onDelete }) {
  return (
    <div
      onClick={onSelect}
      className={`relative flex shrink-0 cursor-pointer flex-col items-center rounded-md px-2 py-1.5 transition ${
        selected ? 'bg-accent/15 ring-1 ring-accent' : 'ring-1 ring-transparent hover:bg-white/5'
      }`}
    >
      <button
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
