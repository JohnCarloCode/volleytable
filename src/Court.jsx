import { forwardRef } from 'react'

/*
 * Campo de voleibol en SVG. Soporta:
 *   orientation: 'vertical' (red horizontal) | 'horizontal' (red vertical)
 *   view:        'full' (campo completo) | 'a' | 'b' (solo una mitad)
 *
 * Medidas en "metros": pista 9 x 18, líneas de ataque a 3m de la red.
 * En media pista se muestra un cuadrado 9 x 9 con la red en el borde que
 * corresponde (para el lado A la red queda al fondo; para el B, al principio).
 */
const LINE = { stroke: '#ffffff', fill: 'none', vectorEffect: 'non-scaling-stroke' }

const Court = forwardRef(function Court({ orientation, view, width, height }, ref) {
  const isFull = view === 'full'
  const isV = orientation === 'vertical'
  const pad = 0.35

  // Dimensiones en unidades según orientación / vista
  let W, H
  if (isFull) {
    W = isV ? 9 : 18
    H = isV ? 18 : 9
  } else {
    W = 9
    H = 9
  }

  return (
    <div
      ref={ref}
      className="relative select-none overflow-hidden rounded-lg ring-1 ring-hairline"
      style={{ width, height, touchAction: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}
    >
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox={`${-pad} ${-pad} ${W + pad * 2} ${H + pad * 2}`}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="sand" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#efa869" />
            <stop offset="100%" stopColor="#e08c47" />
          </linearGradient>
        </defs>

        {/* Superficie (clara) */}
        <rect x={-pad} y={-pad} width={W + pad * 2} height={H + pad * 2} fill="url(#sand)" />
        {/* Perímetro */}
        <rect x={0} y={0} width={W} height={H} {...LINE} strokeWidth={3} />

        {renderLines({ isFull, isV, view, W, H })}
      </svg>
    </div>
  )
})

function renderLines({ isFull, isV, view, W, H }) {
  const els = []
  const attack = (pos) =>
    isV
      ? <line key={`a${pos}`} x1={0} y1={pos} x2={W} y2={pos} {...LINE} strokeWidth={2} strokeDasharray="0.4 0.4" />
      : <line key={`a${pos}`} x1={pos} y1={0} x2={pos} y2={H} {...LINE} strokeWidth={2} strokeDasharray="0.4 0.4" />

  if (isFull) {
    if (isV) {
      els.push(attack(6), attack(12))
      els.push(<NetBand key="net" axis="h" pos={9} span={W} />)
    } else {
      els.push(attack(6), attack(12))
      els.push(<NetBand key="net" axis="v" pos={9} span={H} />)
    }
    return els
  }

  // Media pista (cuadrado 9x9). La red va en el borde según el lado.
  if (isV) {
    if (view === 'a') {
      // red abajo (y=9), ataque a 3m (y=6)
      els.push(attack(6))
      els.push(<NetBand key="net" axis="h" pos={9} span={W} />)
    } else {
      // red arriba (y=0), ataque a 3m (y=3)
      els.push(attack(3))
      els.push(<NetBand key="net" axis="h" pos={0} span={W} />)
    }
  } else {
    if (view === 'a') {
      // red a la derecha (x=9), ataque a 3m (x=6)
      els.push(attack(6))
      els.push(<NetBand key="net" axis="v" pos={9} span={H} />)
    } else {
      // red a la izquierda (x=0), ataque a 3m (x=3)
      els.push(attack(3))
      els.push(<NetBand key="net" axis="v" pos={0} span={H} />)
    }
  }
  return els
}

// Red: banda oscura con malla y postes. axis 'h' = horizontal, 'v' = vertical.
function NetBand({ axis, pos, span }) {
  const t = 0.18 // media anchura de la banda
  if (axis === 'h') {
    return (
      <g>
        <rect x={-0.35} y={pos - t} width={span + 0.7} height={t * 2} fill="#1f2937" />
        <line x1={-0.35} y1={pos} x2={span + 0.35} y2={pos} stroke="#e5e7eb" strokeWidth={1} strokeDasharray="0.12 0.12" vectorEffect="non-scaling-stroke" />
        <circle cx={0} cy={pos} r={0.16} fill="#111827" />
        <circle cx={span} cy={pos} r={0.16} fill="#111827" />
      </g>
    )
  }
  return (
    <g>
      <rect x={pos - t} y={-0.35} width={t * 2} height={span + 0.7} fill="#1f2937" />
      <line x1={pos} y1={-0.35} x2={pos} y2={span + 0.35} stroke="#e5e7eb" strokeWidth={1} strokeDasharray="0.12 0.12" vectorEffect="non-scaling-stroke" />
      <circle cx={pos} cy={0} r={0.16} fill="#111827" />
      <circle cx={pos} cy={span} r={0.16} fill="#111827" />
    </g>
  )
}

export default Court
