<script>
import GlobeViewer    from './components/GlobeViewer.vue'
import AltitudeChart  from './components/AltitudeChart.vue'
import TrackControls  from './components/TrackControls.vue'
import {parseIgc}     from './igc/index.js'
import {pack, unpack} from './share/bundle.js'
import {uploadBlob, fetchById} from './share/backend.js'
import {LANGUAGES, setLang}    from './i18n/index.js'


// Hash prefix for the share URL. Bumping this lets us evolve the format.
const SHARE_HASH_PREFIX = '#v1='

// Hard cap on share bundle size, matching the worker's MAX_BODY_BYTES.
const MAX_SHARE_BYTES = 2 * 1024 * 1024


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
      showWaypoints:    false,
      showThermals:     false,
      showGlides:       false,
      showDives:        false,
      hoverTime:        null,    // unix seconds; chart→viewer cursor sync
      parseErrors:      [],
      collapsedSide:    false,
      collapsedChart:   false,
      isFullscreen:     false,
      // null | {state: 'uploading'} | {state: 'ok', url} | {state: 'error', msg}
      shareDialog:      null,
      loadingShare:     false,
      langOpen:         false,
      settingsOpen:     false,
      aboutOpen:        false,
      LANGUAGES,
    }
  },

  mounted() {
    document.addEventListener('fullscreenchange', this.onFullscreenChange)
    this.loadFromHash()
  },

  beforeUnmount() {
    document.removeEventListener('fullscreenchange', this.onFullscreenChange)
  },

  methods: {
    async addFiles(files) {
      this.parseErrors = []
      const added = []
      let baseId  = this.nextId()
      for (const file of files) {
        try {
          const text  = await file.text()
          const index = this.flights.length + added.length
          const id    = baseId + added.length
          added.push(this.makeFlight(file.name, text, id, index))
        } catch (e) {
          this.parseErrors.push({name: file.name, msg: e.message})
        }
      }
      if (added.length) {
        this.flights = [...this.flights, ...added]
        this.clearShareHash()
      }
    },

    // Build a flight object from raw IGC text. `index` is the position
    // in the resulting array, used for color cycling.
    makeFlight(name, text, id, index) {
      const track = parseIgc(text, name)
      const color = FLIGHT_COLORS[index % FLIGHT_COLORS.length]
      const coloringKey = index == 0 ? 'climb' : 'solid_color'
      return {id, track, color, coloringKey, text}
    },

    removeFlight(id) {
      this.flights = this.flights.filter(f => f.id != id)
      this.clearShareHash()
    },

    clearFlights() {
      this.flights     = []
      this.parseErrors = []
      this.clearShareHash()
    },

    // Drop a #v1=... fragment from the URL bar without reloading. Called
    // whenever the loaded flight set diverges from what the share link
    // points to.
    clearShareHash() {
      if (location.hash.startsWith(SHARE_HASH_PREFIX))
        history.replaceState(null, '', location.pathname + location.search)
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

    snapToView() {
      this.$refs.globe?.flyToAll()
    },

    zoomToHover() {
      this.$refs.globe?.flyToHover()
    },

    pickLang(code) {
      setLang(code)
      this.langOpen = false
    },

    async createShareLink() {
      if (!this.flights.length) return
      this.shareDialog = {state: 'uploading'}
      try {
        const blob = await pack(this.flights.map(f => ({
          name: f.track.filename,
          text: f.text,
        })))
        if (MAX_SHARE_BYTES < blob.size) throw new Error(
          this.$t('shared bundle too large') + ' ('
          + (blob.size / 1024 / 1024).toFixed(1) + ' MiB; '
          + (MAX_SHARE_BYTES / 1024 / 1024) + ' MiB)')
        const id  = await uploadBlob(blob)
        const url = location.origin + location.pathname + location.search + SHARE_HASH_PREFIX + id
        history.replaceState(null, '', url)
        this.shareDialog = {state: 'ok', url}
      } catch (e) {
        this.shareDialog = {state: 'error', msg: e.message}
      }
    },

    async copyShareLink() {
      if (this.shareDialog?.state != 'ok') return
      try {
        await navigator.clipboard.writeText(this.shareDialog.url)
        this.shareDialog = {...this.shareDialog, copied: true}
      } catch (e) {
        // Fallback: select the text in the input.
      }
    },

    dismissShareDialog() {this.shareDialog = null},

    async loadFromHash() {
      const hash = window.location.hash || ''
      if (!hash.startsWith(SHARE_HASH_PREFIX)) return
      const id = hash.slice(SHARE_HASH_PREFIX.length)
      this.parseErrors  = []
      this.loadingShare = true
      try {
        const blob    = await fetchById(id)
        const flights = await unpack(blob)
        const added   = []
        let baseId    = this.nextId()
        for (const f of flights) {
          try {
            const index = this.flights.length + added.length
            const newId = baseId + added.length
            added.push(this.makeFlight(f.name, f.text, newId, index))
          } catch (e) {
            this.parseErrors.push({name: f.name, msg: e.message})
          }
        }
        if (added.length) this.flights = [...this.flights, ...added]
      } catch (e) {
        this.parseErrors.push({name: 'shared link', msg: e.message})
      } finally {
        this.loadingShare = false
      }
    },
  },
}
</script>


<template lang="pug">
.app
  .main
    track-controls.controls(
      :flights='flights',
      :collapsed='collapsedSide',
      :parse-errors='parseErrors',
      @files='addFiles',
      @update:coloring='setFlightColoring',
      @update:collapsed='collapsedSide = $event',
      @share='createShareLink',
      @clear='clearFlights',
      @remove='removeFlight')

    .viewer-area
      globe-viewer.viewer(
        ref='globe',
        :flights='flights',
        :show-shadow='showShadow',
        :show-altitude-marks='showAltitudeMarks',
        :show-time-marks='showTimeMarks',
        :show-waypoints='showWaypoints',
        :show-thermals='showThermals',
        :show-glides='showGlides',
        :show-dives='showDives',
        :hover-time='hoverTime',
        :show-empty='!loadingShare')
      .viewer-buttons
        .lang-selector
          button.icon(:title='"Language"', @click='langOpen = !langOpen')
            | {{ $lang.value.toUpperCase() }}
          .lang-menu(v-if='langOpen')
            button.lang-option(
              v-for='code in LANGUAGES',
              :key='code',
              :class='{active: $lang.value == code}',
              @click='pickLang(code)')
              | {{ code.toUpperCase() }}
        button.icon(
          :title='isFullscreen ? $t("Exit fullscreen") : $t("Fullscreen")',
          @click='toggleFullscreen')
          | {{ isFullscreen ? '⇲' : '⛶' }}
        button.icon(
          :disabled='!flights.length',
          :title='$t("Snap to view")',
          @click='snapToView')
          | ⌖
        button.icon(
          :title='$t("Settings")',
          @click='settingsOpen = !settingsOpen')
          | ⚙
        button.icon(
          :title='$t("About")',
          @click='aboutOpen = !aboutOpen')
          | ℹ

  altitude-chart.chart(
    :flights='flights',
    :collapsed='collapsedChart',
    :hover-time='hoverTime',
    @update:collapsed='collapsedChart = $event',
    @hover='hoverTime = $event',
    @zoom-to-fit='zoomToHover')

  .modal-overlay(v-if='aboutOpen', @click.self='aboutOpen = false')
    .modal.about-modal
      .about-header
        span.about-icon 🪂
        .modal-title PG Viewer
      .about-body(v-html='$t("about")')
      .about-author Joseph Coffland
      .modal-actions
        button(@click='aboutOpen = false') {{ $t('Close') }}

  .modal-overlay(v-if='settingsOpen', @click.self='settingsOpen = false')
    .modal.settings-modal
      section
        h3 {{ $t('Layers') }}
        .options
          label.option
            input(type='checkbox', v-model='showShadow')
            | {{ $t('Shadow') }}
          label.option
            input(type='checkbox', v-model='showAltitudeMarks')
            | {{ $t('Altitude marks') }}
          label.option
            input(type='checkbox', v-model='showTimeMarks')
            | {{ $t('Time marks') }}
          label.option
            input(type='checkbox', v-model='showWaypoints')
            | {{ $t('Waypoints') }}

      section
        h3 {{ $t('Analysis') }}
        .options
          label.option
            input(type='checkbox', v-model='showThermals')
            | {{ $t('Thermals') }}
          label.option
            input(type='checkbox', v-model='showGlides')
            | {{ $t('Glides') }}
          label.option
            input(type='checkbox', v-model='showDives')
            | {{ $t('Dives') }}

      .modal-actions
        button(@click='settingsOpen = false') {{ $t('Close') }}

  .modal-overlay(v-if='loadingShare')
    .modal
      .pacifier
      .modal-text {{ $t('Loading flights…') }}

  .modal-overlay(v-if='shareDialog', @click.self='dismissShareDialog')
    .modal
      template(v-if='shareDialog.state == "uploading"')
        .pacifier
        .modal-text {{ $t('Uploading flights…') }}

      template(v-else-if='shareDialog.state == "ok"')
        .modal-title {{ $t('Shareable link') }}
        input.modal-url(:value='shareDialog.url', readonly, @focus='$event.target.select()')
        .modal-actions
          button(@click='copyShareLink') {{ shareDialog.copied ? $t('Copied') : $t('Copy') }}
          button(@click='dismissShareDialog') {{ $t('Close') }}

      template(v-else)
        .modal-title {{ $t('Share failed') }}
        .modal-text {{ shareDialog.msg }}
        .modal-actions
          button(@click='dismissShareDialog') {{ $t('Close') }}
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

    .viewer-area
      flex 1
      min-width 0
      position relative

      .viewer
        position absolute
        inset 0

      .viewer-buttons
        position absolute
        top 8px
        right 8px
        z-index 10
        display flex
        flex-direction column
        gap 6px

        button
          display flex
          align-items center
          justify-content center
          min-width 30px
          min-height 26px
          background rgba(0, 0, 0, 0.6)
          border 1px solid #555
          color #eee
          font-size 16px
          line-height 1
          padding 4px 8px
          cursor pointer
          border-radius 3px

          &:hover:not(:disabled)
            background rgba(40, 40, 40, 0.85)
            border-color #888

          &:disabled
            opacity 0.4
            cursor not-allowed

        .lang-selector
          position relative

          .lang-menu
            position absolute
            top 0
            right calc(100% + 4px)
            display flex
            flex-direction row
            gap 4px

            .lang-option
              font-size 13px

              &.active
                background rgba(80, 80, 100, 0.85)
                border-color #aaa

  .modal-overlay
    position fixed
    inset 0
    background rgba(0, 0, 0, 0.6)
    display flex
    align-items center
    justify-content center
    z-index 100

    .modal
      background #222
      border 1px solid #444
      border-radius 4px
      padding 16px 20px
      min-width 360px
      max-width 90vw
      display flex
      flex-direction column
      gap 12px

      .modal-title
        font-size 14px
        font-weight 600

      .modal-text
        font-size 13px
        color #ccc

      .modal-url
        font-family monospace
        font-size 12px
        background #1a1a1a
        color #eee
        border 1px solid #444
        border-radius 3px
        padding 6px 8px
        width 100%

      .modal-actions
        display flex
        justify-content flex-end
        gap 8px

      .pacifier
        width 28px
        height 28px
        align-self center
        border 3px solid #444
        border-top-color #88c
        border-radius 50%
        animation spin 0.8s linear infinite

    .settings-modal
      section
        h3
          margin 0 0 8px 0
          font-size 11px
          text-transform uppercase
          letter-spacing 0.5px
          color #888

        .options
          display flex
          flex-direction column
          gap 4px

        .option
          display flex
          align-items center
          gap 6px
          font-size 13px
          cursor pointer

          input
            cursor pointer

    .about-modal
      max-width 520px
      max-height 80vh

      .about-header
        display flex
        align-items center
        gap 12px

        .about-icon
          font-size 32px
          line-height 1
          flex-shrink 0

      .about-body
        font-size 13px
        color #ccc
        overflow-y auto

        h4
          margin 12px 0 2px 0
          font-size 12px
          font-weight 600
          color #ddd
          text-transform uppercase
          letter-spacing 0.4px

          &:first-child
            margin-top 0

        p
          margin 0
          line-height 1.5

      .about-author
        font-size 12px
        color #888
        text-align right
        font-style italic

@keyframes spin
  to
    transform rotate(360deg)
</style>
