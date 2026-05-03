<script>
import * as Cesium from 'cesium'
import {aggregateBounds, buildScale, FlightLayer} from '../render/flightRender.js'


// Pitch (radians) used by all programmatic camera moves. Negative = looking
// down. -45° gives a good compromise between top-down map view and a
// ground-level perspective showing terrain relief.
const CAMERA_PITCH = -Cesium.Math.toRadians(45)


// UI flag → entity-group name on the FlightLayer.
const TOGGLE_MAP = {
  showAltitudeMarks: 'altitudeMarks',
  showTimeMarks:     'timeMarks',
  showWaypoints:     'task',
  showThermals:      'thermals',
  showGlides:        'glides',
  showDives:         'dives',
}


export default {
  props: {
    flights:           {type: Array, required: true},
    showShadow:        Boolean,
    showAltitudeMarks: Boolean,
    showTimeMarks:     Boolean,
    showWaypoints:     Boolean,
    showThermals:      Boolean,
    showGlides:        Boolean,
    showDives:         Boolean,
    hoverTime:         {type: Number, default: null},
    showEmpty:         {type: Boolean, default: true},
  },

  emits: ['terrain-ready'],

  data() {
    return {
      viewer:        null,
      layers:        new Map(),  // flight id → FlightLayer
      hoverEntities: [],
      terrainSeen:   new Set(),  // flight ids we've already sampled
    }
  },

  mounted() {
    const terrain = Cesium.Terrain.fromWorldTerrain()
    this.terrainReady = new Promise((resolve, reject) => {
      terrain.readyEvent.addEventListener(provider => resolve(provider))
      terrain.errorEvent.addEventListener(err => reject(err))
    })

    this.viewer = new Cesium.Viewer(this.$refs.container, {
      baseLayer: Cesium.ImageryLayer.fromWorldImagery({
        maximumAnisotropy: Number.POSITIVE_INFINITY,  // GPU max
      }),
      terrain,
      baseLayerPicker:      false,
      geocoder:             false,
      homeButton:           false,
      sceneModePicker:      false,
      navigationHelpButton: false,
      animation:            false,
      timeline:             false,
      fullscreenButton:     false,
      infoBox:              false,
      selectionIndicator:   false,
    })
    this.viewer.scene.globe.maximumScreenSpaceError = 0.5
    this.viewer.scene.globe.tileCacheSize           = 10000
    this.viewer.scene.globe.preloadAncestors        = true
    this.viewer.scene.globe.preloadSiblings         = true
    this.viewer.cesiumWidget.creditContainer.style.display = 'none'
    this.syncFlights()
  },

  beforeUnmount() {
    if (this.viewer) this.viewer.destroy()
  },

  watch: {
    flights:           {handler: 'syncFlights', deep: false},
    showShadow:        'syncVisibility',
    showAltitudeMarks: 'syncVisibility',
    showTimeMarks:     'syncVisibility',
    showWaypoints:     'syncVisibility',
    showThermals:      'syncVisibility',
    showGlides:        'syncVisibility',
    showDives:         'syncVisibility',
    hoverTime:         'syncHover',
  },

  methods: {
    // The flights array changed. Three kinds of change:
    //   - flight added       → build new layer with current aggregate scales
    //   - flight removed     → detach old layer; rebuild remaining tracks
    //                          because aggregate scales widened/narrowed
    //   - coloringKey edited → rebuild that flight's track only
    // We detect membership change vs key change and rebuild accordingly.
    syncFlights() {
      if (!this.viewer) return

      const present = new Set(this.flights.map(f => f.id))
      const added   = []
      let removedAny = false

      for (const id of [...this.layers.keys()])
        if (!present.has(id)) {
          this.layers.get(id).detach(this.viewer)
          this.layers.delete(id)
          removedAny = true
        }

      // Aggregate scales across all current flights. Used by every layer.
      const bounds = aggregateBounds(this.flights)
      const scales = {
        climb:    buildScale('climb',    bounds),
        altitude: buildScale('altitude', bounds),
        tec:      buildScale('tec',      bounds),
        speed:    buildScale('speed',    bounds),
        time:     buildScale('time',     bounds),
      }

      // If membership changed, all existing layers need a rebuild because
      // the aggregate scales they were built against just shifted.
      const rebuildAll = removedAny || this.flights.some(
        f => !this.layers.has(f.id))

      for (const f of this.flights) {
        let layer = this.layers.get(f.id)
        if (!layer) {
          layer = new FlightLayer(f, scales, f.coloringKey)
          this.layers.set(f.id, layer)
          layer.attach(this.viewer)
          added.push(layer)
        } else {
          layer.scales = scales
          if (rebuildAll || layer.coloringKey != f.coloringKey)
            layer.rebuildTrack(this.viewer, f.coloringKey)
          if (layer.flight.terrainHeights != f.terrainHeights) {
            layer.flight = f
            layer.rebuildShadowWall(this.viewer)
          }
        }
      }

      this.syncVisibility()
      this.syncHover()
      if (added.length) this.flyToLayers(added)

      for (const f of this.flights)
        if (!this.terrainSeen.has(f.id)) {
          this.terrainSeen.add(f.id)
          this.sampleTerrainForFlight(f)
        }
    },

    // Sample terrain at ~500 evenly-spaced indices and linearly interpolate
    // to fill all coord indices. Emits terrain-ready when done so the
    // viewer chart can pick up the new heights.
    async sampleTerrainForFlight(flight) {
      const coords = flight.track.coords
      if (coords.length < 2) return
      const N = Math.min(500, coords.length)
      const sampleIdx = []
      const carto     = []
      for (let k = 0; k < N; k++) {
        const i = Math.round(k * (coords.length - 1) / (N - 1))
        sampleIdx.push(i)
        carto.push(Cesium.Cartographic.fromDegrees(coords[i].lonDeg, coords[i].latDeg))
      }
      let provider
      try {
        provider = await this.terrainReady
        await Cesium.sampleTerrainMostDetailed(provider, carto)
      } catch (e) {
        console.warn('terrain sampling failed:', e)
        return
      }
      // Linear interpolation between sampled points to fill every index.
      const heights = new Array(coords.length)
      for (let k = 0; k < N - 1; k++) {
        const i0 = sampleIdx[k]
        const i1 = sampleIdx[k + 1]
        const h0 = carto[k].height
        const h1 = carto[k + 1].height
        for (let i = i0; i < i1; i++) {
          const t = (i - i0) / (i1 - i0 || 1)
          heights[i] = h0 + (h1 - h0) * t
        }
      }
      heights[coords.length - 1] = carto[N - 1].height
      this.$emit('terrain-ready', {id: flight.id, heights})
    },

    syncVisibility() {
      for (const layer of this.layers.values()) {
        layer.setShadowVisible(this.showShadow)
        for (const [flag, group] of Object.entries(TOGGLE_MAP))
          layer.setEntityGroupVisible(group, this[flag])
      }
    },

    flyToLayers(layers) {
      if (!layers.length) return
      const spheres = layers.map(l => l.boundingSphere())
      const union = spheres.reduce(
        (acc, s) => Cesium.BoundingSphere.union(acc, s), spheres[0])
      this.flyToSphere(union)
    },

    flyToSphere(sphere) {
      this.viewer.camera.flyToBoundingSphere(sphere, {
        duration: 1.0,
        offset:   new Cesium.HeadingPitchRange(0, CAMERA_PITCH, sphere.radius * 1.75),
      })
    },

    flyToAll() {this.flyToLayers([...this.layers.values()])},

    flyToHover() {
      if (!this.hoverEntities.length) return
      const positions = this.hoverEntities.map(e => e.position.getValue())
      this.flyToPoints(positions)
    },

    // Fit a set of 3D points in the camera view at fixed pitch -45°.
    // Heading is chosen so the points spread along screen-x (PCA on the
    // east/north plane). Range is computed from the actual FOV so all
    // points fit with a small margin.
    flyToPoints(points) {
      if (!points.length) return

      // Centroid in ECEF.
      const centroid = points.reduce(
        (a, p) => Cesium.Cartesian3.add(a, p, new Cesium.Cartesian3()),
        new Cesium.Cartesian3())
      Cesium.Cartesian3.divideByScalar(centroid, points.length, centroid)

      // ENU basis at centroid, then convert points to local (e, n, u).
      const enuToEcef = Cesium.Transforms.eastNorthUpToFixedFrame(centroid)
      const ecefToEnu = Cesium.Matrix4.inverse(enuToEcef, new Cesium.Matrix4())
      const local = points.map(p => Cesium.Matrix4.multiplyByPoint(
        ecefToEnu, p, new Cesium.Cartesian3()))

      // PCA on the 2D (e, n) projection to find the principal axis.
      let see = 0, snn = 0, sen = 0
      for (const v of local) {see += v.x * v.x; snn += v.y * v.y; sen += v.x * v.y}
      // Eigenvector of largest eigenvalue of [[see, sen], [sen, snn]].
      const tr   = see + snn
      const det  = see * snn - sen * sen
      const disc = Math.sqrt(Math.max(0, tr * tr / 4 - det))
      const lam  = tr / 2 + disc
      let axisE  = sen
      let axisN  = lam - see
      const axisLen = Math.hypot(axisE, axisN)
      if (axisLen < 1e-6) {axisE = 0; axisN = 1}
      else                {axisE /= axisLen; axisN /= axisLen}
      // Heading = perpendicular to the principal axis, so points spread
      // across the screen rather than into/out of it. Cesium heading is
      // measured from north (y), increasing east (x).
      const heading = Math.atan2(-axisN, axisE)

      // Camera basis in local ENU, with pitch = -45° and the chosen heading.
      const pitch = CAMERA_PITCH
      const cp = Math.cos(pitch), sp = Math.sin(pitch)
      const ch = Math.cos(heading), sh = Math.sin(heading)
      // Cesium's HeadingPitchRange: heading 0 = +y (north), pitch 0 = horizontal,
      // negative pitch = looking down. View direction (camera→target) in ENU:
      const view  = new Cesium.Cartesian3(sh * cp,  ch * cp,  sp)
      const right = new Cesium.Cartesian3(ch,      -sh,        0)
      // up = right × view
      const upVec = Cesium.Cartesian3.cross(right, view, new Cesium.Cartesian3())

      // Cesium's fov applies to the larger viewport dimension.
      const cam    = this.viewer.camera
      const fov    = cam.frustum.fov
      const aspect = cam.frustum.aspectRatio || 1
      const tanLarger  = Math.tan(fov / 2)
      const tanSmaller = aspect >= 1 ? tanLarger / aspect : tanLarger * aspect
      const tanH = aspect >= 1 ? tanLarger : tanSmaller
      const tanV = aspect >= 1 ? tanSmaller : tanLarger

      // For each point, compute screen offsets and depth (relative to centroid)
      // and the range needed so the point sits at the FOV edge.
      const MARGIN = 1.05
      let needed = 0
      for (const v of local) {
        const sx = Cesium.Cartesian3.dot(v, right)
        const sy = Cesium.Cartesian3.dot(v, upVec)
        const sz = Cesium.Cartesian3.dot(v, view)
        const rx = Math.abs(sx) * MARGIN / tanH + sz
        const ry = Math.abs(sy) * MARGIN / tanV + sz
        if (needed < rx) needed = rx
        if (needed < ry) needed = ry
      }
      // Sanity floor — for a single point or tightly clustered points the
      // computation can yield a tiny range; keep the camera at least 100m back.
      if (needed < 100) needed = 100

      const sphere = new Cesium.BoundingSphere(centroid, 0)
      this.viewer.camera.flyToBoundingSphere(sphere, {
        duration: 1.0,
        offset:   new Cesium.HeadingPitchRange(heading, pitch, needed),
      })
    },

    syncHover() {
      for (const e of this.hoverEntities) this.viewer.entities.remove(e)
      this.hoverEntities = []
      if (this.hoverTime == null || !this.flights.length) return
      const t  = this.hoverTime | 0
      const dt = new Date(this.hoverTime * 1000)
      for (const f of this.flights) {
        const tt = f.track.t
        if (t < tt[0] || tt[tt.length - 1] < t) continue
        const c = f.track.coordAt(dt)
        this.hoverEntities.push(this.viewer.entities.add({
          position: Cesium.Cartesian3.fromDegrees(c.lonDeg, c.latDeg, c.ele),
          point: {
            pixelSize:    10,
            color:        Cesium.Color.fromCssColorString(f.color),
            outlineColor: Cesium.Color.WHITE,
            outlineWidth: 1,
          },
        }))
      }
    },
  },
}
</script>


<template lang="pug">
.globe-viewer
  .empty(v-if='showEmpty && !flights.length') {{ $t('Drop one or more IGC files to begin.') }}
  .container(ref='container')
</template>


<style lang="stylus">
.globe-viewer
  position relative
  height 100%
  width 100%

  .container
    position absolute
    inset 0

  .empty
    position absolute
    inset 0
    display flex
    align-items center
    justify-content center
    color #ddd
    font-size 22px
    text-shadow 0 0 8px rgba(0, 0, 0, 0.95), 0 0 2px rgba(0, 0, 0, 0.95)
    pointer-events none
    z-index 2
</style>
