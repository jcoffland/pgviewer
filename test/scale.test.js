import {describe, it, expect} from 'vitest'
import {Scale, ZeroCenteredScale, TimeScale} from '../src/igc/scale.js'
import {defaultGradient} from '../src/igc/color.js'


describe('Scale', () => {
  it('normalizes within range', () => {
    const s = new Scale([0, 100])
    expect(s.normalize(50)).toBe(0.5)
  })

  it('clamps below range', () => {
    const s = new Scale([0, 100])
    expect(s.normalize(-50)).toBe(0)
  })

  it('clamps above range', () => {
    const s = new Scale([0, 100])
    expect(s.normalize(150)).toBe(1)
  })

  it('discretizes', () => {
    const s = new Scale([0, 32])
    expect(s.discretize(0)).toBe(0)
    expect(s.discretize(32)).toBe(31)
    expect(s.discretize(16)).toBe(16)
  })

  it('produces colors of length n', () => {
    const s = new Scale([0, 1], null, defaultGradient)
    const colors = s.colors(8)
    expect(colors.length).toBe(8)
    expect(colors[0].length).toBe(4)  // rgba
  })
})


describe('ZeroCenteredScale', () => {
  it('zero maps to 0.5', () => {
    const s = new ZeroCenteredScale([-5, 5])
    expect(s.normalize(0)).toBe(0.5)
  })

  it('half-positive maps to 0.75', () => {
    const s = new ZeroCenteredScale([-5, 5])
    expect(s.normalize(2.5)).toBe(0.75)
  })

  it('half-negative maps to 0.25', () => {
    const s = new ZeroCenteredScale([-5, 5])
    expect(s.normalize(-2.5)).toBe(0.25)
  })

  it('clamps below', () => {
    const s = new ZeroCenteredScale([-5, 5])
    expect(s.normalize(-100)).toBe(0)
  })

  it('clamps above', () => {
    const s = new ZeroCenteredScale([-5, 5])
    expect(s.normalize(100)).toBe(1)
  })
})


describe('TimeScale', () => {
  it('exposes range as unix seconds', () => {
    const lo = new Date(Date.UTC(2024, 0, 1, 0, 0, 0))
    const hi = new Date(Date.UTC(2024, 0, 1, 1, 0, 0))
    const s = new TimeScale([lo, hi])
    expect(s.range[1] - s.range[0]).toBe(3600)
  })
})
