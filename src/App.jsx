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
