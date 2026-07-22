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
          const count = b.players?.length || 0
          return (
            <div
              key={b.id}
              onPointerDown={() => onSelect(b.id)}
              onDoubleClick={() => setEditingId(b.id)}
              title="Doble clic para renombrar"
              className={`group flex shrink-0 cursor-pointer items-center gap-1.5 rounded-t-md border-b-2 px-3 py-1.5 text-sm transition-colors ${
                active
                  ? 'border-accent bg-ink text-txt'
                  : 'border-transparent bg-elev text-muted hover:bg-elevh hover:text-txt'
              }`}
            >
              {editingId === b.id ? (
                <input
                  autoFocus
                  defaultValue={b.name}
                  onFocus={(e) => e.target.select()}
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
                <>
                  <span className="max-w-[140px] truncate">{b.name}</span>
                  {count > 0 && (
                    <span className="rounded-full bg-white/10 px-1.5 text-[10px] tabular-nums text-muted">
                      {count}
                    </span>
                  )}
                </>
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

      <div ref={menuRef} className="relative flex items-center pb-1">
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="flex h-8 w-8 items-center justify-center rounded bg-elev text-lg leading-none text-muted ring-1 ring-hairline transition-colors hover:bg-elevh hover:text-txt"
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
