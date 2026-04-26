<script>
import * as Cesium from 'cesium'
import {
  aggregateBounds, buildScale, buildFlightEntities,
} from '../render/flightEntities.js'


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
      viewer:        null,
      flightLayers:  new Map(),  // flight id → array of entities
    }
  },

  mounted() {
    Cesium.Ion.defaultAccessToken = ''
    this.viewer = new Cesium.Viewer(this.$refs.container, {
      imageryProvider: new Cesium.OpenStreetMapImageryProvider({
        url: 'https://tile.openstreetmap.org/',
      }),
      baseLayerPicker:    false,
      geocoder:           false,
      homeButton:         false,
      sceneModePicker:    false,
      navigationHelpButton: false,
      animation:          false,
      timeline:           false,
      fullscreenButton:   false,
      infoBox:            false,
      selectionIndicator: false,
    })
    this.viewer.scene.globe.depthTestAgainstTerrain = false
    this.rebuild()
  },

  beforeUnmount() {
    if (this.viewer) this.viewer.destroy()
  },

  watch: {
    flights:          {handler: 'rebuild', deep: false},
    selectedColoring: 'rebuild',
    showShadow:       'rebuild',
    showAltitudeMarks:'rebuild',
    showTimeMarks:    'rebuild',
    showThermals:     'rebuild',
    showGlides:       'rebuild',
    showDives:        'rebuild',
  },

  methods: {
    rebuild() {
      if (!this.viewer) return

      // Drop old.
      for (const ents of this.flightLayers.values())
        for (const e of ents) this.viewer.entities.remove(e)
      this.flightLayers.clear()
      if (!this.flights.length) return

      // Compute scales from aggregate bounds.
      const bounds = aggregateBounds(this.flights)
      const scales = {
        climb:    buildScale('climb',    bounds),
        altitude: buildScale('altitude', bounds),
        tec:      buildScale('tec',      bounds),
        speed:    buildScale('speed',    bounds),
        time:     buildScale('time',     bounds),
      }
      const ui = {selectedColoring: this.selectedColoring}

      for (const f of this.flights) {
        const ents = buildFlightEntities(f, ui, scales)
        this.flightLayers.set(f.id, ents)
        for (const e of ents) this.viewer.entities.add(e)
      }

      this.viewer.zoomTo(this.viewer.entities)
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
