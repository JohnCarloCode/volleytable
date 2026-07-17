import { useRef } from 'react'

function clamp01(v) {
  return Math.min(1, Math.max(0, v))
}

// Elige texto blanco o negro según el color de fondo para buen contraste
function textColorFor(hex) {
  if (!hex) return '#fff'
  const c = hex.replace('#', '')
  const r = parseInt(c.substring(0, 2), 16)
  const g = parseInt(c.substring(2, 4), 16)
  const b = parseInt(c.substring(4, 6), 16)
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return lum > 0.6 ? '#111827' : '#ffffff'
}

export default function Piece({
  player,
  x,
  y,
  size,
  courtWidth,
  courtHeight,
  selected,
  onMove,
  onSelect,
  onTap,
  onEdit,
  onDelete,
  onBench,
  getCourtRect,
}) {
  const dragging = useRef(false)
  const moved = useRef(false)
  const start = useRef({ x: 0, y: 0 })
  const grabOffset = useRef({ dx: 0, dy: 0 })

  // Umbral (px) para distinguir un toque de un arrastre. Por debajo se
  // considera toque limpio (sirve para armar/intercambiar); por encima, arrastre.
  const DRAG_THRESHOLD = 4

  const left = x * courtWidth
  const top = y * courtHeight

  const handlePointerDown = (e) => {
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    dragging.current = true
    moved.current = false
    start.current = { x: e.clientX, y: e.clientY }
    const rect = getCourtRect()
    if (rect) {
      const px = e.clientX - rect.left
      const py = e.clientY - rect.top
      grabOffset.current = { dx: px - left, dy: py - top }
    }
  }

  const handlePointerMove = (e) => {
    if (!dragging.current) return
    const rect = getCourtRect()
    if (!rect) return
    if (!moved.current) {
      // Aún dentro del umbral: seguimos tratándolo como posible toque
      const dx = e.clientX - start.current.x
      const dy = e.clientY - start.current.y
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return
      moved.current = true
    }
    const px = e.clientX - rect.left - grabOffset.current.dx
    const py = e.clientY - rect.top - grabOffset.current.dy
    onMove(player.id, {
      x: clamp01(px / rect.width),
      y: clamp01(py / rect.height),
    })
  }

  const handlePointerUp = (e) => {
    if (!dragging.current) return
    dragging.current = false
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      /* noop */
    }
    if (moved.current) {
      // Fue un arrastre: solo seleccionamos la ficha movida, nunca intercambia
      onSelect(player.id)
    } else {
      // Toque limpio: decide armar / intercambiar / cancelar
      onTap(player.id)
    }
  }

  const txt = textColorFor(player.color)

  return (
    <div
      className="absolute flex flex-col items-center"
      style={{
        left,
        top,
        transform: 'translate(-50%, -50%)',
        touchAction: 'none',
        zIndex: selected ? 30 : 10,
      }}
    >
      {/* Botones de acción cuando está seleccionada */}
      {selected && (
        <div
          className="absolute -top-3 flex -translate-y-full gap-1"
          style={{ zIndex: 40 }}
        >
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation()
              onEdit(player)
            }}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-elev text-txt ring-1 ring-hairline shadow-lg active:scale-95"
            aria-label="Editar"
          >
            ✎
          </button>
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation()
              onBench(player.id)
            }}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-elev text-txt ring-1 ring-hairline shadow-lg active:scale-95"
            aria-label="Enviar al banquillo"
            title="Al banquillo"
          >
            🪑
          </button>
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation()
              onDelete(player.id)
            }}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-danger text-white shadow-lg active:scale-95"
            aria-label="Eliminar"
          >
            ✕
          </button>
        </div>
      )}

      {/* Ficha */}
      <div className="relative" style={{ width: size, height: size }}>
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className={`font-display flex h-full w-full items-center justify-center rounded-full font-bold transition-shadow ${
            selected ? 'ring-2 ring-accent ring-offset-2 ring-offset-ink' : 'ring-1 ring-black/30'
          }`}
          style={{
            background: player.photo ? '#000' : player.color,
            color: txt,
            fontSize: size * 0.38,
            letterSpacing: '-0.02em',
            cursor: 'grab',
            overflow: 'hidden',
            boxShadow: '0 3px 8px rgba(0,0,0,0.45), 0 1px 2px rgba(0,0,0,0.5), inset 0 1.5px 0 rgba(255,255,255,0.28)',
            backgroundImage: player.photo ? `url(${player.photo})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          {!player.photo && (player.label || '')}
        </div>

        {/* Insignia de posición (siglas en inglés), arriba a la derecha */}
        {player.position && !player.isBall && (
          <span
            className="font-display absolute -right-1.5 -top-1.5 flex items-center justify-center rounded-full bg-ink font-bold uppercase text-white ring-1 ring-white/25"
            style={{
              minWidth: Math.max(16, size * 0.42),
              height: Math.max(16, size * 0.42),
              padding: '0 3px',
              fontSize: Math.max(9, size * 0.25),
              letterSpacing: '0.02em',
              pointerEvents: 'none',
            }}
          >
            {player.position}
          </span>
        )}
      </div>

      {/* Nombre debajo */}
      {player.name && (
        <span
          className="mt-1 max-w-[92px] truncate rounded-md bg-ink/80 px-1.5 py-0.5 text-center text-[11px] font-medium leading-none text-txt ring-1 ring-hairline backdrop-blur-sm"
          style={{ pointerEvents: 'none' }}
        >
          {player.name}
        </span>
      )}
    </div>
  )
}
