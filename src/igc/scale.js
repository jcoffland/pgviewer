// Linear scales mapping a value range onto a gradient.

export class Scale {
  // range is [min, max]; gradient is a function from [0,1] to rgba.
  constructor(range, title = null, gradient = null) {
    this.range    = range
    this.title    = title
    this.gradient = gradient
  }


  normalize(value) {
    const [lo, hi] = this.range
    if (value < lo) return 0
    if (hi <= value) return 1
    return (value - lo) / (hi - lo)
  }


  discretize(value, n = 32) {
    if (value < this.range[0]) return 0
    if (this.range[1] < value) return n - 1
    const k = Math.round(n * this.normalize(value))
    return n - 1 < k ? n - 1 : k
  }


  // Continuous color for a value (no quantization).
  color(value) {return this.gradient(this.normalize(value))}


  colors(n = 32) {
    const out = new Array(n)
    for (let i = 0; i < n; i++) out[i] = this.gradient(i / (n - 1))
    return out
  }
}


// Bilinear scale centered on zero: maps [-|min|..0..|max|] onto [0..0.5..1].
export class ZeroCenteredScale extends Scale {
  normalize(value) {
    const [lo, hi] = this.range
    if (value < 0) return value < lo ? 0 : 0.5 - 0.5 * value / lo
    if (value == 0) return 0.5
    return hi <= value ? 1 : 0.5 + 0.5 * value / hi
  }
}


// Scale over a (Date, Date) range, exposed as unix-second range numbers.
export class TimeScale extends Scale {
  constructor(range, title = null, gradient = null) {
    const [lo, hi] = range
    super([(lo.getTime() / 1000) | 0, (hi.getTime() / 1000) | 0],
          title, gradient)
  }
}
