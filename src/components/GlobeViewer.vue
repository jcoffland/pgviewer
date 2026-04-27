<script>
import * as Cesium from 'cesium'
import {aggregateBounds, buildScale, FlightLayer} from '../render/flightRender.js'


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

  data() {
    return {
      viewer:      null,
      layers:      new Map(),  // flight id → FlightLayer
      hoverEntities: [],
    }
  },

  mounted() {
    this.viewer = new Cesium.Viewer(this.$refs.container, {
      baseLayer: Cesium.ImageryLayer.fromWorldImagery({
        maximumAnisotropy: Number.POSITIVE_INFINITY,  // GPU max
      }),
      terrain:              Cesium.Terrain.fromWorldTerrain(),
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
        }
      }

      this.syncVisibility()
      this.syncHover()
      if (added.length) this.flyToLayers(added)
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
        offset:   new Cesium.HeadingPitchRange(0, -Cesium.Math.PI_OVER_FOUR, sphere.radius * 1.75),
      })
    },

    flyToAll() {this.flyToLayers([...this.layers.values()])},

    flyToHover() {
      if (!this.hoverEntities.length) return
      const positions = this.hoverEntities.map(e => e.position.getValue())
      const sphere = Cesium.BoundingSphere.fromPoints(positions)
      // Single point → fromPoints gives radius 0; use a sensible minimum.
      if (sphere.radius < 100) sphere.radius = 100
      this.flyToSphere(sphere)
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
