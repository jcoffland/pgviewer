import {describe, it, expect} from 'vitest'
import {
  hslToRgba, defaultGradient, bilinearGradient, rgbaToHex,
} from '../src/igc/color.js'


// Match Python's hsl_to_rgba within a tolerance for floating-point noise.
const close = (a, b, eps = 1e-9) => Math.abs(a - b) < eps


describe('hslToRgba', () => {
  it('returns gray when saturation is zero', () => {
    expect(hslToRgba(0.5, 0, 0.4)).toEqual([0.4, 0.4, 0.4, 1])
  })

  it('produces pure red for h=0, s=1, l=0.5', () => {
    const [r, g, b, a] = hslToRgba(0, 1, 0.5)
    expect(close(r, 1)).toBe(true)
    expect(close(g, 0)).toBe(true)
    expect(close(b, 0)).toBe(true)
    expect(a).toBe(1)
  })

  it('produces pure green for h=1/3, s=1, l=0.5', () => {
    const [r, g, b] = hslToRgba(1 / 3, 1, 0.5)
    expect(close(r, 0)).toBe(true)
    expect(close(g, 1)).toBe(true)
    expect(close(b, 0)).toBe(true)
  })

  it('produces pure blue for h=2/3, s=1, l=0.5', () => {
    const [r, g, b] = hslToRgba(2 / 3, 1, 0.5)
    expect(close(r, 0)).toBe(true)
    expect(close(g, 0)).toBe(true)
    expect(close(b, 1)).toBe(true)
  })

  it('passes alpha through', () => {
    expect(hslToRgba(0, 1, 0.5, 0.3)[3]).toBe(0.3)
  })
})


describe('defaultGradient', () => {
  it('clamps below to blue', () => {
    expect(defaultGradient(-1)[2]).toBe(1)
  })

  it('clamps above to red', () => {
    expect(defaultGradient(2)[0]).toBe(1)
  })

  it('mid value is green', () => {
    const [r, g, b] = defaultGradient(0.5)
    expect(close(g, 1)).toBe(true)
    expect(close(r, 0)).toBe(true)
    expect(close(b, 0)).toBe(true)
  })
})


describe('bilinearGradient', () => {
  it('clamps below to blue', () => {
    expect(bilinearGradient(-0.5)[2]).toBe(1)
  })

  it('center value is green', () => {
    const [r, g, b] = bilinearGradient(0.5)
    expect(close(g, 1)).toBe(true)
    expect(close(r, 0)).toBe(true)
    expect(close(b, 0)).toBe(true)
  })

  it('clamps above to red', () => {
    expect(bilinearGradient(2)[0]).toBe(1)
  })
})


describe('rgbaToHex', () => {
  it('converts pure colors', () => {
    expect(rgbaToHex([1, 0, 0, 1])).toBe('#ff0000')
    expect(rgbaToHex([0, 1, 0, 1])).toBe('#00ff00')
    expect(rgbaToHex([0, 0, 1, 1])).toBe('#0000ff')
  })

  it('rounds correctly', () => {
    expect(rgbaToHex([0.5, 0.5, 0.5, 1])).toBe('#808080')
  })
})
