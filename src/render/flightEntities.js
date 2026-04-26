// Build Cesium entities for a Flight, grouped by feature. The viewer
// adds/removes groups as the UI toggles them.

import * as Cesium from 'cesium'
import {
  Bounds, Scale, ZeroCenteredScale,
  defaultGradient, bilinearGradient,
  salient2, datetimeFloor, circleCoords,
} from '../igc/index.js'


const TRACK_WIDTH      = 2
const SHADOW_WIDTH     = 1
const SHADOW_COLOR     = Cesium.Color.fromCssColorString('#000000')
const SHADOW_FILL      = Cesium.Color.fromCssColorString('#000000').withAlpha(0.3)
const TIME_MARK_COLOR  = Cesium.Color.fromCssColorString('#33ffff')
const THERMAL_COLOR    = Cesium.Color.fromCssColorString('#ff3333')
const GLIDE_COLOR      = Cesium.Color.fromCssColorString('#33ff33')
const DIVE_COLOR       = Cesium.Color.fromCssColorString('#3333ff')
const TASK_COLOR       = Cesium.Color.fromCssColorString('#ff33ff')


const rgbaToCesium = ([r, g, b, a]) => new Cesium.Color(r, g, b, a)
const hexToCesium  = hex            => Cesium.Color.fromCssColorString(hex)


const cartesians = coords => Cesium.Cartesian3.fromDegreesArrayHeights(
  coords.flatMap(c => [c.lonDeg, c.latDeg, c.ele]))


// --- bounds + scales ----------------------------------------------------

export const aggregateBounds = flights => {
  const out = {ele: null, climb: null, tec: null, speed: null, t: null}
  for (const f of flights)
    for (const k of Object.keys(out)) {
      const b = f.track.bounds[k]
      if (!b) continue
      if (!out[k]) out[k] = new Bounds(b.tuple())
      else out[k].update(b)
    }
  return out
}


export const buildScale = (key, bounds) => {
  switch (key) {
    case 'climb':
      return new ZeroCenteredScale(
        [Math.max(-5, bounds.climb.min), Math.min(5, bounds.climb.max)],
        'climb', bilinearGradient)
    case 'tec':
      return new ZeroCenteredScale(
        bounds.tec.tuple(), 'tec', bilinearGradient)
    case 'altitude':
      return new Scale(bounds.ele.tuple(), 'altitude', defaultGradient)
    case 'speed':
      return new Scale(bounds.speed.tuple(), 'speed', defaultGradient)
    case 'time':
      return new Scale(bounds.t.tuple(), 'time', defaultGradient)
    default: return null
  }
}


// Per-segment value used to drive the gradient.
const segmentValue = (track, key, i) => {
  switch (key) {
    case 'climb':    return track.climb[i]
    case 'tec':      return track.tec[i]
    case 'speed':    return track.speed[i]
    case 'altitude': return (track.coords[i].ele + track.coords[i + 1].ele) / 2
    case 'time':     return (track.t[i] + track.t[i + 1]) / 2
    default:         return null
  }
}


// --- track ------------------------------------------------------------

const buildColoredSegments = (flight, key, scale) => {
  const coords = flight.track.coords
  const out    = []
  for (let i = 0; i < coords.length - 1; i++) {
    const a = coords[i]
    const b = coords[i + 1]
    const positions = Cesium.Cartesian3.fromDegreesArrayHeights([
      a.lonDeg, a.latDeg, a.ele,
      b.lonDeg, b.latDeg, b.ele,
    ])
    const color = rgbaToCesium(scale.color(segmentValue(flight.track, key, i)))
    out.push(new Cesium.Entity({
      polyline: {positions, width: TRACK_WIDTH, material: color},
    }))
  }
  return out
}


const buildSolidPolyline = flight => [
  new Cesium.Entity({
    polyline: {
      positions: cartesians(flight.track.coords),
      width:     TRACK_WIDTH,
      material:  hexToCesium(flight.color),
    },
  }),
]


const buildTrack = (flight, key, scale) => {
  if (key == 'solid_color' || !scale) return buildSolidPolyline(flight)
  return buildColoredSegments(flight, key, scale)
}


// --- shadow (ground line + extruded wall) -----------------------------

const buildShadow = flight => {
  const coords = flight.track.coords
  if (!coords.length) return []

  // Ground-clamped line.
  const groundPositions = Cesium.Cartesian3.fromDegreesArray(
    coords.flatMap(c => [c.lonDeg, c.latDeg]))
  const ground = new Cesium.Entity({
    polyline: {
      positions:     groundPositions,
      width:         SHADOW_WIDTH,
      material:      SHADOW_COLOR,
      clampToGround: true,
    },
  })

  // Vertical wall from track down to terrain.
  const wallPositions = cartesians(coords)
  const wall = new Cesium.Entity({
    wall: {
      positions: wallPositions,
      material:  SHADOW_FILL,
      outline:   false,
    },
  })

  return [ground, wall]
}


// --- altitude marks (salient extrema) ---------------------------------

const altitudeLabel = (coord, color) => new Cesium.Entity({
  position: Cesium.Cartesian3.fromDegrees(
    coord.lonDeg, coord.latDeg, coord.ele),
  point: {
    pixelSize:    6,
    color,
    outlineColor: Cesium.Color.BLACK,
    outlineWidth: 1,
  },
  label: {
    text:            coord.ele.toFixed(0) + 'm',
    font:            '11px sans-serif',
    fillColor:       Cesium.Color.WHITE,
    outlineColor:    Cesium.Color.BLACK,
    outlineWidth:    2,
    style:           Cesium.LabelStyle.FILL_AND_OUTLINE,
    pixelOffset:     new Cesium.Cartesian2(8, 0),
    showBackground:  true,
    backgroundColor: Cesium.Color.BLACK.withAlpha(0.5),
  },
})


const buildAltitudeMarks = (flight, scale) => {
  if (!flight.track.elevationData) return []
  const eles  = flight.track.coords.map(c => c.ele)
  const picks = salient2(eles, [100, 50, 10])
  const out   = []
  for (const [i] of picks) {
    const c     = flight.track.coords[i]
    const color = scale ? rgbaToCesium(scale.color(c.ele)) : Cesium.Color.WHITE
    out.push(altitudeLabel(c, color))
  }
  return out
}


// --- time marks (every 5 minutes + endpoints) -------------------------

const formatHHMM = dt => {
  const h = String(dt.getUTCHours()).padStart(2, '0')
  const m = String(dt.getUTCMinutes()).padStart(2, '0')
  return h + ':' + m
}


const timeLabel = (coord, dt) => new Cesium.Entity({
  position: Cesium.Cartesian3.fromDegrees(
    coord.lonDeg, coord.latDeg, coord.ele),
  point: {
    pixelSize:    6,
    color:        TIME_MARK_COLOR,
    outlineColor: Cesium.Color.BLACK,
    outlineWidth: 1,
  },
  label: {
    text:            formatHHMM(dt),
    font:            '11px sans-serif',
    fillColor:       Cesium.Color.WHITE,
    outlineColor:    Cesium.Color.BLACK,
    outlineWidth:    2,
    style:           Cesium.LabelStyle.FILL_AND_OUTLINE,
    pixelOffset:     new Cesium.Cartesian2(8, 0),
    showBackground:  true,
    backgroundColor: Cesium.Color.BLACK.withAlpha(0.5),
  },
})


const buildTimeMarks = flight => {
  const coords = flight.track.coords
  if (coords.length < 2) return []
  const out  = []
  const step = 300  // 5 minutes

  out.push(timeLabel(coords[0], coords[0].dt))
  let dt = datetimeFloor(coords[0].dt, step)
  while (dt <= coords[0].dt) dt = new Date(dt.getTime() + step * 1000)
  while (dt < coords[coords.length - 1].dt) {
    out.push(timeLabel(flight.track.coordAt(dt), dt))
    dt = new Date(dt.getTime() + step * 1000)
  }
  out.push(timeLabel(coords[coords.length - 1], coords[coords.length - 1].dt))
  return out
}


// --- analysis (thermals, glides, dives) -------------------------------

const buildAnalysis = (flight, slices, color, kind) => {
  if (!flight.track.elevationData || !slices.length) return []
  const t   = flight.track
  const out = []

  for (const [a, b] of slices) {
    const c0  = t.coords[a]
    const c1  = t.coords[b]
    const mid = c0.halfwayTo(c1)

    // Connector line from start to end of segment.
    out.push(new Cesium.Entity({
      polyline: {
        positions: Cesium.Cartesian3.fromDegreesArrayHeights([
          c0.lonDeg, c0.latDeg, c0.ele,
          c1.lonDeg, c1.latDeg, c1.ele,
        ]),
        width:    3,
        material: color,
      },
    }))

    // Label at midpoint with summary.
    const dt = t.t[b] - t.t[a]
    const dz = c1.ele - c0.ele
    const dp = c0.distanceTo(c1)
    let label
    if (kind == 'thermal')
      label = dz.toFixed(0) + 'm at ' + (dz / dt).toFixed(1) + 'm/s'
    else if (kind == 'glide')
      label = (dp / 1000).toFixed(1) + 'km at ' +
              (dz < 0 ? (-dp / dz).toFixed(1) : '\u221e') + ':1, ' +
              (3.6 * dp / dt).toFixed(0) + 'km/h'
    else
      label = (-dz).toFixed(0) + 'm at ' + (dz / dt).toFixed(1) + 'm/s'

    out.push(new Cesium.Entity({
      position: Cesium.Cartesian3.fromDegrees(
        mid.lonDeg, mid.latDeg, mid.ele),
      point: {
        pixelSize:    6,
        color,
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 1,
      },
      label: {
        text:            label,
        font:            '11px sans-serif',
        fillColor:       Cesium.Color.WHITE,
        outlineColor:    Cesium.Color.BLACK,
        outlineWidth:    2,
        style:           Cesium.LabelStyle.FILL_AND_OUTLINE,
        pixelOffset:     new Cesium.Cartesian2(8, 0),
        showBackground:  true,
        backgroundColor: Cesium.Color.BLACK.withAlpha(0.6),
      },
    }))
  }

  return out
}


// --- task declaration -------------------------------------------------

const buildTask = flight => {
  const decl = flight.track.declaration
  if (!decl) return []
  const out = []

  // Turnpoint markers, deduplicated by name.
  const seen = new Set()
  for (const tp of decl.tps) {
    if (seen.has(tp.name)) continue
    seen.add(tp.name)
    out.push(new Cesium.Entity({
      position: Cesium.Cartesian3.fromDegrees(
        tp.coord.lonDeg, tp.coord.latDeg, 0),
      point: {
        pixelSize:    8,
        color:        TASK_COLOR,
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 1,
      },
      label: {
        text:            tp.name,
        font:            '11px sans-serif',
        fillColor:       Cesium.Color.WHITE,
        outlineColor:    Cesium.Color.BLACK,
        outlineWidth:    2,
        style:           Cesium.LabelStyle.FILL_AND_OUTLINE,
        pixelOffset:     new Cesium.Cartesian2(10, 0),
        showBackground:  true,
        backgroundColor: Cesium.Color.BLACK.withAlpha(0.6),
      },
    }))
  }

  // Radius circles for any tp with nonzero radius.
  const seenRadius = new Set()
  for (const tp of decl.tps) {
    if (!tp.radius) continue
    const key = tp.name + '|' + tp.radius
    if (seenRadius.has(key)) continue
    seenRadius.add(key)
    const ring = circleCoords(tp.coord, tp.radius)
    out.push(new Cesium.Entity({
      polyline: {
        positions:     Cesium.Cartesian3.fromDegreesArray(
          ring.flatMap(c => [c.lonDeg, c.latDeg])),
        width:         1,
        material:      TASK_COLOR,
        clampToGround: true,
      },
    }))
  }

  // Legs between consecutive distinct turnpoints.
  let prev = null
  for (const tp of decl.tps) {
    if (!prev) {prev = tp; continue}
    if (prev.name == tp.name) continue
    out.push(new Cesium.Entity({
      polyline: {
        positions: Cesium.Cartesian3.fromDegreesArray([
          prev.coord.lonDeg, prev.coord.latDeg,
          tp.coord.lonDeg,   tp.coord.latDeg,
        ]),
        width:         1,
        material:      TASK_COLOR,
        clampToGround: true,
      },
    }))
    prev = tp
  }

  return out
}


// --- public ------------------------------------------------------------

// Build all entity groups for a flight. Returns an object with keys
// matching the UI toggles so the viewer can show/hide each group.
export const buildFlightEntityGroups = (flight, key, scales) => ({
  track:         buildTrack(flight, key, scales[key]),
  shadow:        buildShadow(flight),
  altitudeMarks: buildAltitudeMarks(flight, scales.altitude),
  timeMarks:     buildTimeMarks(flight),
  thermals:      buildAnalysis(flight, flight.track.thermals, THERMAL_COLOR, 'thermal'),
  glides:        buildAnalysis(flight, flight.track.glides,   GLIDE_COLOR,   'glide'),
  dives:         buildAnalysis(flight, flight.track.dives,    DIVE_COLOR,    'dive'),
  task:          buildTask(flight),
})
