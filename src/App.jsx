import { useEffect, useState } from 'react'
import BoardView from './BoardView.jsx'
import { getInitialState } from './boards.js'

export default function App() {
  const [initial] = useState(getInitialState)
  const [boards, setBoards] = useState(initial.boards)
  const [activeId] = useState(initial.activeId)

  useEffect(() => {
    try {
      localStorage.setItem('vb.boards', JSON.stringify(boards))
    } catch {
      /* noop */
    }
  }, [boards])

  const active = boards.find((b) => b.id === activeId) || boards[0]
  const update = (fn) => setBoards((bs) => bs.map((b) => (b.id === active.id ? fn(b) : b)))

  return (
    <div className="flex h-full w-full flex-col bg-ink text-txt">
      <BoardView key={active.id} board={active} update={update} />
    </div>
  )
}
