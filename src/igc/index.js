// Public surface of the IGC parser/analyzer.

export {parseIgc} from './parser.js'
export {Track, UNKNOWN, THERMAL, GLIDE, DIVE, simplifiedAltitudeProfile} from './track.js'
export {Coord, circleCoords, radToCardinal} from './coord.js'
export {Scale, ZeroCenteredScale, TimeScale} from './scale.js'
export {
  Bounds, runs, runsWhere, condense, findFirstGe,
  incrDouglasPeucker, salient2, datetimeFloor,
} from './utils.js'
export {
  hslToRgba, defaultGradient, bilinearGradient, rgbaToHex,
} from './color.js'
