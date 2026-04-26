<script>
const COLORINGS = [
  {key: 'climb',       label: 'Climb',        needsEle: true},
  {key: 'altitude',    label: 'Altitude',     needsEle: true},
  {key: 'tec',         label: 'TEC',          needsEle: true},
  {key: 'speed',       label: 'Ground speed'},
  {key: 'time',        label: 'Time'},
  {key: 'solid_color', label: 'Solid color'},
]


export default {
  props: {
    flights:           {type: Array, required: true},
    showShadow:        Boolean,
    showAltitudeMarks: Boolean,
    showTimeMarks:     Boolean,
    showThermals:      Boolean,
    showGlides:        Boolean,
    showDives:         Boolean,
  },

  emits: [
    'update:showShadow',
    'update:showAltitudeMarks',
    'update:showTimeMarks',
    'update:showThermals',
    'update:showGlides',
    'update:showDives',
    'update:coloring',
    'remove',
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
.track-controls
  section
    h3 Layers
    .options
      label.option
        input(
          type='checkbox',
          :checked='showShadow',
          @change='$emit("update:showShadow", $event.target.checked)')
        | Shadow
      label.option
        input(
          type='checkbox',
          :checked='showAltitudeMarks',
          @change='$emit("update:showAltitudeMarks", $event.target.checked)')
        | Altitude marks
      label.option
        input(
          type='checkbox',
          :checked='showTimeMarks',
          @change='$emit("update:showTimeMarks", $event.target.checked)')
        | Time marks

  section
    h3 Analysis
    .options
      label.option
        input(
          type='checkbox',
          :checked='showThermals',
          @change='$emit("update:showThermals", $event.target.checked)')
        | Thermals
      label.option
        input(
          type='checkbox',
          :checked='showGlides',
          @change='$emit("update:showGlides", $event.target.checked)')
        | Glides
      label.option
        input(
          type='checkbox',
          :checked='showDives',
          @change='$emit("update:showDives", $event.target.checked)')
        | Dives

  section(v-if='flights.length')
    h3 Flights
    .flight(v-for='f in flights', :key='f.id')
      .row
        .swatch(:style='{background: f.color}')
        .name {{ f.track.filename }}
        button(@click='$emit("remove", f.id)') ×
      select(
        :value='f.coloringKey',
        @change='$emit("update:coloring", {id: f.id, key: $event.target.value})')
        option(v-for='c in coloringsFor(f)', :key='c.key', :value='c.key')
          | {{ c.label }}
</template>


<style lang="stylus">
.track-controls
  padding 12px

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
