// Track: filtered, time-indexed flight log with derived analysis.

import {
  runs, runsWhere, condense, findFirstGe, incrDouglasPeucker, Bounds,
} from './utils.js'


export const UNKNOWN = 0
export const THERMAL = 1
export const GLIDE   = 2
export const DIVE    = 3


// Time-indexed flight log. Construct via `new Track(coords, opts)` where
// coords is a list of Coord with .dt set. The constructor filters obvious
// GPS errors and runs analysis.
export class Track {
  constructor(coords, opts = {}) {
    this.coords = Track._filter(coords)
    this.t = this.coords.map(c => (c.dt.getTime() / 1000) | 0)
    this.filename    = opts.filename    || null
    this.pilotName   = opts.pilotName   || null
    this.gliderType  = opts.gliderType  || null
    this.gliderId    = opts.gliderId    || null
    this.declaration = opts.declaration || null
    this._analyse(20)
  }


  // Drop points with implausible speed (over 100 m/s) or vspeed (over 30 m/s).
  // TODO replace with Kahlman filter?
  // TODO cope with erroneous points at start of track
  static _filter(coords) {
    const out = [coords[0]]
    let last  = coords[0]
    for (const c of coords) {
      if (c.dt <= last.dt) continue
      const ds = last.distanceTo(c)
      const dt = (c.dt - last.dt) / 1000
      if (dt == 0 || 100 < ds / dt) continue
      const dz = c.ele - last.ele
      if (dz / dt < -30 || 30 < dz / dt) continue
      out.push(c)
      last = c
    }
    return out
  }


  // Coord at an arbitrary Date, by linear interpolation between samples.
  coordAt(dt) {
    const t = (dt.getTime() / 1000) | 0
    if (t < this.t[0]) return this.coords[0]
    if (this.t[this.t.length - 1] <= t)
      return this.coords[this.coords.length - 1]
    const i = findFirstGe(this.t, t)
    if (this.t[i] == t) return this.coords[i]
    const delta = (t - this.t[i - 1]) / (this.t[i] - this.t[i - 1])
    return this.coords[i - 1].interpolate(this.coords[i], delta)
  }


  // Compute speed/climb/tec/progress series (sliding window of `dt` seconds)
  // and segment the flight into thermals, glides, and dives.
  _analyse(dt) {
    const n = this.coords.length
    const period = (this.coords[n - 1].dt - this.coords[0].dt) / 1000 / n
    if (dt < 2 * period) dt = 2 * period

    this.bounds = {
      ele:   new Bounds(this.coords.map(c => c.ele)),
      time:  new Bounds([this.coords[0].dt, this.coords[n - 1].dt]),
      t:     new Bounds([this.t[0], this.t[n - 1]]),
    }
    this.elevationData =
      this.bounds.ele.min != 0 || this.bounds.ele.max != 0

    // Cumulative distance and per-segment mean elevation.
    this.s = [0]
    for (let i = 1; i < n; i++)
      this.s.push(this.s[i - 1] + this.coords[i - 1].distanceTo(this.coords[i]))
    this.ele = []
    for (let i = 1; i < n; i++)
      this.ele.push((this.coords[i - 1].ele + this.coords[i].ele) / 2)

    // Aggregate climb stats.
    this.totalDzPositive = 0
    this.maxDzPositive   = 0
    let minEle = this.coords[0].ele
    for (let i = 1; i < n; i++) {
      const dz = this.coords[i].ele - this.coords[i - 1].ele
      if (0 < dz) this.totalDzPositive += dz
      if (this.coords[i].ele < minEle) minEle = this.coords[i].ele
      else if (this.maxDzPositive < this.coords[i].ele - minEle)
        this.maxDzPositive = this.coords[i].ele - minEle
    }

    // Sliding-window speed, climb, total energy compensated climb, progress.
    this.speed    = []
    this.climb    = []
    this.tec      = []
    this.progress = []
    let i0 = 0
    let i1 = 0
    for (let i = 1; i < n; i++) {
      const t0 = (this.t[i - 1] + this.t[i]) / 2 - dt / 2
      while (this.t[i0] <= t0) i0++

      let coord0, s0
      if (i0 == 0) {
        coord0 = this.coords[0]
        s0     = this.s[0]
      } else {
        const d = (t0 - this.t[i0 - 1]) / (this.t[i0] - this.t[i0 - 1])
        coord0  = this.coords[i0 - 1].interpolate(this.coords[i0], d)
        s0      = (1 - d) * this.s[i0 - 1] + d * this.s[i0]
      }

      const t1 = t0 + dt
      while (i1 < n && this.t[i1] < t1) i1++

      let coord1, s1
      if (i1 == n) {
        coord1 = this.coords[n - 1]
        s1     = this.s[n - 1]
      } else {
        const d = (t1 - this.t[i1 - 1]) / (this.t[i1] - this.t[i1 - 1])
        coord1  = this.coords[i1 - 1].interpolate(this.coords[i1], d)
        s1      = (1 - d) * this.s[i1 - 1] + d * this.s[i1]
      }

      const ds  = s1 - s0
      const ds2 = s1 * s1 - s0 * s0
      const dz  = coord1.ele - coord0.ele
      const dp  = coord0.distanceTo(coord1)

      let progress
      if (ds == 0)         progress = 0
      else if (ds < dp)    progress = 1
      else                 progress = dp / ds

      this.speed.push(3.6 * ds / dt)
      this.climb.push(dz / dt)
      this.tec.push(dz / dt + ds2 / (2 * 9.80665))
      this.progress.push(progress)
    }
    this.bounds.speed = new Bounds(this.speed)
    this.bounds.climb = new Bounds(this.climb)
    this.bounds.tec   = new Bounds(this.tec)

    // Per-segment state classification.
    const state = new Array(n - 1).fill(UNKNOWN)

    const glide = this.progress.map(p => 0.9 <= p)
    for (const [a, b] of condense(runsWhere(glide), this.t, 60))
      for (let i = a; i < b; i++) state[i] = GLIDE

    const dive = this.progress.map((p, i) => p < 0.9 && this.climb[i] < 1)
    for (const [a, b] of condense(runsWhere(dive), this.t, 30))
      if (this.coords[b].ele - this.coords[a].ele < -100)
        for (let i = a; i < b; i++) state[i] = DIVE

    const thermal = this.progress.map((p, i) =>
      (p < 0.9 && 0 < this.climb[i]) ||
      (this.speed[i] < 10 && 0 < this.climb[i]) ||
      (1 < this.climb[i]))
    for (const [a, b] of condense(runsWhere(thermal), this.t, 60))
      for (let i = a; i < b; i++) state[i] = THERMAL

    this.thermals = []
    this.glides   = []
    this.dives    = []
    for (const [a, b] of runs(state)) {
      const duration = this.t[b] - this.t[a]
      const dz = this.coords[b].ele - this.coords[a].ele
      const kind = state[a]
      if      (kind == THERMAL && 60  <= duration && 50 < dz) this.thermals.push([a, b])
      else if (kind == DIVE    && 30  <= duration && dz / duration < -2) this.dives.push([a, b])
      else if (kind == GLIDE   && 120 <= duration) this.glides.push([a, b])
    }
  }
}


// Returns a Douglas-Peucker simplified [(t, altitude), ...] list for the
// given track. t is unix seconds, altitude in meters. epsilon is in meters
// of perpendicular deviation.
export const simplifiedAltitudeProfile = (track, epsilon = 1, maxPoints = Infinity) => {
  const indexes = incrDouglasPeucker(
    track.t, track.coords.map(c => c.ele), epsilon, maxPoints)
  return indexes.map(i => [track.t[i], track.coords[i].ele])
}
