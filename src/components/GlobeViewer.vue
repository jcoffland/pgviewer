<script>
import * as Cesium from 'cesium'
import {aggregateBounds, buildScale, FlightLayer} from '../render/flightRender.js'


// UI flag → entity-group name on the FlightLayer.
const TOGGLE_MAP = {
  showAltitudeMarks: 'altitudeMarks',
  showTimeMarks:     'timeMarks',
  showThermals:      'thermals',
  showGlides:        'glides',
  showDives:         'dives',
}


export default {
  props: {
    flights:           {type: Array, required: true},
    selectedColoring:  {type: String, required: true},
    showShadow:        Boolean,
    showAltitudeMarks: Boolean,
    showTimeMarks:     Boolean,
    showThermals:      Boolean,
    showGlides:        Boolean,
    showDives:         Boolean,
    hoverTime:         {type: Number, default: null},
  },

  data() {
    return {
      viewer:      null,
      layers:      new Map(),  // flight id → FlightLayer
      hoverEntity: null,
    }
  },

  mounted() {
    Cesium.Ion.defaultAccessToken = ''
    this.viewer = new Cesium.Viewer(this.$refs.container, {
      baseLayer: new Cesium.ImageryLayer(new Cesium.UrlTemplateImageryProvider({
        url:          'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
        credit:       'OpenStreetMap',
        maximumLevel: 19,
      })),
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
    this.syncFlights()
  },

  beforeUnmount() {
    if (this.viewer) this.viewer.destroy()
  },

  watch: {
    flights:           {handler: 'syncFlights', deep: false},
    selectedColoring:  'rebuildTracks',
    showShadow:        'syncVisibility',
    showAltitudeMarks: 'syncVisibility',
    showTimeMarks:     'syncVisibility',
    showThermals:      'syncVisibility',
    showGlides:        'syncVisibility',
    showDives:         'syncVisibility',
    hoverTime:         'syncHover',
  },

  methods: {
    // Add layers for new flights, drop layers for removed ones, fly to new
    // layers on first add.
    syncFlights() {
      if (!this.viewer) return

      const present = new Set(this.flights.map(f => f.id))
      let added = []

      for (const id of [...this.layers.keys()])
        if (!present.has(id)) {
          this.layers.get(id).detach(this.viewer)
          this.layers.delete(id)
        }

      // Recompute scales whenever the set of flights changes.
      const bounds = aggregateBounds(this.flights)
      const scales = {
        climb:    buildScale('climb',    bounds),
        altitude: buildScale('altitude', bounds),
        tec:      buildScale('tec',      bounds),
        speed:    buildScale('speed',    bounds),
        time:     buildScale('time',     bounds),
      }

      // For existing layers we leave their (older) scales — they were
      // computed for the old aggregate. Rebuilding the track picks up
      // the new aggregate. Since selectedColoring is shared, just rebuild.
      for (const f of this.flights) {
        let layer = this.layers.get(f.id)
        if (!layer) {
          layer = new FlightLayer(f, scales, this.selectedColoring)
          this.layers.set(f.id, layer)
          layer.attach(this.viewer)
          added.push(layer)
        } else {
          layer.scales = scales
          layer.rebuildTrack(this.viewer, this.selectedColoring)
        }
      }

      this.syncVisibility()
      this.syncHover()
      if (added.length) this.flyToLayers(added)
    },

    // Coloring change: keep all layers, swap each one's track collection.
    rebuildTracks() {
      if (!this.viewer) return
      for (const layer of this.layers.values())
        layer.rebuildTrack(this.viewer, this.selectedColoring)
    },

    // Toggle visibility of optional groups based on the UI flags.
    syncVisibility() {
      for (const layer of this.layers.values()) {
        layer.setShadowVisible(this.showShadow)
        for (const [flag, group] of Object.entries(TOGGLE_MAP))
          layer.setEntityGroupVisible(group, this[flag])
      }
    },

    // Fly to the union of bounding spheres of the given layers.
    flyToLayers(layers) {
      if (!layers.length) return
      const spheres = layers.map(l => l.boundingSphere())
      const union = spheres.reduce(
        (acc, s) => Cesium.BoundingSphere.union(acc, s), spheres[0])
      this.viewer.camera.flyToBoundingSphere(union, {duration: 1.0})
    },

    syncHover() {
      if (this.hoverEntity) {
        this.viewer.entities.remove(this.hoverEntity)
        this.hoverEntity = null
      }
      if (this.hoverTime == null || !this.flights.length) return
      const dt = new Date(this.hoverTime * 1000)
      const c  = this.flights[0].track.coordAt(dt)
      this.hoverEntity = this.viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(c.lonDeg, c.latDeg, c.ele),
        point: {
          pixelSize:    10,
          color:        Cesium.Color.YELLOW,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 2,
        },
      })
    },
  },
}
</script>


<template lang="pug">
.globe-viewer
  .empty(v-if='!flights.length') Drop one or more IGC files to begin.
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
    color #777
    pointer-events none
    z-index 2
</style>
