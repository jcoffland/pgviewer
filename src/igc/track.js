// Track: filtered, time-indexed flight log with derived analysis.

import {
  runs, runsWhere, condense, findFirstGe, incrDouglasPeucker, Bounds,
} from './utils.js'


export const UNKNOWN = 0
export const THERMAL = 1
export const GLIDE   = 2
export const DIVE    = 3


// Outlier filter parameters (constant-velocity Kalman per axis).
//
// PROCESS_VAR is the variance of unmodeled acceleration. A paraglider's
// real acceleration is rarely above 5 m/s^2, so sigma_a ~ 2 m/s^2 means
// q ~ 4 m^2/s^4. This sets how fast the filter's uncertainty grows when
// no measurement arrives.
//
// MEAS_VAR is the GPS measurement variance. Civilian GPS is ~5 m sigma
// horizontal, ~10 m vertical, so r = 25 m^2 and 100 m^2.
//
// GATE is the chi-squared threshold for rejection: a measurement whose
// Mahalanobis distance squared from the prediction exceeds GATE on any
// axis is treated as an outlier and discarded. 16 = 4 sigma, lenient
// enough to keep maneuvers, tight enough to drop most GPS spikes.
const PROCESS_VAR_HORIZ = 4
const PROCESS_VAR_VERT  = 4
const MEAS_VAR_HORIZ    = 25
const MEAS_VAR_VERT     = 100
const INIT_VEL_VAR      = 100   // m^2/s^2; initial velocity uncertainty
const GATE              = 16    // 4 sigma
const R_EARTH           = 6371000


// 1D constant-velocity Kalman filter. Tracks a single axis (position +
// velocity); used in triplicate (east, north, up) by Track._filter.
class Kalman1D {
  constructor(processVar, measVar) {
    this.q = processVar
    this.r = measVar
    this.x = 0     // position
    this.v = 0     // velocity
    // Covariance, row-major 2x2: [[a, b], [c, d]]
    this.P = [0, 0, 0, 0]
  }

  init(z) {
    this.x = z
    this.v = 0
    this.P = [this.r, 0, 0, INIT_VEL_VAR]
  }

  // Save/restore so a rejected measurement doesn't leave stale predictions.
  snapshot() {return [this.x, this.v, ...this.P]}
  restore(s) {this.x = s[0]; this.v = s[1]; this.P = s.slice(2)}

  // Propagate state and covariance forward by dt seconds.
  predict(dt) {
    this.x += this.v * dt
    const [a, b, c, d] = this.P
    const a1 = a + dt * (b + c) + dt * dt * d
    const b1 = b + dt * d
    const c1 = c + dt * d
    const d1 = d
    const dt2 = dt * dt
    const dt3 = dt2 * dt
    const dt4 = dt3 * dt
    this.P = [
      a1 + this.q * dt4 / 4,
      b1 + this.q * dt3 / 2,
      c1 + this.q * dt3 / 2,
      d1 + this.q * dt2,
    ]
  }

  // Mahalanobis distance squared between a measurement and the prediction.
  gate(z) {
    const innov = z - this.x
    const S = this.P[0] + this.r
    return innov * innov / S
  }

  // Standard scalar Kalman update for a position measurement.
  update(z) {
    const S = this.P[0] + this.r
    const k0 = this.P[0] / S
    const k1 = this.P[2] / S
    const innov = z - this.x
    this.x += k0 * innov
    this.v += k1 * innov
    const [a, b, c, d] = this.P
    this.P = [
      a - k0 * a,
      b - k0 * b,
      c - k1 * a,
      d - k1 * b,
    ]
  }
}


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
    this.device      = opts.device      || null
    this.remark      = opts.remark      || null
    this.declaration = opts.declaration || null
    this._analyse(20)
  }


  // Reject points that disagree with a constant-velocity Kalman prediction
  // by more than GATE sigma on any of east/north/up. The filter's variance
  // grows over rejected stretches so legitimate data after a gap is
  // accepted again.
  static _filter(coords) {
    if (!coords.length) return []

    // Project to local east/north meters around the first coord.
    const lat0 = coords[0].lat
    const lon0 = coords[0].lon
    const cosLat0 = Math.cos(lat0)
    const toEast  = c => R_EARTH * (c.lon - lon0) * cosLat0
    const toNorth = c => R_EARTH * (c.lat - lat0)

    const kE = new Kalman1D(PROCESS_VAR_HORIZ, MEAS_VAR_HORIZ)
    const kN = new Kalman1D(PROCESS_VAR_HORIZ, MEAS_VAR_HORIZ)
    const kZ = new Kalman1D(PROCESS_VAR_VERT,  MEAS_VAR_VERT)

    const out = []
    let prevDt = null
    for (const c of coords) {
      if (!out.length) {
        kE.init(toEast(c))
        kN.init(toNorth(c))
        kZ.init(c.ele)
        out.push(c)
        prevDt = c.dt
        continue
      }
      const dt = (c.dt - prevDt) / 1000
      if (dt <= 0) continue

      const sE = kE.snapshot()
      const sN = kN.snapshot()
      const sZ = kZ.snapshot()
      kE.predict(dt); kN.predict(dt); kZ.predict(dt)

      const ze = toEast(c)
      const zn = toNorth(c)
      const zz = c.ele
      if (GATE < kE.gate(ze) || GATE < kN.gate(zn) || GATE < kZ.gate(zz)) {
        kE.restore(sE); kN.restore(sN); kZ.restore(sZ)
        continue
      }
      kE.update(ze); kN.update(zn); kZ.update(zz)
      out.push(c)
      prevDt = c.dt
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
