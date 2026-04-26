import {describe, it, expect} from 'vitest'
import {
  runs, runsWhere, condense, findFirstGe, incrDouglasPeucker,
  salient2, datetimeFloor, Bounds,
} from '../src/igc/utils.js'


describe('runs', () => {
  it('groups equal consecutive elements', () => {
    expect(runs([1, 1, 2, 2, 2, 3])).toEqual([[0, 2], [2, 5], [5, 6]])
  })

  it('handles empty input', () => {
    expect(runs([])).toEqual([])
  })

  it('handles single-element input', () => {
    expect(runs([7])).toEqual([[0, 1]])
  })

  it('handles all-different elements', () => {
    expect(runs([1, 2, 3])).toEqual([[0, 1], [1, 2], [2, 3]])
  })
})


describe('runsWhere', () => {
  it('yields only truthy ranges', () => {
    expect(runsWhere([0, 1, 1, 0, 0, 1])).toEqual([[1, 3], [5, 6]])
  })

  it('handles all falsy', () => {
    expect(runsWhere([0, 0, 0])).toEqual([])
  })

  it('handles all truthy', () => {
    expect(runsWhere([1, 1, 1])).toEqual([[0, 3]])
  })
})


describe('condense', () => {
  it('merges ranges within delta', () => {
    // t = [0, 1, 2, 3, 4, 5, 6, 7]; ranges at [0,2) and [3,5); gap=1, delta=2
    const ranges = [[0, 2], [3, 5]]
    const t = [0, 1, 2, 3, 4, 5]
    expect(condense(ranges, t, 2)).toEqual([[0, 5]])
  })

  it('keeps ranges separate when gap exceeds delta', () => {
    const ranges = [[0, 2], [5, 7]]
    const t = [0, 1, 2, 3, 4, 5, 6]
    expect(condense(ranges, t, 2)).toEqual([[0, 2], [5, 7]])
  })

  it('handles empty input', () => {
    expect(condense([], [], 5)).toEqual([])
  })
})


describe('findFirstGe', () => {
  it('finds exact match', () => {
    expect(findFirstGe([1, 3, 5, 7], 5)).toBe(2)
  })

  it('finds insertion point', () => {
    expect(findFirstGe([1, 3, 5, 7], 4)).toBe(2)
  })

  it('returns -1 when value exceeds all', () => {
    expect(findFirstGe([1, 3, 5], 99)).toBe(-1)
  })

  it('returns 0 for value below all', () => {
    expect(findFirstGe([1, 3, 5], -1)).toBe(0)
  })
})


describe('incrDouglasPeucker', () => {
  it('keeps endpoints for a straight line', () => {
    const x = [0, 1, 2, 3, 4]
    const y = [0, 1, 2, 3, 4]
    expect(incrDouglasPeucker(x, y, 0.1)).toEqual([0, 4])
  })

  it('keeps salient bend', () => {
    const x = [0, 1, 2, 3, 4]
    const y = [0, 0, 5, 0, 0]
    const idx = incrDouglasPeucker(x, y, 0.5)
    expect(idx).toContain(2)
    expect(idx[0]).toBe(0)
    expect(idx[idx.length - 1]).toBe(4)
  })

  it('honours maxIndexes cap', () => {
    const x = Array.from({length: 100}, (_, i) => i)
    const y = x.map(v => Math.sin(v))
    const idx = incrDouglasPeucker(x, y, 0.01, 5)
    expect(idx.length).toBeLessThanOrEqual(5)
  })
})


describe('salient2', () => {
  it('always includes endpoints', () => {
    const out = salient2([1, 2, 3], [0.5])
    expect(out.has(0)).toBe(true)
    expect(out.has(2)).toBe(true)
  })

  it('finds a peak above threshold', () => {
    const seq = [0, 0, 0, 5, 0, 0, 0]
    const out = salient2(seq, [3])
    expect(out.has(3)).toBe(true)
  })

  it('assigns lower level to higher prominence', () => {
    const seq = [0, 0, 10, 0, 0, 2, 0]
    const out = salient2(seq, [5, 1])
    expect(out.get(2)).toBe(0)  // big peak: meets first threshold
    expect(out.get(5)).toBe(1)  // small peak: only meets second
  })
})


describe('datetimeFloor', () => {
  it('floors to the hour', () => {
    const dt = new Date(Date.UTC(2024, 5, 15, 10, 47, 33))
    const out = datetimeFloor(dt, 3600)
    expect(out.toISOString()).toBe('2024-06-15T10:00:00.000Z')
  })

  it('floors to 5 minutes', () => {
    const dt = new Date(Date.UTC(2024, 5, 15, 10, 47, 33))
    const out = datetimeFloor(dt, 300)
    expect(out.toISOString()).toBe('2024-06-15T10:45:00.000Z')
  })

  it('floors to seconds', () => {
    const dt = new Date(Date.UTC(2024, 5, 15, 10, 47, 33))
    const out = datetimeFloor(dt, 10)
    expect(out.toISOString()).toBe('2024-06-15T10:47:30.000Z')
  })
})


describe('Bounds', () => {
  it('initializes from array', () => {
    const b = new Bounds([3, 1, 4, 1, 5, 9, 2, 6])
    expect(b.min).toBe(1)
    expect(b.max).toBe(9)
  })

  it('initializes from scalar', () => {
    const b = new Bounds(7)
    expect(b.min).toBe(7)
    expect(b.max).toBe(7)
  })

  it('updates from scalar', () => {
    const b = new Bounds([5])
    b.update(3)
    b.update(8)
    expect(b.min).toBe(3)
    expect(b.max).toBe(8)
  })

  it('updates from another Bounds', () => {
    const a = new Bounds([5])
    const b = new Bounds([1, 9])
    a.update(b)
    expect(a.min).toBe(1)
    expect(a.max).toBe(9)
  })

  it('returns tuple', () => {
    expect(new Bounds([2, 5]).tuple()).toEqual([2, 5])
  })
})
