// IGC file parser. Reads B (track), C (waypoint), and HFDTE/H header
// records; ignores the rest.

import {Coord} from './coord.js'
import {Track} from './track.js'


const B_RE = /^B(\d{2})(\d{2})(\d{2})(\d{2})(\d{5})([NS])(\d{3})(\d{5})([EW])([AV])(\d{5}|-\d{4})(\d{5}|-\d{4}).*$/
// C task header: C followed by 10 two-digit groups (date+time+task num+nTPs)
const C1_RE = /^C(?:\d{2}){10}\w{4}.*$/
const C2_RE = /^C(\d{2})(\d{5})([NS])(\d{3})(\d{5})([EW])(.*)$/
const HFDTE_RE = /^HFDTE(?:DATE:)?(\d\d)(\d\d)(\d\d)(?:,\d\d)?$/
const H_RE = /^H[FOP]([0-9A-Z]{3}).*?:(.*)$/
const NOT_SET_RE = /^\s*(not\s+set|n\/?a)?\s*$/i


// Public.
// Parse the full text of an IGC file and return a Track.
// `filename` is preserved on the Track for display.
export const parseIgc = (text, filename = null) => {
  const state = {b: [], c: [], h: {}, date: null, errors: []}
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trimEnd()
    if (!line.length) continue
    try {
      switch (line[0]) {
        case 'B': parseB(line, state); break
        case 'C': parseC(line, state); break
        case 'H': parseH(line, state); break
      }
    } catch (e) {
      state.errors.push({line, msg: e.message})
    }
  }

  if (!state.b.length) throw new Error('no B records in IGC file')

  // Pressure altitude is smooth but uncalibrated; GPS altitude is
  // calibrated but noisy. Use pressure shifted by the median (gps -
  // pressure) offset to get a smooth altitude in absolute reference.
  // Falls back to one or the other if a series is missing.
  const havePress = state.b.some(b => b.alt != 0)
  const haveGps   = state.b.some(b => b.ele != 0)
  let elev
  if (havePress && haveGps)        elev = pressureWithOffset(state.b)
  else if (havePress)              elev = state.b.map(b => b.alt)
  else                             elev = state.b.map(b => b.ele)

  const coords = state.b.map((b, i) => Coord.deg(b.lat, b.lon, elev[i], b.dt))

  const opts = {filename}
  for (const [k, attr] of [['plt', 'pilotName'],
                            ['gty', 'gliderType'],
                            ['gid', 'gliderId']]) {
    const v = state.h[k]
    if (v && !NOT_SET_RE.test(v)) opts[attr] = v.trim()
  }

  if (state.c.length) {
    const tps = state.c.map(c => ({
      name:   c.name,
      coord:  Coord.deg(c.lat, c.lon, 0),
      radius: 0,
    }))
    opts.declaration = {name: 'Declaration', tps}
  }

  return new Track(coords, opts)
}


const parseB = (line, state) => {
  const m = line.match(B_RE)
  if (!m) throw new Error('bad B record')
  if (!state.date) throw new Error('B record before HFDTE')
  const hh = +m[1], mm = +m[2], ss = +m[3]
  const d = state.date
  let dt = new Date(Date.UTC(
    d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), hh, mm, ss))
  // Roll over to next day if time goes backwards (multi-day flight).
  if (state.b.length && dt < state.b[state.b.length - 1].dt) {
    state.date = new Date(d.getTime() + 86400 * 1000)
    dt = new Date(Date.UTC(
      state.date.getUTCFullYear(),
      state.date.getUTCMonth(),
      state.date.getUTCDate(), hh, mm, ss))
  }

  let lat = +m[4] + +m[5] / 60000
  if (m[6] == 'S') lat = -lat
  let lon = +m[7] + +m[8] / 60000
  if (m[9] == 'W') lon = -lon

  state.b.push({dt, lat, lon, alt: +m[11], ele: +m[12]})
}


const parseC = (line, state) => {
  if (C1_RE.test(line)) return  // task header line; ignored
  const m = line.match(C2_RE)
  if (!m) throw new Error('bad C record')
  let lat = +m[1] + +m[2] / 60000
  if (m[3] == 'S') lat = -lat
  let lon = +m[4] + +m[5] / 60000
  if (m[6] == 'W') lon = -lon
  if (lat == 0 && lon == 0) return
  state.c.push({lat, lon, name: m[7]})
}


const parseH = (line, state) => {
  const dm = line.match(HFDTE_RE)
  if (dm) {
    const day = +dm[1], month = +dm[2], year = +dm[3]
    state.date = new Date(Date.UTC(2000 + year, month - 1, day))
    return
  }
  const m = line.match(H_RE)
  if (m) state.h[m[1].toLowerCase()] = m[2]
}


// Build a smooth altitude series from pressure altitude shifted to track
// the GPS altitude in absolute reference. The offset b(t) is allowed to
// drift slowly (atmospheric pressure changes during the flight) but is
// stiff enough to reject GPS spikes. A scalar Kalman filter on the offset:
//
//   process: b_{k+1} = b_k + w,    var(w) per second = OFFSET_DRIFT_VAR
//   measure: z_k = gps_k - press_k = b_k + v,  var(v) = GPS_ELE_VAR
//
// Median-initialized so the warm-up state isn't fooled by an early run of
// bad GPS data.
const OFFSET_DRIFT_VAR = 0.0025  // m^2/s; ~0.05 m/s drift sigma
const GPS_ELE_VAR      = 100     // m^2; ~10 m sigma
const OFFSET_INIT_VAR  = 25      // m^2; 5m sigma after median init
const OFFSET_GATE      = 16      // 4 sigma

const pressureWithOffset = bRecords => {
  // Median seed for warm start.
  const diffs = []
  for (const b of bRecords)
    if (b.alt != 0 && b.ele != 0) diffs.push(b.ele - b.alt)
  if (!diffs.length) return bRecords.map(b => b.alt)
  diffs.sort((a, b) => a - b)
  const seed = diffs[diffs.length >> 1]

  let offset = seed
  let P      = OFFSET_INIT_VAR
  let prevDt = null
  return bRecords.map(b => {
    if (b.ele != 0) {
      const dt = prevDt ? (b.dt - prevDt) / 1000 : 0
      P += OFFSET_DRIFT_VAR * dt
      const innov = b.ele - b.alt - offset
      const S = P + GPS_ELE_VAR
      if (innov * innov / S < OFFSET_GATE) {
        const K = P / S
        offset += K * innov
        P      -= K * P
      }
      prevDt = b.dt
    }
    return b.alt + offset
  })
}
