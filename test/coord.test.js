import {describe, it, expect} from 'vitest'
import {Coord, circleCoords, radToCardinal} from '../src/igc/coord.js'


const close = (a, b, eps = 1e-6) => Math.abs(a - b) < eps


describe('Coord', () => {
  it('deg/rad round-trip', () => {
    const c = Coord.deg(45.5, -120.25, 1500)
    expect(close(c.latDeg, 45.5)).toBe(true)
    expect(close(c.lonDeg, -120.25)).toBe(true)
    expect(c.ele).toBe(1500)
  })

  it('distance same point is zero', () => {
    const c = Coord.deg(45, 10, 0)
    expect(c.distanceTo(c)).toBe(0)
  })

  it('distance approximately matches haversine for small step', () => {
    // 1 degree of latitude is about 111 km
    const a = Coord.deg(45, 10, 0)
    const b = Coord.deg(46, 10, 0)
    const d = a.distanceTo(b)
    expect(close(d, 111195, 100)).toBe(true)
  })

  it('initial bearing north is 0', () => {
    const a = Coord.deg(45, 10, 0)
    const b = Coord.deg(46, 10, 0)
    expect(close(a.initialBearingTo(b), 0)).toBe(true)
  })

  it('initial bearing east is approximately pi/2 (great circle, lat=45)', () => {
    const a = Coord.deg(45, 10, 0)
    const b = Coord.deg(45, 11, 0)
    // At 45° N, great-circle bearing east is slightly less than pi/2.
    expect(close(a.initialBearingTo(b), Math.PI / 2, 0.01)).toBe(true)
  })

  it('halfway midpoint elevation averages', () => {
    const a = Coord.deg(45, 10, 1000)
    const b = Coord.deg(46, 10, 2000)
    const m = a.halfwayTo(b)
    expect(m.ele).toBe(1500)
  })

  it('interpolate at 0 returns near self', () => {
    const a = Coord.deg(45, 10, 0)
    const b = Coord.deg(46, 11, 0)
    const m = a.interpolate(b, 0)
    expect(close(m.latDeg, 45, 1e-3)).toBe(true)
    expect(close(m.lonDeg, 10, 1e-3)).toBe(true)
  })

  it('interpolate at 1 returns near other', () => {
    const a = Coord.deg(45, 10, 0)
    const b = Coord.deg(46, 11, 100)
    const m = a.interpolate(b, 1)
    expect(close(m.latDeg, 46, 1e-3)).toBe(true)
    expect(close(m.lonDeg, 11, 1e-3)).toBe(true)
    expect(close(m.ele, 100)).toBe(true)
  })

  it('coordAt north 1km moves about 1/111 deg lat', () => {
    const a = Coord.deg(45, 10, 0)
    const b = a.coordAt(0, 1000)
    expect(close(b.latDeg - 45, 1 / 111, 1e-3)).toBe(true)
  })
})


describe('circleCoords', () => {
  it('produces a closed polyline whose points are radius from center', () => {
    const c = Coord.deg(45, 10, 0)
    const points = circleCoords(c, 500)
    expect(points.length).toBeGreaterThan(8)
    for (const p of points) {
      const d = c.distanceTo(p)
      // points sit slightly outside the radius by `error` meters
      expect(close(d, 500, 1)).toBe(true)
    }
  })
})


describe('radToCardinal', () => {
  it('north', () => {expect(radToCardinal(0)).toBe('N')})
  it('east',  () => {expect(radToCardinal(Math.PI / 2)).toBe('E')})
  it('south', () => {expect(radToCardinal(Math.PI)).toBe('S')})
  it('west',  () => {expect(radToCardinal(-Math.PI / 2)).toBe('W')})
  it('NE',    () => {expect(radToCardinal(Math.PI / 4)).toBe('NE')})
})
