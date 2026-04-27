<script>
export default {
  emits: ['files'],

  data() {
    return {dragging: false}
  },

  methods: {
    onDragOver(e) {
      e.preventDefault()
      this.dragging = true
    },

    onDragLeave() {this.dragging = false},

    onDrop(e) {
      e.preventDefault()
      this.dragging = false
      const files = [...e.dataTransfer.files].filter(
        f => f.name.toLowerCase().endsWith('.igc'))
      if (files.length) this.$emit('files', files)
    },

    onPick(e) {
      const files = [...e.target.files]
      if (files.length) this.$emit('files', files)
      e.target.value = ''
    },
  },
}
</script>


<template lang="pug">
label.dropzone(
  :class='{dragging}',
  @dragover='onDragOver',
  @dragleave='onDragLeave',
  @drop='onDrop')
  | {{ $t('Drop IGC files or click to choose') }}
  input(type='file', accept='.igc', multiple, @change='onPick')
</template>


<style lang="stylus">
.dropzone
  display flex
  align-items center
  justify-content center
  padding 12px
  border 1px dashed #555
  border-radius 4px
  cursor pointer
  font-size 12px
  text-align center

  &:hover, &.dragging
    background #2a3a4a
    border-color #6a8aaa

  input
    display none
</style>
