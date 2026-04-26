// Sequence utilities, geometry helpers, Bounds.

// Group consecutive equal elements into [start, stop) ranges.
export const runs = seq => {
  const out = []
  if (!seq.length) return out
  let start   = 0
  let current = seq[0]
  for (let i = 1; i < seq.length; i++)
    if (seq[i] != current) {
      out.push([start, i])
      start   = i
      current = seq[i]
    }
  out.push([start, seq.length])
  return out
}


// Same shape as runs but only yields ranges where the value is truthy.
export const runsWhere = seq => {
  const out = []
  if (!seq.length) return out
  let start   = 0
  let current = seq[0]
  for (let i = 1; i < seq.length; i++)
    if (seq[i] != current) {
      if (current) out.push([start, i])
      start   = i
      current = seq[i]
    }
  if (current) out.push([start, seq.length])
  return out
}


// Merge ranges whose gap (in t units) is less than delta.
export const condense = (ranges, t, delta) => {
  if (!ranges.length) return []
  const out      = []
  let [start, stop] = ranges[0]
  for (let i = 1; i < ranges.length; i++) {
    const [a, b] = ranges[i]
    if (t[a] - t[stop] < delta) stop = b
    else {
      out.push([start, stop])
      start = a
      stop  = b
    }
  }
  out.push([start, stop])
  return out
}


// Index of the first element not less than value, or -1.
export const findFirstGe = (seq, value) => {
  let left  = 0
  let right = seq.length
  while (left < right) {
    const mid = (left + right) >> 1
    if (seq[mid] < value) left = mid + 1
    else right = mid
  }
  return left == seq.length ? -1 : left
}


// Douglas-Peucker line simplification, breadth-first, capped at maxIndexes.
// epsilon is in the same units as x/y.
export const incrDouglasPeucker = (x, y, epsilon, maxIndexes = Infinity) => {
  const indexes = new Set([0])
  const queue   = [[0, x.length - 1]]
  let qi = 0
  while (qi < queue.length) {
    const [left, right] = queue[qi++]
    indexes.add(right)
    if (indexes.size == maxIndexes) break

    const kx = y[left] - y[right]
    const ky = x[right] - x[left]
    const c  = x[left] * y[right] - x[right] * y[left]
    let pivot   = left + 1
    let maxDist = Math.abs(kx * x[pivot] + ky * y[pivot] + c)
    for (let j = left + 2; j < right; j++) {
      const dist = Math.abs(kx * x[j] + ky * y[j] + c)
      if (maxDist < dist) {
        maxDist = dist
        pivot   = j
      }
    }
    const dx = x[right] - x[left]
    const dy = y[right] - y[left]
    maxDist /= Math.sqrt(dx * dx + dy * dy)

    if (epsilon < maxDist) {
      indexes.add(pivot)
      if (indexes.size == maxIndexes) break
      queue.push([left, pivot])
      queue.push([pivot, right])
    }
  }
  return [...indexes].sort((a, b) => a - b)
}


// Recursive prominence-based extrema picker.
// Returns Map of index -> level, where level is the smallest index in
// epsilons whose threshold the prominence meets.
export const salient2 = (seq, epsilons) => {
  const out = new Map()
  if (!seq.length) return out
  out.set(0, 0)
  out.set(seq.length - 1, 0)

  const helper = (start, stop) => {
    if (stop - start < 2) return
    let delta = 0
    let left  = start
    let right = stop

    if (seq[start] <= seq[stop]) {
      let maxIndex = start
      for (let i = start + 1; i <= stop; i++) {
        if (seq[maxIndex] < seq[i]) maxIndex = i
        else if (delta < seq[maxIndex] - seq[i]) {
          left  = maxIndex
          right = i
          delta = seq[maxIndex] - seq[i]
        }
      }
    }
    if (seq[stop] <= seq[start]) {
      let minIndex = start
      for (let i = start + 1; i <= stop; i++) {
        if (seq[i] < seq[minIndex]) minIndex = i
        else if (delta < seq[i] - seq[minIndex]) {
          left  = minIndex
          right = i
          delta = seq[i] - seq[minIndex]
        }
      }
    }

    if (epsilons[epsilons.length - 1] <= delta &&
        (left != start || right != stop)) {
      for (let i = 0; i < epsilons.length; i++) {
        if (delta < epsilons[i]) continue
        if (!out.has(left)  || i < out.get(left))  out.set(left, i)
        if (!out.has(right) || i < out.get(right)) out.set(right, i)
      }
      helper(start, left)
      helper(left, right)
      helper(right, stop)
    }
  }
  helper(0, seq.length - 1)
  return out
}


// Floor a Date to a multiple of stepSeconds, in UTC.
export const datetimeFloor = (dt, stepSeconds) => {
  const t = dt.getTime()
  if (3600 <= stepSeconds) {
    const stepHours = (stepSeconds / 3600) | 0
    const d = new Date(Date.UTC(
      dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate(),
      dt.getUTCHours() - dt.getUTCHours() % stepHours, 0, 0))
    return d
  }
  if (60 <= stepSeconds) {
    const stepMin = (stepSeconds / 60) | 0
    const d = new Date(Date.UTC(
      dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate(),
      dt.getUTCHours(), dt.getUTCMinutes() - dt.getUTCMinutes() % stepMin, 0))
    return d
  }
  if (1 <= stepSeconds)
    return new Date(t - (dt.getUTCSeconds() % stepSeconds) * 1000)
  return new Date(t)
}


// Min/max tracker.
export class Bounds {
  constructor(value) {
    if (Array.isArray(value)) {
      this.min = value[0]
      this.max = value[0]
      for (let i = 1; i < value.length; i++) {
        if (value[i] < this.min) this.min = value[i]
        else if (this.max < value[i]) this.max = value[i]
      }
    } else {
      this.min = value
      this.max = value
    }
  }


  update(value) {
    if (value instanceof Bounds) {
      if (value.min < this.min) this.min = value.min
      if (this.max < value.max) this.max = value.max
    } else {
      if (value < this.min) this.min = value
      if (this.max < value) this.max = value
    }
  }


  tuple() {return [this.min, this.max]}
}
