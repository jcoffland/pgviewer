// Build Cesium entities for a Flight. Each builder function returns an
// array of Cesium.Entity that the caller adds to the viewer's collection
// and removes when the UI state changes.

import * as Cesium from 'cesium'
import {
  Bounds, Scale, ZeroCenteredScale,
  defaultGradient, bilinearGradient,
} from '../igc/index.js'


const SEGMENT_WIDTH = 2

const rgbaToCesium = ([r, g, b, a]) => new Cesium.Color(r, g, b, a)
const hexToCesium  = hex            => Cesium.Color.fromCssColorString(hex)


// Aggregate Bounds across all flights' track.bounds.
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


// Pick a Scale appropriate for one coloring key, given aggregate bounds.
// Returns null for 'solid_color'.
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


// Series value at segment i (between coords i and i+1) for a given key.
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


// One entity per track segment, colored via the scale. Used when
// selectedColoring is anything other than 'solid_color'.
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
      polyline: {
        positions,
        width:    SEGMENT_WIDTH,
        material: color,
      },
    }))
  }
  return out
}


// Single solid-color polyline. Used when selectedColoring == 'solid_color'.
const buildSolidPolyline = flight => {
  const coords = flight.track.coords
  const positions = Cesium.Cartesian3.fromDegreesArrayHeights(
    coords.flatMap(c => [c.lonDeg, c.latDeg, c.ele]))
  return [new Cesium.Entity({
    polyline: {
      positions,
      width:    SEGMENT_WIDTH,
      material: hexToCesium(flight.color),
    },
  })]
}


// Public.
// Build all entities for one flight under the current UI state.
export const buildFlightEntities = (flight, ui, scales) => {
  const key   = ui.selectedColoring
  const scale = scales[key]

  if (key == 'solid_color' || !scale) return buildSolidPolyline(flight)
  return buildColoredSegments(flight, key, scale)
}
