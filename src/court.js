// Modelo de geometría del campo.
//
// Cada ficha se guarda con:
//   side: 'a' | 'b'   -> a qué mitad del campo pertenece (queda "atada")
//   d:    0..1        -> distancia a la red (0 = pegado a la red, 1 = línea de fondo)
//   s:    0..1        -> posición lateral a lo largo de la red
//
// Guardar la posición relativa a la red (y no en píxeles ni en x/y absolutas)
// hace que rotar el campo vertical<->horizontal conserve la colocación táctica.

export const clamp01 = (v) => Math.min(1, Math.max(0, v))

// Relación de aspecto (ancho / alto) del área visible
export function courtAspect(orientation, view) {
  if (view !== 'full') return 1 // media pista = cuadrado 9x9
  return orientation === 'vertical' ? 9 / 18 : 18 / 9
}

// Etiquetas de las mitades según la orientación
export function sideLabels(orientation) {
  return orientation === 'vertical'
    ? { a: 'Arriba', b: 'Abajo' }
    : { a: 'Izquierda', b: 'Derecha' }
}

// (side, d, s) -> fracción (0..1) dentro del CAMPO COMPLETO
export function toFull(side, d, s, orientation) {
  if (orientation === 'vertical') {
    const fy = side === 'a' ? (1 - d) * 0.5 : 0.5 + d * 0.5
    return { fx: s, fy }
  }
  // En horizontal, la orientación es la vertical girada 90° (CCW): el eje
  // lateral 's' pasa al eje Y invertido, para que el giro sea rígido/coherente.
  const fx = side === 'a' ? (1 - d) * 0.5 : 0.5 + d * 0.5
  return { fx, fy: 1 - s }
}

// (side, d, s) -> fracción (0..1) dentro de la MEDIA pista visible
export function toHalf(side, d, s, orientation) {
  if (orientation === 'vertical') {
    const vy = side === 'a' ? 1 - d : d // 'a': red abajo · 'b': red arriba
    return { fx: s, fy: vy }
  }
  const vx = side === 'a' ? 1 - d : d // 'a': red a la derecha · 'b': red a la izquierda
  return { fx: vx, fy: 1 - s }
}

// Fracción dentro del campo completo -> (d, s) para una ficha de un lado dado
export function fromFull(side, fx, fy, orientation) {
  if (orientation === 'vertical') {
    const d = side === 'a' ? 1 - fy * 2 : fy * 2 - 1
    return { d: clamp01(d), s: clamp01(fx) }
  }
  const d = side === 'a' ? 1 - fx * 2 : fx * 2 - 1
  return { d: clamp01(d), s: clamp01(1 - fy) }
}

// Fracción dentro de la media pista -> (d, s)
export function fromHalf(side, fx, fy, orientation) {
  if (orientation === 'vertical') {
    const d = side === 'a' ? 1 - fy : fy
    return { d: clamp01(d), s: clamp01(fx) }
  }
  const d = side === 'a' ? 1 - fx : fx
  return { d: clamp01(d), s: clamp01(1 - fy) }
}

// Posición de una ficha en la vista actual (completa o media)
export function displayPos(player, orientation, view) {
  if (view === 'full') return toFull(player.side, player.d, player.s, orientation)
  return toHalf(player.side, player.d, player.s, orientation)
}

// Nueva posición (d, s) a partir de la fracción en la vista actual
export function updatePos(side, fx, fy, orientation, view) {
  if (view === 'full') return fromFull(side, fx, fy, orientation)
  return fromHalf(side, fx, fy, orientation)
}

// Migra fichas del formato antiguo (x, y absolutas verticales) al nuevo (side, d, s)
export function migratePlayers(list) {
  if (!Array.isArray(list)) return []
  return list.map((p) => {
    if (p && p.side && typeof p.d === 'number' && typeof p.s === 'number') return p
    const x = typeof p?.x === 'number' ? p.x : 0.5
    const y = typeof p?.y === 'number' ? p.y : 0.5
    const side = y < 0.5 ? 'a' : 'b'
    const ly = side === 'a' ? y * 2 : (y - 0.5) * 2 // 0..1 dentro de la mitad (0 = arriba)
    const d = side === 'a' ? 1 - ly : ly
    const { x: _x, y: _y, ...rest } = p || {}
    return { ...rest, side, d: clamp01(d), s: clamp01(x) }
  })
}
