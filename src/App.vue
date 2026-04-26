<script>
import FileDropzone   from './components/FileDropzone.vue'
import GlobeViewer    from './components/GlobeViewer.vue'
import AltitudeChart  from './components/AltitudeChart.vue'
import TrackControls  from './components/TrackControls.vue'
import {parseIgc}     from './igc/index.js'


// KML aabbggrr palette for multi-flight color cycle.
const FLIGHT_COLORS = [
  '#ff0000', '#00ff00', '#0000ff',
  '#ffff00', '#ff00ff', '#00ffff',
]


export default {
  components: {FileDropzone, GlobeViewer, AltitudeChart, TrackControls},

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
    }
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
  },
}
</script>


<template lang="pug">
.app
  .top-bar
    .title IGC Viewer
    file-dropzone(@files='addFiles')
    .errors(v-if='parseErrors.length')
      .error(v-for='e in parseErrors', :key='e.name')
        | {{ e.name }}: {{ e.msg }}

  .main
    track-controls.controls(
      :flights='flights',
      :show-shadow='showShadow',
      :show-altitude-marks='showAltitudeMarks',
      :show-time-marks='showTimeMarks',
      :show-thermals='showThermals',
      :show-glides='showGlides',
      :show-dives='showDives',
      @update:show-shadow='showShadow = $event',
      @update:show-altitude-marks='showAltitudeMarks = $event',
      @update:show-time-marks='showTimeMarks = $event',
      @update:show-thermals='showThermals = $event',
      @update:show-glides='showGlides = $event',
      @update:show-dives='showDives = $event',
      @update:coloring='setFlightColoring',
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
    @hover='hoverTime = $event')
</template>


<style lang="stylus">
.app
  display flex
  flex-direction column
  height 100%

  .top-bar
    display flex
    align-items center
    gap 16px
    padding 8px 12px
    background #222
    border-bottom 1px solid #333
    flex-shrink 0

    .title
      font-weight 600
      font-size 16px

    .errors
      flex 1
      color #f88
      font-size 12px

  .main
    flex 1
    display flex
    min-height 0

    .controls
      width 240px
      background #1f1f1f
      border-right 1px solid #333
      overflow-y auto
      flex-shrink 0

    .viewer
      flex 1
      min-width 0

  .chart
    height 200px
    background #181818
    border-top 1px solid #333
    flex-shrink 0
</style>
