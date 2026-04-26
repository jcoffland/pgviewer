// HSL/HSV conversion and gradient helpers.

// Convert (h, s, l) in [0,1] to (r, g, b, a) in [0,1].
export const hslToRgba = (h, s, l, a = 1) => {
  if (s == 0) return [l, l, l, a]

  const hToV = (p, q, t) => {
    if (t < 0) t += 1
    else if (1 < t) t -= 1
    if (t < 1 / 6)   return p + 6 * (q - p) * t
    if (t < 0.5)     return q
    if (t < 2 / 3)   return p + 6 * (q - p) * (2 / 3 - t)
    return p
  }

  const q = l < 0.5 ? l * (s + 1) : l + s - l * s
  const p = 2 * l - q
  return [
    hToV(p, q, h + 1 / 3),
    hToV(p, q, h),
    hToV(p, q, h - 1 / 3),
    a,
  ]
}


// Linear blue->green->red gradient over [0,1].
export const defaultGradient = value => {
  if (value < 0)   return hslToRgba(2 / 3, 1, 0.5)
  if (1 <= value)  return hslToRgba(0, 1, 0.5)
  return hslToRgba(2 * (1 - value) / 3, 1, 0.5)
}


// Bilinear blue->green->red gradient (steeper near center).
export const bilinearGradient = value => {
  let h
  if (value < 0)        h = 2 / 3
  else if (value < 0.5) h = (6 - 4 * value) / 9
  else if (value == 0.5) h = 1 / 3
  else if (value < 1)   h = (4 - 4 * value) / 9
  else                  h = 0
  return hslToRgba(h, 1, 0.5)
}


// (r, g, b, a) in [0,1] to '#RRGGBB' hex (alpha discarded for CSS use).
export const rgbaToHex = ([r, g, b]) => {
  const c = v => Math.round(255 * v).toString(16).padStart(2, '0')
  return '#' + c(r) + c(g) + c(b)
}
