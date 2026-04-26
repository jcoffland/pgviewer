<script>
import GlobeViewer    from './components/GlobeViewer.vue'
import AltitudeChart  from './components/AltitudeChart.vue'
import TrackControls  from './components/TrackControls.vue'
import {parseIgc}     from './igc/index.js'


// Per-flight color cycle.
const FLIGHT_COLORS = [
  '#ff0000', '#00ff00', '#0000ff',
  '#ffff00', '#ff00ff', '#00ffff',
]


export default {
  components: {GlobeViewer, AltitudeChart, TrackControls},

  data() {
    return {
      flights:          [],
      showShadow:       false,
      showAltitudeMarks:false,
      showTimeMarks:    false,
      showThermals:     false,
      showGlides:       false,
      showDives:        false,
      hoverTime:        null,    // unix seconds; chart→viewer cursor sync
      parseErrors:      [],
      collapsedSide:    false,
      collapsedChart:   false,
      isFullscreen:     false,
    }
  },

  mounted() {
    document.addEventListener('fullscreenchange', this.onFullscreenChange)
  },

  beforeUnmount() {
    document.removeEventListener('fullscreenchange', this.onFullscreenChange)
  },

  methods: {
    async addFiles(files) {
      this.parseErrors = []
      const added = []
      for (const file of files) {
        try {
          const text  = await file.text()
          const track = parseIgc(text, file.name)
          const id    = this.nextId() + added.length
          const color = FLIGHT_COLORS[
            (this.flights.length + added.length) % FLIGHT_COLORS.length]
          added.push({id, track, color, coloringKey: 'climb'})
        } catch (e) {
          this.parseErrors.push({name: file.name, msg: e.message})
        }
      }
      if (added.length) this.flights = [...this.flights, ...added]
    },

    removeFlight(id) {
      this.flights = this.flights.filter(f => f.id != id)
    },

    setFlightColoring({id, key}) {
      this.flights = this.flights.map(
        f => f.id == id ? {...f, coloringKey: key} : f)
    },

    nextId() {
      return this.flights.reduce((m, f) => m < f.id ? f.id : m, 0) + 1
    },

    toggleFullscreen() {
      if (document.fullscreenElement) document.exitFullscreen()
      else document.documentElement.requestFullscreen()
    },

    onFullscreenChange() {
      this.isFullscreen = !!document.fullscreenElement
    },
  },
}
</script>


<template lang="pug">
.app
  .main
    track-controls.controls(
      :flights='flights',
      :show-shadow='showShadow',
      :show-altitude-marks='showAltitudeMarks',
      :show-time-marks='showTimeMarks',
      :show-thermals='showThermals',
      :show-glides='showGlides',
      :show-dives='showDives',
      :collapsed='collapsedSide',
      :is-fullscreen='isFullscreen',
      :parse-errors='parseErrors',
      @files='addFiles',
      @update:show-shadow='showShadow = $event',
      @update:show-altitude-marks='showAltitudeMarks = $event',
      @update:show-time-marks='showTimeMarks = $event',
      @update:show-thermals='showThermals = $event',
      @update:show-glides='showGlides = $event',
      @update:show-dives='showDives = $event',
      @update:coloring='setFlightColoring',
      @update:collapsed='collapsedSide = $event',
      @toggle-fullscreen='toggleFullscreen',
      @remove='removeFlight')

    globe-viewer.viewer(
      :flights='flights',
      :show-shadow='showShadow',
      :show-altitude-marks='showAltitudeMarks',
      :show-time-marks='showTimeMarks',
      :show-thermals='showThermals',
      :show-glides='showGlides',
      :show-dives='showDives',
      :hover-time='hoverTime')

  altitude-chart.chart(
    :flights='flights',
    :collapsed='collapsedChart',
    @update:collapsed='collapsedChart = $event',
    @hover='hoverTime = $event')
</template>


<style lang="stylus">
.app
  display flex
  flex-direction column
  height 100%

  .main
    flex 1
    display flex
    min-height 0

    .viewer
      flex 1
      min-width 0
</style>
