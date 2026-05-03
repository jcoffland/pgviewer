<script>
import uPlot from 'uplot'
import 'uplot/dist/uPlot.min.css'
import {currentLang} from '../i18n/index.js'
import {ChevronUp, ChevronDown} from 'lucide-vue-next'


export default {
  components: {ChevronUp, ChevronDown},

  props: {
    flights:    {type: Array, required: true},
    selectedId: {default: null},
    collapsed:  Boolean,
    hoverTime:  {type: Number, default: null},
  },

  emits: ['hover', 'update:collapsed', 'zoom-to-fit'],

  data() {
    return {plot: null, ro: null}
  },

  computed: {
    lang() {return currentLang.value},
    selectedFlight() {
      if (this.selectedId == null) return null
      return this.flights.find(f => f.id == this.selectedId) || null
    },
    displayFlights() {
      const sel = this.selectedFlight
      return sel ? [sel] : this.flights
    },
    hoverX() {
      if (this.hoverTime == null || !this.plot) return null
      const x = this.plot.valToPos(this.hoverTime, 'x')
      if (x < 0 || x > this.plot.bbox.width / devicePixelRatio) return null
      const overRect = this.plot.over.getBoundingClientRect()
      const wrapRect = this.$refs.container.parentElement.getBoundingClientRect()
      return overRect.left - wrapRect.left + x
    },
    // Stats at the hover time, for the selected flight only. null when no
    // selection or no hover. Each value is a preformatted string or '—'.
    hoverStats() {
      const f = this.selectedFlight
      if (!f || this.hoverTime == null) return null
      const t = f.track.t
      if (t.length < 2) return null
      const i = this.nearestIndex(t, this.hoverTime)
      const c = f.track.coords[i]
      const terr = f.terrainHeights ? f.terrainHeights[i] : null
      const climb = f.track.climb[Math.min(i, f.track.climb.length - 1)]
      const sp    = f.avgSpeeds ? f.avgSpeeds[i] : null
      return {
        time:   this.timeStr(t[i]) + ' UTC',
        msl:    `${Math.round(c.ele)} m`,
        agl:    terr == null ? '—' : `${Math.round(c.ele - terr)} m`,
        ground: terr == null ? '—' : `${Math.round(terr)} m`,
        climb:  climb == null ? '—' : `${climb.toFixed(1)} m/s`,
        speed:  sp    == null ? '—' : `${sp.toFixed(1)} km/h`,
      }
    },
  },

  mounted() {
    this.ro = new ResizeObserver(() => this.layout())
    this.ro.observe(this.$refs.container)
    this.build()
  },

  beforeUnmount() {
    if (this.ro) this.ro.disconnect()
    if (this.plot) this.plot.destroy()
  },

  watch: {
    flights:    'build',
    selectedId: 'build',
    lang:       'build',
    collapsed(v) {if (!v) this.$nextTick(() => this.build())},
  },

  methods: {
    timeStr(unix) {
      const d = new Date(unix * 1000)
      const hh = String(d.getUTCHours()).padStart(2, '0')
      const mm = String(d.getUTCMinutes()).padStart(2, '0')
      const ss = String(d.getUTCSeconds()).padStart(2, '0')
      return `${hh}:${mm}:${ss}`
    },

    // Binary search: index of t-array entry closest to target.
    nearestIndex(arr, target) {
      let lo = 0, hi = arr.length - 1
      while (lo + 1 < hi) {
        const mid = (lo + hi) >> 1
        if (arr[mid] < target) lo = mid
        else                   hi = mid
      }
      return target - arr[lo] < arr[hi] - target ? lo : hi
    },

    build() {
      if (this.plot) {this.plot.destroy(); this.plot = null}
      if (this.collapsed || !this.flights.length) return

      const flights      = this.displayFlights
      const isSelected   = this.selectedId != null
      const first        = flights[0]
      const hasTerrain   = isSelected && first && first.terrainHeights
      const series = [
        {label: 'time'},
        ...(hasTerrain ? [{
          label:    'terrain',
          stroke:   'rgba(160,160,160,0.6)',
          fill:     'rgba(160,160,160,0.35)',
          width:    1,
          spanGaps: true,
          points:   {show: false},
        }] : []),
        ...flights.map(f => ({
          label:    f.track.filename,
          stroke:   f.color,
          width:    1.5,
          spanGaps: true,
          points:   {show: false},
        })),
      ]

      const data = this.buildData()
      const {clientWidth, clientHeight} = this.$refs.container
      if (clientWidth <= 0 || clientHeight <= 0) return

      // Format the X axis with HH:MM only (no date row at the bottom).
      const fmtTick = ts => {
        const d = new Date(ts * 1000)
        const hh = String(d.getUTCHours()).padStart(2, '0')
        const mm = String(d.getUTCMinutes()).padStart(2, '0')
        return `${hh}:${mm}`
      }

      const opts = {
        width:  clientWidth,
        height: clientHeight,
        scales: {x: {time: true}},
        series,
        axes: [
          {
            stroke: '#888',
            grid:   {stroke: '#333'},
            values: (u, splits) => splits.map(fmtTick),
            size:   34,
          },
          {stroke: '#888', grid: {stroke: '#333'}, label: this.$t('altitude (m)')},
        ],
        cursor: {
          drag:   {x: false, y: false},
          points: {show: true},
          x:      true,
          y:      false,
          sync:   {key: 'igc'},
        },
        hooks: {
          setCursor: [
            u => {
              const i = u.cursor.idx
              if (i == null) return  // mouse left chart; keep last hover
              const t = u.data[0][i]
              this.$emit('hover', t)
            },
          ],
        },
      }
      this.plot = new uPlot(opts, data, this.$refs.container)
    },

    // uPlot wants an aligned time axis: a single sorted time array shared
    // by all series, with nulls where a flight has no sample at that time.
    // Easy version: union of all flights' t arrays, then for each flight,
    // a series with values at its own t and nulls elsewhere.
    buildData() {
      const flights = this.displayFlights
      const allT = new Set()
      for (const f of flights)
        for (const t of f.track.t) allT.add(t)
      const xs = [...allT].sort((a, b) => a - b)

      const flightSeries = flights.map(f => {
        const ys     = new Array(xs.length).fill(null)
        const tMap   = new Map()
        for (let i = 0; i < f.track.t.length; i++)
          tMap.set(f.track.t[i], f.track.coords[i].ele)
        for (let i = 0; i < xs.length; i++) {
          const v = tMap.get(xs[i])
          if (v != null) ys[i] = v
        }
        return ys
      })

      const isSelected = this.selectedId != null
      const first = flights[0]
      const terrainSeries = []
      if (isSelected && first && first.terrainHeights) {
        const ys   = new Array(xs.length).fill(null)
        const tMap = new Map()
        for (let i = 0; i < first.track.t.length; i++)
          tMap.set(first.track.t[i], first.terrainHeights[i])
        for (let i = 0; i < xs.length; i++) {
          const v = tMap.get(xs[i])
          if (v != null) ys[i] = v
        }
        terrainSeries.push(ys)
      }

      return [xs, ...terrainSeries, ...flightSeries]
    },

    layout() {
      if (!this.plot) return
      const {clientWidth, clientHeight} = this.$refs.container
      if (clientWidth <= 0 || clientHeight <= 0) return
      this.plot.setSize({width: clientWidth, height: clientHeight})
    },
  },
}
</script>


<template lang="pug">
.altitude-chart(:class='{collapsed}')
  .header
    .label {{ $t('Altitude') }}
    button.icon(
      :title='collapsed ? $t("Expand") : $t("Collapse")',
      @click='$emit("update:collapsed", !collapsed)')
      chevron-up(v-if='collapsed', :size='16')
      chevron-down(v-else, :size='16')
  .body(@dblclick='$emit("zoom-to-fit")')
    .empty(v-if='!flights.length') {{ $t('No flights loaded') }}
    .hover-table(v-if='selectedFlight')
      .hover-row
        span.k {{ $t('Time') }}
        span.v {{ hoverStats ? hoverStats.time : '—' }}
      .hover-row
        span.k {{ $t('Alt MSL') }}
        span.v {{ hoverStats ? hoverStats.msl : '—' }}
      .hover-row
        span.k {{ $t('Alt AGL') }}
        span.v {{ hoverStats ? hoverStats.agl : '—' }}
      .hover-row
        span.k {{ $t('Ground') }}
        span.v {{ hoverStats ? hoverStats.ground : '—' }}
      .hover-row
        span.k {{ $t('Climb') }}
        span.v {{ hoverStats ? hoverStats.climb : '—' }}
      .hover-row
        span.k {{ $t('Speed') }}
        span.v {{ hoverStats ? hoverStats.speed : '—' }}
    .chart-wrap
      .container(ref='container')
      .hover-line(v-if='hoverX != null', :style='{left: hoverX + "px"}')
</template>


<style lang="stylus">
.altitude-chart
  display flex
  flex-direction column
  background #181818
  border-top 1px solid #333
  flex-shrink 0
  height 220px

  &.collapsed
    height 24px

    .body
      display none

  .header
    display flex
    align-items center
    gap 4px
    padding 2px 8px
    background #1f1f1f
    border-bottom 1px solid #333
    flex-shrink 0
    height 24px

    .label
      font-size 11px
      text-transform uppercase
      letter-spacing 0.5px
      color #888
      flex 1

  .body
    flex 1
    display flex
    min-height 0

  .chart-wrap
    flex 1
    position relative
    min-width 0

  .hover-line
    position absolute
    top 0
    bottom 0
    width 0
    border-left 1px solid #888
    pointer-events none
    z-index 5

  .container
    position absolute
    inset 0

  .hover-table
    width 175px
    flex-shrink 0
    border-right 1px solid #333
    background #1a1a1a
    padding 6px 8px
    display flex
    flex-direction column
    gap 2px
    font-size 12px

    .hover-row
      display flex
      gap 6px
      white-space nowrap

      .k
        color #888
        min-width 60px

      .v
        flex 1
        text-align right
        font-variant-numeric tabular-nums

  .empty
    position absolute
    inset 0
    display flex
    align-items center
    justify-content center
    color #555
    font-size 12px
    pointer-events none

  button.icon
    margin-left auto
    background transparent
    border 1px solid transparent
    padding 2px 6px
    font-size 12px
    line-height 1
    color #aaa
    cursor pointer

    &:hover
      background #333
      color #eee

  // uPlot dark theme.
  .u-legend
    color #ccc

  .u-label
    color #888
</style>
