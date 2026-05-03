<script>
import FileDropzone from './FileDropzone.vue'
import {ChevronLeft, ChevronRight, Share2, Eye, EyeOff, X, Trash2}
  from 'lucide-vue-next'
import {TYPE_ICONS} from '../igc/typeIcons.js'


export default {
  components: {FileDropzone, ChevronLeft, ChevronRight, Share2, Eye, EyeOff, X, Trash2},

  props: {
    flights:           {type: Array, required: true},
    selectedId:        {default: null},
    collapsed:         Boolean,
    parseErrors:       {type: Array, default: () => []},
  },

  emits: [
    'update:collapsed',
    'select',
    'remove',
    'toggle-hidden',
    'files',
    'share',
    'clear',
  ],

  computed: {
    selected() {return this.flights.find(f => f.id == this.selectedId) || null},
  },

  methods: {
    legendFor(f) {
      const t = f.track
      const parts = []
      if (t.pilotName)  parts.push(t.pilotName)
      if (t.gliderType) parts.push(t.gliderType)
      return parts.length ? parts.join(' · ') : t.filename
    },

    distanceKm(f) {
      // Prefer the optimized XC scoring distance when available; else fall
      // back to the cumulative haversine distance along the track.
      if (f.score) return f.score.distance.toFixed(2)
      const s = f.track.s
      return s.length ? (s[s.length - 1] / 1000).toFixed(2) : '0.00'
    },

    typeIcon(f) {return f.score ? TYPE_ICONS[f.score.icon] : null},
    typeLabel(f) {return f.score ? f.score.name : ''},
    pointsStr(f) {return f.score ? f.score.score.toFixed(2) : '—'},
    bonusStr(f) {return f.score ? '\u00d7' + f.score.bonus.toFixed(1) : '—'},

    routeTitle(f) {
      const parts = [`${this.distanceKm(f)} km`]
      if (f.score) parts.push(f.score.name)
      parts.push(`${this.pointsStr(f)} p.`)
      return parts.join(' · ')
    },

    maxAlt(f) {
      const b = f.track.bounds.ele
      return b ? `${Math.round(b.max)} m` : '—'
    },

    // Largest altitude gain inside any single thermal: max(ele) - min(ele)
    // over the thermal's index range. Robust to ragged entry/exit.
    maxAltGain(f) {
      const ths = f.track.thermals
      if (!ths || !ths.length) return '—'
      const coords = f.track.coords
      let best = 0
      for (const [a, b] of ths) {
        let lo = Infinity, hi = -Infinity
        for (let i = a; i <= b; i++) {
          const e = coords[i].ele
          if (e < lo) lo = e
          if (hi < e) hi = e
        }
        if (best < hi - lo) best = hi - lo
      }
      return `${Math.round(best)} m`
    },

    maxClimb(f) {
      const b = f.track.bounds.climb
      return b ? `${b.max.toFixed(1)} m/s` : '—'
    },

    maxSink(f) {
      const b = f.track.bounds.climb
      return b ? `${(-b.min).toFixed(1)} m/s` : '—'
    },

    avgSpeed(f) {
      const t = f.track.t
      if (t.length < 2) return '—'
      const dt = t[t.length - 1] - t[0]
      if (!dt) return '—'
      // Prefer the optimized XC route distance; fall back to the cumulative
      // tracklog distance until scoring completes.
      const km = f.score
        ? f.score.distance
        : (f.track.s.length ? f.track.s[f.track.s.length - 1] / 1000 : 0)
      return `${(km * 3600 / dt).toFixed(2)} km/h`
    },

    comments(f) {
      const t = f.track
      return t.remark || t.device || ''
    },

    durationStr(f) {
      const t = f.track.t
      if (t.length < 2) return ''
      const secs = t[t.length - 1] - t[0]
      const h = Math.floor(secs / 3600)
      const m = Math.floor((secs % 3600) / 60)
      return h ? `${h}h ${m}m` : `${m}m`
    },

    timeStr(unix) {
      // IGC times are UTC. Display HH:MM in UTC to match the source.
      const d = new Date(unix * 1000)
      const hh = String(d.getUTCHours()).padStart(2, '0')
      const mm = String(d.getUTCMinutes()).padStart(2, '0')
      return `${hh}:${mm}`
    },

    onRowClick(id) {
      this.$emit('select', id == this.selectedId ? null : id)
    },
  },
}
</script>


<template lang="pug">
.track-controls(:class='{collapsed}')
  .strip(v-if='collapsed', @click='$emit("update:collapsed", false)')
    button.icon(:title='$t("Expand")')
      chevron-right(:size='16')
  template(v-else)
    .header
      .title PG Viewer
      button.icon(:title='$t("Collapse")', @click='$emit("update:collapsed", true)')
        chevron-left(:size='16')

    .body
      section
        file-dropzone(@files='$emit("files", $event)')
        button.share-btn(:disabled='!flights.length', @click='$emit("share")')
          share2(:size='14')
          | {{ $t('Create shareable link') }}
        .errors(v-if='parseErrors.length')
          .error(v-for='e in parseErrors', :key='e.name')
            | {{ e.name }}: {{ e.msg }}

      section(v-if='flights.length')
        h3 {{ $t('Tracks') }}

        .detail(v-if='selected')
          .detail-head
            .swatch(:style='{background: selected.color}')
            .detail-title(:title='selected.track.pilotName || selected.track.filename') {{ selected.track.pilotName || selected.track.filename }}
          .detail-row
            span.k {{ $t('Glider') }}
            span.v(:title='selected.track.gliderType || ""') {{ selected.track.gliderType || '<unknown>' }}
          .detail-row
            span.k {{ $t('File') }}
            span.v(:title='selected.track.filename || ""') {{ selected.track.filename || '<unknown>' }}
          .detail-row
            span.k {{ $t('Route') }}
            span.v.score-line(:title='routeTitle(selected)')
              | {{ distanceKm(selected) }} km
              img.type-icon(v-if='typeIcon(selected)', :src='typeIcon(selected)', :alt='typeLabel(selected)')
              | {{ pointsStr(selected) }} p.
          .detail-row
            span.k {{ $t('Airtime') }}
            span.v(:title='durationStr(selected)') {{ durationStr(selected) || '<unknown>' }}
          .detail-row
            span.k {{ $t('Start') }}
            span.v(:title='selected.track.t.length ? timeStr(selected.track.t[0]) + " UTC" : ""') {{ selected.track.t.length ? timeStr(selected.track.t[0]) + ' UTC' : '<unknown>' }}
          .detail-row
            span.k {{ $t('End') }}
            span.v(:title='selected.track.t.length ? timeStr(selected.track.t[selected.track.t.length - 1]) + " UTC" : ""') {{ selected.track.t.length ? timeStr(selected.track.t[selected.track.t.length - 1]) + ' UTC' : '<unknown>' }}
          .detail-row
            span.k {{ $t('Max altitude') }}
            span.v(:title='maxAlt(selected)') {{ maxAlt(selected) }}
          .detail-row
            span.k {{ $t('Max alt. gain') }}
            span.v(:title='maxAltGain(selected)') {{ maxAltGain(selected) }}
          .detail-row
            span.k {{ $t('Max climb') }}
            span.v(:title='maxClimb(selected)') {{ maxClimb(selected) }}
          .detail-row
            span.k {{ $t('Max sink') }}
            span.v(:title='maxSink(selected)') {{ maxSink(selected) }}
          .detail-row
            span.k {{ $t('Avg speed') }}
            span.v(:title='avgSpeed(selected)') {{ avgSpeed(selected) }}
          .detail-row
            span.k {{ $t('Bonus') }}
            span.v(:title='bonusStr(selected)') {{ bonusStr(selected) }}
          .detail-row(v-if='comments(selected)')
            span.k {{ $t('Comments') }}
            span.v(:title='comments(selected)') {{ comments(selected) }}

        .detail.empty(v-else)
          | {{ $t('No track selected') }}

        .track-list
          .track-row(
            v-for='f in flights',
            :key='f.id',
            :class='{selected: f.id == selectedId, dim: f.hidden}',
            @click='onRowClick(f.id)')
            .swatch(:style='{background: f.color}')
            .name(:title='legendFor(f)') {{ legendFor(f) }}
            button.icon.row-btn(
              :title='f.hidden ? $t("Show track") : $t("Hide track")',
              @click.stop='$emit("toggle-hidden", f.id)')
              eye-off(v-if='f.hidden', :size='14')
              eye(v-else, :size='14')
            button.icon.row-btn(
              :title='$t("Remove track")',
              @click.stop='$emit("remove", f.id)')
              x(:size='14')

        button.clear-btn(@click='$emit("clear")')
          trash-2(:size='14')
          | {{ $t('Clear all') }}
</template>


<style lang="stylus">
.track-controls
  width 240px
  background #1f1f1f
  border-right 1px solid #333
  flex-shrink 0
  display flex
  flex-direction column
  min-height 0

  &.collapsed
    width 24px

  .strip
    flex 1
    display flex
    align-items flex-start
    justify-content center
    padding-top 8px
    cursor pointer

    &:hover
      background #2a2a2a

  .header
    display flex
    align-items center
    gap 4px
    padding 8px 8px 8px 12px
    border-bottom 1px solid #333
    flex-shrink 0

    .title
      flex 1
      font-weight 600
      font-size 14px

  .body
    flex 1
    overflow-y auto
    padding 12px

  .errors
    margin-top 6px
    color #f88
    font-size 12px

    .error
      margin-top 2px

  .share-btn,
  .clear-btn
    margin-top 8px
    width 100%
    padding 6px 10px
    font-size 12px
    display flex
    align-items center
    justify-content center
    gap 6px

    &:disabled
      opacity 0.4
      cursor not-allowed

  button.icon
    background transparent
    border 1px solid transparent
    padding 2px 6px
    font-size 14px
    line-height 1
    color #aaa

    &:hover
      background #333
      color #eee

  section
    margin-bottom 16px

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

  .swatch
    width 14px
    height 14px
    border-radius 2px
    flex-shrink 0

  .name
    flex 1
    overflow hidden
    text-overflow ellipsis
    white-space nowrap

  .detail
    background #1f1f1f
    border 1px solid #333
    border-radius 4px
    padding 8px
    margin-bottom 8px
    font-size 12px
    min-height 280px
    box-sizing border-box

    &.empty
      color #666
      font-style italic
      display flex
      align-items center
      justify-content center

    .detail-head
      display flex
      align-items center
      gap 6px
      margin-bottom 6px

      .detail-title
        flex 1
        font-weight 600
        font-size 13px
        overflow hidden
        text-overflow ellipsis
        white-space nowrap

    .detail-row
      display flex
      gap 6px
      line-height 1.5

      .k
        color #888
        min-width 78px

      .v
        flex 1
        overflow hidden
        text-overflow ellipsis
        white-space nowrap

        &.score-line
          display flex
          align-items center
          gap 6px

      .type-icon
        width 14px
        height 14px
        flex-shrink 0
        image-rendering pixelated

  .track-list
    display flex
    flex-direction column

  .track-row
    display flex
    align-items center
    gap 6px
    padding 4px 6px
    cursor pointer
    border-radius 3px
    font-size 12px

    &:hover
      background #2a2a2a

    &.selected
      background #2d3a55

    &.dim .name
      color #777
      font-style italic

    .row-btn
      padding 0
      margin 0
      line-height 1
      flex-shrink 0
      min-width 14px
      display flex
      align-items center
      justify-content center

    .row-btn + .row-btn
      margin-left -2px
</style>
