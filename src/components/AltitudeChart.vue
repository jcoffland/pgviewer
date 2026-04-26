<script>
import uPlot from 'uplot'
import 'uplot/dist/uPlot.min.css'


export default {
  props: {
    flights:   {type: Array, required: true},
    collapsed: Boolean,
  },

  emits: ['hover', 'update:collapsed'],

  data() {
    return {plot: null, ro: null}
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
    flights:   'build',
    collapsed(v) {if (!v) this.$nextTick(() => this.build())},
  },

  methods: {
    build() {
      if (this.plot) {this.plot.destroy(); this.plot = null}
      if (this.collapsed || !this.flights.length) return

      const series = [
        {label: 'time'},
        ...this.flights.map(f => ({
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

      const opts = {
        width:  clientWidth,
        height: clientHeight,
        scales: {x: {time: true}},
        series,
        axes: [
          {stroke: '#888', grid: {stroke: '#333'}},
          {stroke: '#888', grid: {stroke: '#333'}, label: 'altitude (m)'},
        ],
        cursor: {
          drag:   {x: false, y: false},
          points: {show: true},
          sync:   {key: 'igc'},
        },
        hooks: {
          setCursor: [
            u => {
              const i = u.cursor.idx
              if (i == null) {this.$emit('hover', null); return}
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
      const allT = new Set()
      for (const f of this.flights)
        for (const t of f.track.t) allT.add(t)
      const xs = [...allT].sort((a, b) => a - b)

      const series = this.flights.map(f => {
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

      return [xs, ...series]
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
    .label Altitude
    button.icon(
      :title='collapsed ? "Expand" : "Collapse"',
      @click='$emit("update:collapsed", !collapsed)')
      | {{ collapsed ? '▴' : '▾' }}
  .body
    .empty(v-if='!flights.length') No flights loaded
    .container(ref='container')
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
      flex 1
      font-size 11px
      text-transform uppercase
      letter-spacing 0.5px
      color #888

  .body
    flex 1
    position relative
    min-height 0

  .container
    position absolute
    inset 0

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
