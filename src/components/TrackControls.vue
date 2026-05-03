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
            .detail-title {{ selected.track.pilotName || selected.track.filename }}
          .detail-row
            span.k {{ $t('Glider') }}
            span.v {{ selected.track.gliderType || '<unknown>' }}
          .detail-row
            span.k {{ $t('File') }}
            span.v {{ selected.track.filename || '<unknown>' }}
          .detail-row
            span.k {{ $t('Score') }}
            span.v.score-line
              | {{ distanceKm(selected) }} km
              img.type-icon(v-if='typeIcon(selected)', :src='typeIcon(selected)', :alt='typeLabel(selected)', :title='typeLabel(selected)')
              | {{ pointsStr(selected) }} p.
          .detail-row
            span.k {{ $t('Duration') }}
            span.v {{ durationStr(selected) || '<unknown>' }}
          .detail-row
            span.k {{ $t('Start') }}
            span.v {{ selected.track.t.length ? timeStr(selected.track.t[0]) + ' UTC' : '<unknown>' }}
          .detail-row
            span.k {{ $t('End') }}
            span.v {{ selected.track.t.length ? timeStr(selected.track.t[selected.track.t.length - 1]) + ' UTC' : '<unknown>' }}

        .detail.empty(v-else)
          | {{ $t('No track selected') }}

        .track-list
          .track-row(
            v-for='f in flights',
            :key='f.id',
            :class='{selected: f.id == selectedId, dim: f.hidden}',
            @click='onRowClick(f.id)')
            .swatch(:style='{background: f.color}')
            .name {{ legendFor(f) }}
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
    min-height 188px
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
        min-width 60px

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
