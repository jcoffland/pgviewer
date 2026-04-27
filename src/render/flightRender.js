// Build Cesium scene objects for a Flight, using Primitive collections for
// dense geometry (track, shadow line) and Entities for sparse decoration
// (marks, labels, task).
//
// Returns a FlightLayer with `attach(viewer)` / `detach(viewer)` /
// `setVisible(group, bool)` helpers; the viewer owns one per flight and
// rebuilds the track sub-layer when the coloring choice changes.

import * as Cesium from 'cesium'
import {
  Bounds, Scale, ZeroCenteredScale,
  defaultGradient, bilinearGradient,
  salient2, datetimeFloor, circleCoords,
} from '../igc/index.js'


const TRACK_WIDTH       = 2
const SHADOW_WIDTH      = 1
const ANALYSIS_WIDTH    = 3
const TASK_WIDTH        = 1
const N_BUCKETS         = 32

const SHADOW_COLOR      = Cesium.Color.fromCssColorString('#000000')
const SHADOW_FILL       = Cesium.Color.fromCssColorString('#000000').withAlpha(0.3)
const TIME_MARK_COLOR   = Cesium.Color.fromCssColorString('#33ffff')
const THERMAL_COLOR     = Cesium.Color.fromCssColorString('#ff3333')
const GLIDE_COLOR       = Cesium.Color.fromCssColorString('#33ff33')
const DIVE_COLOR        = Cesium.Color.fromCssColorString('#3333ff')
const TASK_COLOR        = Cesium.Color.fromCssColorString('#ff33ff')


const rgbaToCesium = ([r, g, b, a]) => new Cesium.Color(r, g, b, a)
const hexToCesium  = hex            => Cesium.Color.fromCssColorString(hex)


const cartesians = coords => Cesium.Cartesian3.fromDegreesArrayHeights(
  coords.flatMap(c => [c.lonDeg, c.latDeg, c.ele]))


// ---------- bounds + scales -------------------------------------------

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
      if (!bounds.climb) return null
      return new ZeroCenteredScale(
        [Math.max(-5, bounds.climb.min), Math.min(5, bounds.climb.max)],
        'climb', bilinearGradient)
    case 'tec':
      if (!bounds.tec) return null
      return new ZeroCenteredScale(
        bounds.tec.tuple(), 'tec', bilinearGradient)
    case 'altitude':
      if (!bounds.ele) return null
      return new Scale(bounds.ele.tuple(), 'altitude', defaultGradient)
    case 'speed':
      if (!bounds.speed) return null
      return new Scale(bounds.speed.tuple(), 'speed', defaultGradient)
    case 'time':
      if (!bounds.t) return null
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


// ---------- track polyline collection ---------------------------------

// One polyline per maximal run of consecutive segments sharing a color
// bucket. Returns a PolylineCollection ready to add to scene.primitives.
const buildTrackCollection = (flight, key, scale) => {
  const coll   = new Cesium.PolylineCollection()
  const coords = flight.track.coords
  if (coords.length < 2) return coll

  if (key == 'solid_color' || !scale) {
    coll.add({
      positions: cartesians(coords),
      width:     TRACK_WIDTH,
      material:  Cesium.Material.fromType('Color',
        {color: hexToCesium(flight.color)}),
    })
    return coll
  }

  // Discretize each segment to a color bucket, then group consecutive runs
  // sharing the same bucket into a single polyline.
  const buckets = new Array(coords.length - 1)
  for (let i = 0; i < buckets.length; i++)
    buckets[i] = scale.discretize(segmentValue(flight.track, key, i), N_BUCKETS)

  // Pre-compute the 32 colors so we don't recompute per run.
  const colors = []
  for (let i = 0; i < N_BUCKETS; i++)
    colors.push(rgbaToCesium(scale.gradient(i / (N_BUCKETS - 1))))

  let runStart = 0
  for (let i = 1; i <= buckets.length; i++) {
    if (i == buckets.length || buckets[i] != buckets[runStart]) {
      // run [runStart, i) covers coords [runStart, i] inclusive
      const runCoords = coords.slice(runStart, i + 1)
      coll.add({
        positions: cartesians(runCoords),
        width:     TRACK_WIDTH,
        material:  Cesium.Material.fromType('Color',
          {color: colors[buckets[runStart]]}),
      })
      runStart = i
    }
  }
  return coll
}


// Shadow ground line as a single PolylineCollection (clamped to ground).
const buildShadowGround = flight => {
  const coll = new Cesium.PolylineCollection()
  const coords = flight.track.coords
  if (coords.length < 2) return coll
  // Shadow line clamps to ground; wall is a separate Entity (below).
  coll.add({
    positions: Cesium.Cartesian3.fromDegreesArray(
      coords.flatMap(c => [c.lonDeg, c.latDeg])),
    width:    SHADOW_WIDTH,
    material: Cesium.Material.fromType('Color', {color: SHADOW_COLOR}),
  })
  return coll
}


// ---------- entity-based decoration -----------------------------------

const altitudeEntity = (coord, color) => new Cesium.Entity({
  position: Cesium.Cartesian3.fromDegrees(coord.lonDeg, coord.latDeg, coord.ele),
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
    out.push(altitudeEntity(c, color))
  }
  return out
}


const formatHHMM = dt => {
  const h = String(dt.getUTCHours()).padStart(2, '0')
  const m = String(dt.getUTCMinutes()).padStart(2, '0')
  return h + ':' + m
}


const timeEntity = (coord, dt) => new Cesium.Entity({
  position: Cesium.Cartesian3.fromDegrees(coord.lonDeg, coord.latDeg, coord.ele),
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
  const step = 300

  out.push(timeEntity(coords[0], coords[0].dt))
  let dt = datetimeFloor(coords[0].dt, step)
  while (dt <= coords[0].dt) dt = new Date(dt.getTime() + step * 1000)
  while (dt < coords[coords.length - 1].dt) {
    out.push(timeEntity(flight.track.coordAt(dt), dt))
    dt = new Date(dt.getTime() + step * 1000)
  }
  out.push(timeEntity(coords[coords.length - 1], coords[coords.length - 1].dt))
  return out
}


const buildAnalysis = (flight, slices, color, kind) => {
  if (!flight.track.elevationData || !slices.length) return []
  const t   = flight.track
  const out = []

  for (const [a, b] of slices) {
    const c0  = t.coords[a]
    const c1  = t.coords[b]
    const mid = c0.halfwayTo(c1)

    out.push(new Cesium.Entity({
      polyline: {
        positions: Cesium.Cartesian3.fromDegreesArrayHeights([
          c0.lonDeg, c0.latDeg, c0.ele,
          c1.lonDeg, c1.latDeg, c1.ele,
        ]),
        width:    ANALYSIS_WIDTH,
        material: color,
      },
    }))

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
      position: Cesium.Cartesian3.fromDegrees(mid.lonDeg, mid.latDeg, mid.ele),
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
        pixelOffset:     new Cesium.Cartesian2(8, -14),
        showBackground:  true,
        backgroundColor: Cesium.Color.BLACK.withAlpha(0.6),
      },
    }))
  }
  return out
}


const buildTask = flight => {
  const decl = flight.track.declaration
  if (!decl) return []
  const out = []

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
        width:         TASK_WIDTH,
        material:      TASK_COLOR,
        clampToGround: true,
      },
    }))
  }

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
        width:         TASK_WIDTH,
        material:      TASK_COLOR,
        clampToGround: true,
      },
    }))
    prev = tp
  }

  return out
}


// Shadow wall: one entity holding the vertical wall geometry.
const buildShadowWall = flight => {
  const coords = flight.track.coords
  if (coords.length < 2) return []
  return [new Cesium.Entity({
    wall: {
      positions: cartesians(coords),
      material:  SHADOW_FILL,
      outline:   false,
    },
  })]
}


// ---------- FlightLayer ------------------------------------------------

// Holds all scene objects for one flight. The viewer calls attach() once,
// detach() to remove. Group visibility is toggled via setVisible(). When
// the coloring choice changes, the viewer calls rebuildTrack().
export class FlightLayer {
  constructor(flight, scales, coloringKey) {
    this.flight = flight
    this.scales = scales
    this.coloringKey = coloringKey

    // Primitive collections (added to scene.primitives).
    this.trackColl  = coloringKey == 'hidden'
      ? new Cesium.PolylineCollection()
      : buildTrackCollection(flight, coloringKey, scales[coloringKey])
    this.shadowColl = buildShadowGround(flight)

    // Entity groups (added to viewer.entities).
    this.entityGroups = {
      shadowWall:    buildShadowWall(flight),
      altitudeMarks: buildAltitudeMarks(flight, scales.altitude),
      timeMarks:     buildTimeMarks(flight),
      thermals:      buildAnalysis(flight, flight.track.thermals, THERMAL_COLOR, 'thermal'),
      glides:        buildAnalysis(flight, flight.track.glides,   GLIDE_COLOR,   'glide'),
      dives:         buildAnalysis(flight, flight.track.dives,    DIVE_COLOR,    'dive'),
      task:          buildTask(flight),
    }

    this.attached = false
  }


  attach(viewer) {
    if (this.attached) return
    viewer.scene.primitives.add(this.trackColl)
    viewer.scene.primitives.add(this.shadowColl)
    for (const ents of Object.values(this.entityGroups))
      for (const e of ents) viewer.entities.add(e)
    this.attached = true
  }


  detach(viewer) {
    if (!this.attached) return
    viewer.scene.primitives.remove(this.trackColl)
    viewer.scene.primitives.remove(this.shadowColl)
    for (const ents of Object.values(this.entityGroups))
      for (const e of ents) viewer.entities.remove(e)
    this.attached = false
  }


  // Rebuild only the track collection in place. Cheap because it's
  // a single primitive replacement, not thousands of entity ops.
  rebuildTrack(viewer, coloringKey) {
    this.coloringKey = coloringKey
    if (this.attached) viewer.scene.primitives.remove(this.trackColl)
    this.trackColl = coloringKey == 'hidden'
      ? new Cesium.PolylineCollection()
      : buildTrackCollection(this.flight, coloringKey, this.scales[coloringKey])
    if (this.attached) viewer.scene.primitives.add(this.trackColl)
  }


  setShadowVisible(v) {
    this.shadowColl.show = v
    for (const e of this.entityGroups.shadowWall) e.show = v
  }


  setEntityGroupVisible(group, v) {
    for (const e of this.entityGroups[group]) e.show = v
  }


  // BoundingSphere covering all coords. Used by camera.flyTo.
  boundingSphere() {
    return Cesium.BoundingSphere.fromPoints(cartesians(this.flight.track.coords))
  }
}
