<script>
import * as Cesium from 'cesium'
import {
  aggregateBounds, buildScale, buildFlightEntityGroups,
} from '../render/flightEntities.js'


// Always-on groups (not toggleable from the UI).
const ALWAYS_ON = ['track', 'task']

// UI flag → group name. Names match flightEntities.buildFlightEntityGroups
// keys.
const TOGGLE_MAP = {
  showShadow:        'shadow',
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
      viewer:        null,
      // flight id → group name → entity[]
      flightGroups:  new Map(),
      hoverEntity:   null,
    }
  },

  mounted() {
    Cesium.Ion.defaultAccessToken = ''
    this.viewer = new Cesium.Viewer(this.$refs.container, {
      imageryProvider: new Cesium.OpenStreetMapImageryProvider({
        url: 'https://tile.openstreetmap.org/',
      }),
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
    this.rebuild()
  },

  beforeUnmount() {
    if (this.viewer) this.viewer.destroy()
  },

  watch: {
    flights:          {handler: 'rebuild', deep: false},
    selectedColoring: 'rebuild',
    showShadow:       'syncVisibility',
    showAltitudeMarks:'syncVisibility',
    showTimeMarks:    'syncVisibility',
    showThermals:     'syncVisibility',
    showGlides:       'syncVisibility',
    showDives:        'syncVisibility',
    hoverTime:        'syncHover',
  },

  methods: {
    rebuild() {
      if (!this.viewer) return

      // Drop everything we placed.
      for (const groups of this.flightGroups.values())
        for (const ents of Object.values(groups))
          for (const e of ents) this.viewer.entities.remove(e)
      this.flightGroups.clear()
      if (!this.flights.length) {this.syncHover(); return}

      // Build new entity groups for each flight.
      const bounds = aggregateBounds(this.flights)
      const scales = {
        climb:    buildScale('climb',    bounds),
        altitude: buildScale('altitude', bounds),
        tec:      buildScale('tec',      bounds),
        speed:    buildScale('speed',    bounds),
        time:     buildScale('time',     bounds),
      }

      for (const f of this.flights) {
        const groups = buildFlightEntityGroups(
          f, this.selectedColoring, scales)
        this.flightGroups.set(f.id, groups)
        for (const e of Object.values(groups).flat())
          this.viewer.entities.add(e)
      }

      this.syncVisibility()
      this.syncHover()
      this.viewer.zoomTo(this.viewer.entities)
    },

    // Toggle the show flag on each group entity based on UI state. We
    // don't rebuild — entities just hide/show.
    syncVisibility() {
      for (const groups of this.flightGroups.values())
        for (const [groupName, ents] of Object.entries(groups)) {
          const visible = ALWAYS_ON.includes(groupName) || this.isVisible(groupName)
          for (const e of ents) e.show = visible
        }
    },

    isVisible(groupName) {
      for (const [flag, target] of Object.entries(TOGGLE_MAP))
        if (target == groupName) return this[flag]
      return true
    },

    syncHover() {
      if (this.hoverEntity) {
        this.viewer.entities.remove(this.hoverEntity)
        this.hoverEntity = null
      }
      if (this.hoverTime == null || !this.flights.length) return
      const dt = new Date(this.hoverTime * 1000)
      // Place a crosshair at the first flight's interpolated position.
      const c = this.flights[0].track.coordAt(dt)
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
