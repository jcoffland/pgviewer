<script>
import FileDropzone from './FileDropzone.vue'


const COLORINGS = [
  {key: 'climb',       label: 'Climb',        needsEle: true},
  {key: 'altitude',    label: 'Altitude',     needsEle: true},
  {key: 'tec',         label: 'Energy',       needsEle: true},
  {key: 'speed',       label: 'Ground speed'},
  {key: 'time',        label: 'Time'},
  {key: 'solid_color', label: 'Solid color'},
  {key: 'hidden',      label: 'Hidden'},
]


export default {
  components: {FileDropzone},

  props: {
    flights:           {type: Array, required: true},
    collapsed:         Boolean,
    parseErrors:       {type: Array, default: () => []},
  },

  emits: [
    'update:coloring',
    'update:collapsed',
    'remove',
    'files',
    'share',
    'clear',
  ],

  data() {
    return {colorings: COLORINGS}
  },

  methods: {
    coloringsFor(flight) {
      if (flight.track.elevationData) return this.colorings
      return this.colorings.filter(c => !c.needsEle)
    },
  },
}
</script>


<template lang="pug">
.track-controls(:class='{collapsed}')
  .strip(v-if='collapsed', @click='$emit("update:collapsed", false)')
    button.icon(:title='$t("Expand")') ›
  template(v-else)
    .header
      .title PG Viewer
      button.icon(:title='$t("Collapse")', @click='$emit("update:collapsed", true)') ‹

    .body
      section
        h3 {{ $t('Files') }}
        file-dropzone(@files='$emit("files", $event)')
        button.share-btn(:disabled='!flights.length', @click='$emit("share")')
          | {{ $t('Create shareable link') }}
        .errors(v-if='parseErrors.length')
          .error(v-for='e in parseErrors', :key='e.name')
            | {{ e.name }}: {{ e.msg }}

      section(v-if='flights.length')
        h3 {{ $t('Flights') }}
        .flight(v-for='f in flights', :key='f.id')
          .row
            .swatch(:style='{background: f.color}')
            .name {{ f.track.filename }}
            button(@click='$emit("remove", f.id)') ×
          select(
            :value='f.coloringKey',
            @change='$emit("update:coloring", {id: f.id, key: $event.target.value})')
            option(v-for='c in coloringsFor(f)', :key='c.key', :value='c.key')
              | {{ $t(c.label) }}
        button.clear-btn(@click='$emit("clear")') {{ $t('Clear all') }}
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

  .flight
    display flex
    flex-direction column
    gap 4px
    padding 6px 0
    border-bottom 1px solid #2a2a2a
    font-size 12px

    &:last-child
      border-bottom none

    .row
      display flex
      align-items center
      gap 6px

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

    button
      padding 0 6px
      font-size 14px
      line-height 1

    select
      width 100%
      padding 2px 4px
      background #2a2a2a
      color #eee
      border 1px solid #444
      border-radius 3px
      font-size 12px
</style>
