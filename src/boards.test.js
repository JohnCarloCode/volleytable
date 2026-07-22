import { describe, it, expect } from 'vitest'
import { createEmptyBoard, nextBoardName, duplicateBoard, makeId } from './boards.js'

describe('createEmptyBoard', () => {
  it('crea un campo sin jugadores con defaults', () => {
    const b = createEmptyBoard('id1', 'Campo 1')
    expect(b).toMatchObject({
      id: 'id1',
      name: 'Campo 1',
      orientation: 'horizontal',
      view: 'full',
      benchOpen: true,
    })
    expect(b.players).toEqual([])
  })
})

describe('nextBoardName', () => {
  it('devuelve el primer hueco "Campo N" libre', () => {
    const boards = [{ name: 'Campo 1' }, { name: 'Campo 3' }]
    expect(nextBoardName(boards)).toBe('Campo 2')
  })
  it('empieza en Campo 1 si no hay ninguno', () => {
    expect(nextBoardName([])).toBe('Campo 1')
  })
})

describe('duplicateBoard', () => {
  it('copia jugadores con ids nuevos y no comparte referencias', () => {
    const src = {
      id: 'a',
      name: 'Campo 1',
      orientation: 'vertical',
      view: 'a',
      benchOpen: false,
      players: [{ id: 'p1', name: 'Ana', side: 'a', d: 0.5, s: 0.5 }],
    }
    let n = 0
    const mk = () => `new${++n}`
    const dup = duplicateBoard(src, 'Campo 2', mk)
    expect(dup.id).not.toBe('a')
    expect(dup.name).toBe('Campo 2')
    expect(dup.orientation).toBe('vertical')
    expect(dup.players[0].id).not.toBe('p1')
    expect(dup.players[0].name).toBe('Ana')
    // independencia: mutar copia no afecta original
    dup.players[0].name = 'X'
    expect(src.players[0].name).toBe('Ana')
  })
})

describe('makeId', () => {
  it('genera ids distintos', () => {
    expect(makeId()).not.toBe(makeId())
  })
})
