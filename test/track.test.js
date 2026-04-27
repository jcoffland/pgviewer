import {describe, it, expect} from 'vitest'
import {Coord} from '../src/igc/coord.js'
import {Track, THERMAL, GLIDE} from '../src/igc/track.js'


// Build a synthetic track of N points starting at (lat, lon, ele0), moving
// `lonStep` degrees east per sample, gaining `dEle` meters per sample,
// at `dtSec` seconds between samples. Defaults are paraglider-realistic
// (~7 m/s ground speed, no climb).
const synth = ({n = 30, lat = 45, lon = 10, ele0 = 1000,
                lonStep = 0.0001, dEle = 0, dtSec = 1, t0 = null} = {}) => {
  const start = t0 || new Date(Date.UTC(2024, 5, 15, 10, 0, 0))
  const out = []
  for (let i = 0; i < n; i++)
    out.push(Coord.deg(
      lat,
      lon + i * lonStep,
      ele0 + i * dEle,
      new Date(start.getTime() + i * dtSec * 1000)))
  return out
}


describe('Track filter', () => {
  it('drops out-of-order points', () => {
    const t0 = new Date(Date.UTC(2024, 0, 1, 10, 0, 0))
    const a = Coord.deg(45, 10,        1000, new Date(t0.getTime() + 0))
    const b = Coord.deg(45, 10.0001,   1000, new Date(t0.getTime() + 1000))
    // earlier than b — should be skipped
    const c = Coord.deg(45, 10.0002,   1000, new Date(t0.getTime() + 500))
    const d = Coord.deg(45, 10.0002,   1000, new Date(t0.getTime() + 2000))
    const track = new Track([a, b, c, d])
    expect(track.coords.length).toBe(3)
  })

  it('drops points exceeding ground speed limit', () => {
    const t0 = new Date(Date.UTC(2024, 0, 1, 10, 0, 0))
    const coords = [
      Coord.deg(45, 10,        1000, new Date(t0.getTime() + 0)),
      Coord.deg(45, 10.0001,   1000, new Date(t0.getTime() + 1000)),
      // ~78 km east in 1 second: well over the 33 m/s limit, dropped
      Coord.deg(45, 11,        1000, new Date(t0.getTime() + 2000)),
      Coord.deg(45, 10.0002,   1000, new Date(t0.getTime() + 3000)),
    ]
    const track = new Track(coords)
    expect(track.coords.length).toBe(3)
  })

  it('drops a gross spike in altitude after warmup', () => {
    // 30 seconds of steady level flight at 1000m, then one point that
    // jumps 200m up, then back to normal.
    const t0 = new Date(Date.UTC(2024, 0, 1, 10, 0, 0))
    const lonAt = m => 10 + m * (1 / 78000)
    const coords = []
    for (let i = 0; i < 30; i++)
      coords.push(Coord.deg(
        45, lonAt(7 * i), 1000, new Date(t0.getTime() + i * 1000)))
    // Spike
    coords.push(Coord.deg(
      45, lonAt(7 * 30), 1200, new Date(t0.getTime() + 30000)))
    // Recovery
    coords.push(Coord.deg(
      45, lonAt(7 * 31), 1000, new Date(t0.getTime() + 31000)))
    const track = new Track(coords)
    // 30 steady + 1 recovery; spike rejected.
    expect(track.coords.length).toBe(31)
  })

  it('drops a gross spike in horizontal position after warmup', () => {
    const t0 = new Date(Date.UTC(2024, 0, 1, 10, 0, 0))
    const lonAt = m => 10 + m * (1 / 78000)
    const coords = []
    for (let i = 0; i < 30; i++)
      coords.push(Coord.deg(
        45, lonAt(7 * i), 1000, new Date(t0.getTime() + i * 1000)))
    // Spike: 500m east of where we should be
    coords.push(Coord.deg(
      45, lonAt(7 * 30 + 500), 1000, new Date(t0.getTime() + 30000)))
    coords.push(Coord.deg(
      45, lonAt(7 * 31), 1000, new Date(t0.getTime() + 31000)))
    const track = new Track(coords)
    expect(track.coords.length).toBe(31)
  })

  it('recovers after a long gap with no accepted measurements', () => {
    // Steady flight, then 60 seconds later resume far away. The Kalman
    // predicted variance has grown enough that the new point is accepted.
    const t0 = new Date(Date.UTC(2024, 0, 1, 10, 0, 0))
    const lonAt = m => 10 + m * (1 / 78000)
    const coords = []
    for (let i = 0; i < 30; i++)
      coords.push(Coord.deg(
        45, lonAt(7 * i), 1000, new Date(t0.getTime() + i * 1000)))
    // Resume 60s later; the pilot really is somewhere new
    coords.push(Coord.deg(
      45, lonAt(7 * 30 + 400), 1050, new Date(t0.getTime() + 90000)))
    const track = new Track(coords)
    expect(track.coords.length).toBe(31)  // resumed point accepted
  })
})


describe('Track analysis basics', () => {
  it('computes bounds', () => {
    const track = new Track(synth({n: 20, dEle: 10}))
    expect(track.bounds.ele.min).toBe(1000)
    expect(track.bounds.ele.max).toBe(1190)
  })

  it('detects elevation data', () => {
    const noEle = synth({n: 20, ele0: 0, dEle: 0})
    const track = new Track(noEle)
    expect(track.elevationData).toBe(false)

    const withEle = synth({n: 20, dEle: 5})
    const track2 = new Track(withEle)
    expect(track2.elevationData).toBe(true)
  })

  it('cumulative distance is monotonically non-decreasing', () => {
    const track = new Track(synth({n: 30}))
    for (let i = 1; i < track.s.length; i++)
      expect(track.s[i - 1] <= track.s[i]).toBe(true)
  })

  it('total altitude gain matches a steady climb', () => {
    const track = new Track(synth({n: 30, dEle: 5}))
    // 29 segments * 5m = 145m
    expect(track.totalDzPositive).toBe(145)
  })

  it('speed series is non-empty and length n-1', () => {
    const track = new Track(synth({n: 30}))
    expect(track.speed.length).toBe(track.coords.length - 1)
  })
})


describe('Track segmentation', () => {
  it('detects a long steady climb as a thermal', () => {
    // 200 seconds of climbing 2 m/s with little horizontal progress
    const t0 = new Date(Date.UTC(2024, 0, 1, 10, 0, 0))
    const coords = []
    for (let i = 0; i < 200; i++) {
      // Tiny horizontal motion so progress is low; vertical climb dominates
      coords.push(Coord.deg(
        45 + i * 1e-6,
        10 + i * 1e-6,
        1000 + i * 2,
        new Date(t0.getTime() + i * 1000)))
    }
    const track = new Track(coords)
    expect(track.thermals.length).toBeGreaterThan(0)
  })

  it('detects a long straight glide', () => {
    // 200 seconds of straight horizontal flight, gentle descent
    const t0 = new Date(Date.UTC(2024, 0, 1, 10, 0, 0))
    const coords = []
    for (let i = 0; i < 300; i++)
      coords.push(Coord.deg(
        45,
        10 + i * 0.0001,  // ~11 m/sample, ~40 km/h
        2000 - i * 0.5,   // gentle 0.5 m/s sink
        new Date(t0.getTime() + i * 1000)))
    const track = new Track(coords)
    expect(track.glides.length).toBeGreaterThan(0)
  })
})


describe('Track.coordAt', () => {
  it('clamps before track', () => {
    const track = new Track(synth({n: 20}))
    const before = new Date(track.coords[0].dt.getTime() - 100000)
    expect(track.coordAt(before)).toBe(track.coords[0])
  })

  it('clamps after track', () => {
    const track = new Track(synth({n: 20}))
    const after = new Date(track.coords[track.coords.length - 1].dt.getTime() + 100000)
    expect(track.coordAt(after)).toBe(track.coords[track.coords.length - 1])
  })

  it('returns exact sample at sample time', () => {
    const track = new Track(synth({n: 20}))
    const c = track.coordAt(track.coords[5].dt)
    expect(c).toBe(track.coords[5])
  })

  it('interpolates between samples', () => {
    const track = new Track(synth({n: 20, dtSec: 10, lonStep: 0.001}))
    const mid = new Date(track.coords[5].dt.getTime() + 5000)
    const c = track.coordAt(mid)
    // halfway between coords[5] and coords[6] in lon
    const expectedLon = (track.coords[5].lonDeg + track.coords[6].lonDeg) / 2
    expect(Math.abs(c.lonDeg - expectedLon) < 1e-6).toBe(true)
  })
})
