import { useEffect, useRef, useState } from 'react'

// Posiciones de voleibol (siglas en inglés)
export const POSITIONS = [
  { value: '', label: 'Sin posición' },
  { value: 'S', label: 'S · Setter (Colocador/a)' },
  { value: 'OH', label: 'OH · Outside Hitter (Receptor/a)' },
  { value: 'OPP', label: 'OPP · Opposite (Opuesto/a)' },
  { value: 'MB', label: 'MB · Middle Blocker (Central)' },
  { value: 'L', label: 'L · Libero' },
  { value: 'DS', label: 'DS · Defensive Specialist' },
]

const SWATCHES = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308',
  '#22c55e', '#10b981', '#06b6d4', '#3b82f6',
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
  '#111827', '#ffffff',
]

// Reduce la foto a un tamaño razonable para no llenar localStorage
function fileToDataURL(file, maxSize = 256) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height))
        const w = Math.round(img.width * scale)
        const h = Math.round(img.height * scale)
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/jpeg', 0.82))
      }
      img.onerror = reject
      img.src = reader.result
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function PlayerModal({ initial, labels, onSave, onClose }) {
  const [name, setName] = useState(initial?.name ?? '')
  const [label, setLabel] = useState(initial?.label ?? '')
  const [color, setColor] = useState(initial?.color ?? '#3b82f6')
  const [photo, setPhoto] = useState(initial?.photo ?? null)
  const [position, setPosition] = useState(initial?.position ?? '')
  // Ubicación y lado: vacíos por defecto (obligatorios al crear)
  const [placement, setPlacement] = useState(initial ? (initial.bench ? 'bench' : 'court') : '')
  const [side, setSide] = useState(initial?.side ?? '')
  const fileRef = useRef(null)

  const canSave = placement !== '' && side !== ''

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const url = await fileToDataURL(file)
      setPhoto(url)
    } catch {
      /* ignorar errores de imagen */
    }
  }

  const submit = (e) => {
    e.preventDefault()
    if (!canSave) return
    const cleanName = name.trim()
    onSave({
      name: cleanName,
      label: label.trim().slice(0, 3) || cleanName.slice(0, 2).toUpperCase(),
      color,
      photo,
      position,
      side,
      bench: placement === 'bench',
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-lg border border-hairline bg-panel p-5 text-txt shadow-appElevated sm:rounded-lg"
      >
        <h2 className="font-display mb-4 text-lg font-semibold tracking-tight">
          {initial ? 'Editar jugador' : 'Nuevo jugador'}
        </h2>

        <div className="mb-4 flex items-center gap-4">
          {/* Vista previa de la ficha */}
          <div className="relative h-16 w-16 shrink-0">
            <div
              className="flex h-full w-full items-center justify-center overflow-hidden rounded-full font-bold ring-2 ring-black/30"
              style={{
                background: photo ? '#000' : color,
                backgroundImage: photo ? `url(${photo})` : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                color: '#fff',
              }}
            >
              {!photo && (label || name.slice(0, 2).toUpperCase() || '?')}
            </div>
            {position && (
              <span className="font-display absolute -right-1.5 -top-1.5 flex h-6 min-w-[24px] items-center justify-center rounded-full bg-ink px-1 text-xs font-bold uppercase text-white ring-1 ring-white/25">
                {position}
              </span>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="rounded bg-elev px-3 py-1.5 text-sm font-medium text-txt ring-1 ring-hairline transition-colors hover:bg-elevh"
            >
              {photo ? 'Cambiar foto' : 'Subir foto'}
            </button>
            {photo && (
              <button
                type="button"
                onClick={() => setPhoto(null)}
                className="rounded bg-elev px-3 py-1.5 text-sm font-medium text-danger ring-1 ring-hairline transition-colors hover:bg-elevh"
              >
                Quitar foto
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFile}
            />
          </div>
        </div>

        <label className="mb-1 block text-sm text-muted">Nombre</label>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Demple"
          className="mb-4 w-full rounded border border-hairline bg-ink px-3 py-2.5 text-base text-txt outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent/40"
        />

        <label className="mb-1 block text-sm text-muted">
          Dorsal / iniciales <span className="text-muted/60">(máx. 3)</span>
        </label>
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="5"
          maxLength={3}
          className="mb-4 w-full rounded border border-hairline bg-ink px-3 py-2.5 text-base text-txt outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent/40"
        />

        <label className="mb-1 block text-sm text-muted">Posición</label>
        <select
          value={position}
          onChange={(e) => setPosition(e.target.value)}
          className="mb-4 w-full rounded border border-hairline bg-ink px-3 py-2.5 text-base text-txt outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent/40"
        >
          {POSITIONS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>

        <label className="mb-2 block text-sm text-muted">Color</label>
        <div className="mb-4 flex flex-wrap gap-2">
          {SWATCHES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={`h-8 w-8 rounded-full ring-2 transition ${
                color === c ? 'ring-accent' : 'ring-black/20'
              }`}
              style={{ background: c }}
              aria-label={`color ${c}`}
            />
          ))}
          <label className="relative h-8 w-8 cursor-pointer overflow-hidden rounded-full ring-2 ring-black/20">
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs">🎨</span>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-full w-full cursor-pointer opacity-0"
            />
          </label>
        </div>

        <label className="mb-2 block text-sm text-muted">
          Ubicación <span className="text-red-400">*</span>
        </label>
        <div className="mb-4 flex overflow-hidden rounded border border-hairline">
          {[
            { v: 'court', t: '🏐 En el campo' },
            { v: 'bench', t: '🪑 En el banquillo' },
          ].map((o) => (
            <button
              key={o.v}
              type="button"
              onClick={() => setPlacement(o.v)}
              className={`flex-1 px-3 py-2 text-sm font-medium ${
                placement === o.v ? 'bg-accent text-white' : 'bg-ink text-muted hover:bg-elev'
              }`}
            >
              {o.t}
            </button>
          ))}
        </div>

        {placement && (
          <>
            <label className="mb-2 block text-sm text-muted">
              ¿Qué campo? <span className="text-red-400">*</span>
            </label>
            <div className="mb-4 flex overflow-hidden rounded border border-hairline">
              {['a', 'b'].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSide(s)}
                  className={`flex-1 px-3 py-2 text-sm font-medium ${
                    side === s ? 'bg-accent text-white' : 'bg-ink text-muted hover:bg-elev'
                  }`}
                >
                  {labels?.[s] ?? (s === 'a' ? 'A' : 'B')}
                </button>
              ))}
            </div>
          </>
        )}

        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded bg-elev px-4 py-2.5 font-medium text-txt ring-1 ring-hairline transition-colors hover:bg-elevh"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={!canSave}
            className="flex-1 rounded bg-accent px-4 py-2.5 font-semibold text-white transition-colors hover:bg-accenth disabled:cursor-not-allowed disabled:bg-elev disabled:text-muted"
          >
            Guardar
          </button>
        </div>
      </form>
    </div>
  )
}
