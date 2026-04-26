// Spherical coordinates in radians, with WGS84 mean radius.

const R = 6371000

const CARDINALS = 'N NNE NE ENE E ESE SE SSE S SSW SW WSW W WNW NW NNW'.split(' ')


// Cardinal name for a bearing in radians.
export const radToCardinal = rad => {
  while (rad < 0) rad += 2 * Math.PI
  return CARDINALS[((8 * rad / Math.PI + 0.5) | 0) % 16]
}


export class Coord {
  // lat, lon in radians; ele in meters; dt is a Date or null.
  constructor(lat, lon, ele, dt = null) {
    this.lat = lat
    this.lon = lon
    this.ele = ele
    this.dt  = dt
  }


  static deg(latDeg, lonDeg, ele, dt = null) {
    const k = Math.PI / 180
    return new Coord(latDeg * k, lonDeg * k, ele, dt)
  }


  get latDeg() {return this.lat * 180 / Math.PI}
  get lonDeg() {return this.lon * 180 / Math.PI}


  // Initial great-circle bearing from this to other, radians.
  initialBearingTo(other) {
    const y = Math.sin(other.lon - this.lon) * Math.cos(other.lat)
    const x = Math.cos(this.lat) * Math.sin(other.lat) -
              Math.sin(this.lat) * Math.cos(other.lat) *
              Math.cos(other.lon - this.lon)
    return Math.atan2(y, x)
  }


  // Great-circle distance to other, meters.
  distanceTo(other) {
    const d = Math.sin(this.lat) * Math.sin(other.lat) +
              Math.cos(this.lat) * Math.cos(other.lat) *
              Math.cos(this.lon - other.lon)
    return d < 1 ? R * Math.acos(d) : 0
  }


  // Midpoint along the great circle.
  halfwayTo(other) {
    const bx = Math.cos(other.lat) * Math.cos(other.lon - this.lon)
    const by = Math.cos(other.lat) * Math.sin(other.lon - this.lon)
    const cx = Math.cos(this.lat) + bx
    const lat = Math.atan2(Math.sin(this.lat) + Math.sin(other.lat),
                           Math.sqrt(cx * cx + by * by))
    const lon = this.lon + Math.atan2(by, cx)
    return new Coord(lat, lon, (this.ele + other.ele) / 2)
  }


  // Point delta (0..1) of the way from this to other.
  interpolate(other, delta) {
    let d = Math.sin(this.lat) * Math.sin(other.lat) +
            Math.cos(this.lat) * Math.cos(other.lat) *
            Math.cos(other.lon - this.lon)
    d = d < 1 ? delta * Math.acos(d) : 0
    const y = Math.sin(other.lon - this.lon) * Math.cos(other.lat)
    const x = Math.cos(this.lat) * Math.sin(other.lat) -
              Math.sin(this.lat) * Math.cos(other.lat) *
              Math.cos(other.lon - this.lon)
    const theta = Math.atan2(y, x)
    const lat = Math.asin(Math.sin(this.lat) * Math.cos(d) +
                          Math.cos(this.lat) * Math.sin(d) * Math.cos(theta))
    const lon = this.lon + Math.atan2(
      Math.sin(theta) * Math.sin(d) * Math.cos(this.lat),
      Math.cos(d) - Math.sin(this.lat) * Math.sin(lat))
    const ele = (1 - delta) * this.ele + delta * other.ele
    return new Coord(lat, lon, ele)
  }


  // Point d meters from this in direction theta (radians).
  coordAt(theta, d) {
    const lat = Math.asin(Math.sin(this.lat) * Math.cos(d / R) +
                          Math.cos(this.lat) * Math.sin(d / R) *
                          Math.cos(theta))
    const lon = this.lon + Math.atan2(
      Math.sin(theta) * Math.sin(d / R) * Math.cos(this.lat),
      Math.cos(d / R) - Math.sin(this.lat) * Math.sin(lat))
    return new Coord(lat, lon, this.ele)
  }
}


// Decimate a circle of given radius around center into a polyline whose
// perpendicular deviation from the true arc is at most `error` meters.
export const circleCoords = (center, radius, ele = null, error = 0.1) => {
  const decimation = Math.ceil(
    Math.PI / Math.acos((radius - error) / (radius + error)))
  const out = []
  for (let i = 0; i <= decimation; i++) {
    const c = center.coordAt(-2 * Math.PI * i / decimation, radius + error)
    if (ele != null) c.ele = ele
    out.push(c)
  }
  return out
}
